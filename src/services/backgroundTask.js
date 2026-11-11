/**
 * Best-effort background safety net.
 *
 * Live detection happens in the open app and (on Android) in the foreground
 * service. This periodic task covers everything else: the OS wakes it every so
 * often (Android ~15 min minimum; iOS at the system's discretion), it reads the
 * battery and hands the reading to the shared alert logic. It can't catch the
 * exact moment the target is hit — that's what the foreground service is for.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';

import { BACKGROUND_TASK_NAME } from '../constants';
import { handleBatteryReading } from './chargeAlert';
import { loadSettings } from './settingsStore';

// Task must be defined at module scope so the OS can find it after a cold start.
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const [settings, level, state] = await Promise.all([
      loadSettings(),
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
    ]);
    await handleBatteryReading({ percent: Math.round(level * 100), state, settings });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Register the background task (safe to call repeatedly). */
export async function registerBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
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
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (isRegistered) await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_NAME);
  } catch {
    // ignore
  }
}
