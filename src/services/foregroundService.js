/**
 * Android foreground-service monitor: rings the alarm the instant the charge
 * target is reached, even with the app in the background or closed.
 *
 * react-native-background-actions keeps a foreground service alive (with its
 * own ongoing notification), which keeps this JS loop — and the native alarm —
 * running in the background. The loop reacts to battery level broadcasts and
 * also polls every FG_POLL_MS as a backstop, handing every reading to the shared
 * alert logic (services/chargeAlert), which dedupes against the open app.
 *
 * Android-only. iOS has no equivalent long-running background path and keeps the
 * best-effort expo-background-task net instead.
 */
import { Platform } from 'react-native';
import * as Battery from 'expo-battery';

import { FG_POLL_MS, FG_SERVICE_TYPES } from '../constants';
import { handleBatteryReading, isPlugged, isTargetReached } from './chargeAlert';
import { setupNotificationChannel } from './notifications';
import { loadSettings } from './settingsStore';

// Lazy, guarded require: the native module is absent in Expo Go / on web, and we
// never want importing this file to crash those environments.
let BackgroundService = null;
try {
  BackgroundService = require('react-native-background-actions').default;
} catch {
  BackgroundService = null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Is the background monitor usable on this platform/runtime? */
export function isForegroundMonitorAvailable() {
  return Platform.OS === 'android' && !!BackgroundService;
}

function serviceRunning() {
  try {
    return !!BackgroundService && BackgroundService.isRunning();
  } catch {
    return false;
  }
}

/** Keep the persistent service notification informative and live. */
function describe(percent, state, threshold) {
  if (!isPlugged(state)) {
    return { taskTitle: 'Charge alarm armed', taskDesc: `Battery ${percent}% • plug in to monitor` };
  }
  if (isTargetReached(percent, state, threshold)) {
    return { taskTitle: 'Target reached — unplug now', taskDesc: `Battery ${percent}% • target ${threshold}%` };
  }
  return { taskTitle: 'Charged is watching your battery', taskDesc: `Battery ${percent}% • alarm at ${threshold}%` };
}

// The long-running task. Exits (resolves) when monitoring is turned off or the
// service is stopped, which lets the OS release the service.
const monitorTask = async () => {
  let settings = await loadSettings();
  let lastDesc = '';

  const check = async (level, state) => {
    const percent = Math.round(level * 100);
    const desc = describe(percent, state, settings.threshold);
    if (desc.taskTitle + desc.taskDesc !== lastDesc) {
      lastDesc = desc.taskTitle + desc.taskDesc;
      BackgroundService.updateNotification(desc).catch(() => {});
    }
    await handleBatteryReading({ percent, state, settings });
  };

  // Battery broadcasts wake us the moment the level or plug state changes
  // (unplugging stops a ringing alarm right away).
  const recheck = () => {
    Promise.all([Battery.getBatteryLevelAsync(), Battery.getBatteryStateAsync()])
      .then(([level, state]) => check(level, state))
      .catch(() => {});
  };
  const subs = [];
  try {
    subs.push(Battery.addBatteryLevelListener(recheck));
    subs.push(Battery.addBatteryStateListener(recheck));
  } catch {
    // no emitter — the poll below still covers it
  }

  try {
    while (serviceRunning()) {
      try {
        settings = await loadSettings();
        if (!settings.enabled || !settings.exactBackground) break;
        const [level, state] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
        ]);
        await check(level, state);
      } catch {
        // transient read error — keep looping
      }
      await sleep(FG_POLL_MS);
    }
  } finally {
    subs.forEach((sub) => sub?.remove());
  }
};

/** Start the persistent monitor (safe to call repeatedly). Returns success. */
export async function startForegroundMonitor() {
  if (!isForegroundMonitorAvailable()) return false;
  try {
    if (serviceRunning()) return true;
    await setupNotificationChannel();
    await BackgroundService.start(monitorTask, {
      taskName: 'ChargedMonitor',
      taskTitle: 'Charged is watching your battery',
      taskDesc: 'Monitoring charge level…',
      taskIcon: { name: 'notification_icon', type: 'drawable' },
      color: '#FF5A00',
      linkingURI: 'charged://',
      foregroundServiceType: FG_SERVICE_TYPES,
    });
    return true;
  } catch {
    return false;
  }
}

/** Stop the persistent monitor. */
export async function stopForegroundMonitor() {
  if (!isForegroundMonitorAvailable()) return;
  try {
    if (serviceRunning()) await BackgroundService.stop();
  } catch {
    // ignore
  }
}
