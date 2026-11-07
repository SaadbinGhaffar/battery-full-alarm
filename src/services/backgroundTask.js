/**
 * Best-effort background safety net.
 *
 * The primary, real-time detection happens in `useBatteryMonitor` while the app
 * is open. This background task is a fallback for when the app is backgrounded:
 * the OS wakes it periodically (Android ~ every 15 min minimum; iOS at the
 * system's discretion), it reads the battery, and posts the notification if the
 * charge target has been reached. It cannot guarantee the *instant* 100% is hit
 * — only a native foreground service can — but it catches the "I left it
 * charging and walked away" case.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BACKGROUND_TASK_NAME, STORAGE_KEY, DEFAULT_SETTINGS } from '../constants';
import {
  presentFullChargeNotification,
  setupNotificationChannel,
} from './notifications';

// Remember the last session we already alerted for, so the background task
// doesn't re-notify every time it wakes while the phone sits at 100%.
const LAST_ALERT_KEY = '@charged/last-bg-alert';

async function readSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Task must be defined at module scope so the OS can find it after a cold start.
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const settings = await readSettings();
    if (!settings.enabled || !settings.notification) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const [level, state] = await Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
    ]);
    const percent = Math.round(level * 100);
    const plugged =
      state === Battery.BatteryState.CHARGING ||
      state === Battery.BatteryState.FULL ||
      state === Battery.BatteryState.NOT_CHARGING;
    const reached =
      state === Battery.BatteryState.FULL || percent >= settings.threshold;

    const lastAlert = await AsyncStorage.getItem(LAST_ALERT_KEY);

    if (plugged && reached && lastAlert !== 'done') {
      await setupNotificationChannel({ sound: settings.sound });
      await presentFullChargeNotification({
        percent,
        threshold: settings.threshold,
        sound: settings.sound,
      });
      await AsyncStorage.setItem(LAST_ALERT_KEY, 'done');
    } else if (!plugged) {
      // Unplugged -> arm again for the next charge session.
      await AsyncStorage.removeItem(LAST_ALERT_KEY);
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Register the background task (safe to call repeatedly). */
export async function registerBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_TASK_NAME
    );
    if (isRegistered) return;
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15, // minutes; OS treats this as a lower bound
    });
  } catch {
    // Background tasks are unavailable on simulators / some devices — ignore.
  }
}

export async function unregisterBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_TASK_NAME
    );
    if (isRegistered) await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_NAME);
  } catch {
    // ignore
  }
}

/** Call when the user dismisses the alarm in-app, to re-arm the background net. */
export async function resetBackgroundAlertFlag() {
  try {
    await AsyncStorage.removeItem(LAST_ALERT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Mark the current charging session as already alerted, so none of the three
 * alert paths (in-app, background task, foreground service) notify twice.
 */
export async function markBackgroundAlerted() {
  try {
    await AsyncStorage.setItem(LAST_ALERT_KEY, 'done');
  } catch {
    // ignore
  }
}
