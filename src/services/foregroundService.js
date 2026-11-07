/**
 * Android foreground-service monitor for EXACT background timing.
 *
 * react-native-background-actions keeps a persistent Android foreground service
 * alive (with its own ongoing notification) and runs this JS loop even when the
 * app is backgrounded or closed. The loop polls the battery every FG_POLL_MS and
 * fires the full-charge alert the instant the target is reached — no 15-minute
 * OS window like the background-fetch fallback.
 *
 * Coordination:
 *  - While the app is in the foreground, the in-app monitor owns the alarm, so the
 *    loop only refreshes its ongoing notification and skips the alert.
 *  - It shares the "already alerted this session" flag with the background-fetch
 *    task so the two never double-notify.
 *
 * Android-only. iOS has no equivalent long-running background path and keeps the
 * best-effort expo-background-task net instead.
 */
import { AppState, Platform } from 'react-native';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  STORAGE_KEY,
  DEFAULT_SETTINGS,
  FG_POLL_MS,
  FG_SERVICE_TYPES,
} from '../constants';
import {
  presentFullChargeNotification,
  setupNotificationChannel,
} from './notifications';
import {
  markBackgroundAlerted,
  resetBackgroundAlertFlag,
} from './backgroundTask';

// Lazy, guarded require: the native module is absent in Expo Go / on web, and we
// never want importing this file to crash those environments.
let BackgroundService = null;
try {
  BackgroundService = require('react-native-background-actions').default;
} catch {
  BackgroundService = null;
}

const REARM_MARGIN = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Is the exact-background path usable on this platform/runtime? */
export function isForegroundMonitorAvailable() {
  return Platform.OS === 'android' && !!BackgroundService;
}

export function isForegroundMonitorRunning() {
  try {
    return isForegroundMonitorAvailable() && BackgroundService.isRunning();
  } catch {
    return false;
  }
}

async function readSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function isPlugged(state) {
  return (
    state === Battery.BatteryState.CHARGING ||
    state === Battery.BatteryState.FULL ||
    state === Battery.BatteryState.NOT_CHARGING
  );
}

// The long-running task. Exits (resolves) when monitoring is turned off or the
// service is stopped, which lets the OS release the service.
const monitorTask = async () => {
  let alerted = false;

  while (BackgroundService && BackgroundService.isRunning()) {
    try {
      const settings = await readSettings();
      if (!settings.enabled || !settings.exactBackground) break;

      const [level, state] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
      ]);
      const percent = Math.round(level * 100);
      const plugged = isPlugged(state);
      const reached =
        state === Battery.BatteryState.FULL || percent >= settings.threshold;

      // Keep the persistent service notification informative and live.
      const title = !plugged
        ? 'On battery'
        : reached
        ? 'Fully charged'
        : 'Charging';
      const desc = plugged
        ? `Battery ${percent}% • target ${settings.threshold}%`
        : `Battery ${percent}% • plug in to monitor`;
      BackgroundService.updateNotification({ taskTitle: title, taskDesc: desc }).catch(
        () => {}
      );

      if (plugged && reached && !alerted) {
        alerted = true;
        // When the app is open, the in-app alarm handles it — avoid a duplicate.
        if (AppState.currentState !== 'active') {
          await setupNotificationChannel({ sound: settings.sound });
          await presentFullChargeNotification({
            percent,
            threshold: settings.threshold,
            sound: settings.sound,
          });
        }
        await markBackgroundAlerted();
      }

      // Re-arm for the next session once unplugged / dropped below target.
      if (!plugged || percent < settings.threshold - REARM_MARGIN) {
        if (alerted) {
          alerted = false;
          await resetBackgroundAlertFlag();
        }
      }
    } catch {
      // transient read error — keep looping
    }

    await sleep(FG_POLL_MS);
  }
};

/** Start the persistent monitor (safe to call repeatedly). Returns success. */
export async function startForegroundMonitor() {
  if (!isForegroundMonitorAvailable()) return false;
  try {
    if (BackgroundService.isRunning()) return true;
    await setupNotificationChannel();
    await BackgroundService.start(monitorTask, {
      taskName: 'ChargedMonitor',
      taskTitle: 'Charged is watching your battery',
      taskDesc: 'Monitoring charge level…',
      taskIcon: { name: 'ic_launcher', type: 'mipmap' },
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
    if (BackgroundService.isRunning()) await BackgroundService.stop();
  } catch {
    // ignore
  }
}
