/**
 * The single place that decides when to ring.
 *
 * Three readers feed battery readings in — the open app (live listener), the
 * Android foreground service (polls + listener) and the periodic background
 * task — and all of them call `handleBatteryReading`. The alert fires once per
 * charging session no matter which reader sees the target first:
 *
 *  - an in-memory flag dedupes readers in the same JS runtime instantly;
 *  - a stored flag dedupes across app restarts / headless runs.
 *
 * The session re-arms when the charger is unplugged (which also stops a ringing
 * alarm) or the level drops clearly below the target.
 */
import * as Battery from 'expo-battery';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasNativeAlarm, startAlarm, stopAlarm, isAlarmRinging } from './alarm';
import {
  STOP_ALARM_ACTION,
  chargeMessage,
  dismissChargeNotification,
  presentFullChargeNotification,
  setupNotificationChannel,
} from './notifications';

const ALERTED_KEY = '@charged/last-bg-alert';
// Hysteresis so a battery hovering at the threshold doesn't re-trigger.
const REARM_MARGIN = 3;

let alerted = false; // this session already alerted (this JS runtime)
let storageCleared = false; // stored flag known to be clear — skip redundant writes

export function isPlugged(state) {
  return (
    state === Battery.BatteryState.CHARGING ||
    state === Battery.BatteryState.FULL ||
    state === Battery.BatteryState.NOT_CHARGING
  );
}

export function isTargetReached(percent, state, threshold) {
  return state === Battery.BatteryState.FULL || percent >= threshold;
}

/** Ring + notify, once per charging session. Resolves true if it fired. */
async function fireChargeAlert({ percent, settings }) {
  if (alerted) return false;
  alerted = true; // set synchronously: concurrent readers bail out above
  storageCleared = false;

  try {
    if ((await AsyncStorage.getItem(ALERTED_KEY)) === 'done') return false;
    await AsyncStorage.setItem(ALERTED_KEY, 'done');
  } catch {
    // storage unavailable — the in-memory flag still prevents repeats
  }

  const message = chargeMessage({ percent, threshold: settings.threshold });
  startAlarm({
    sound: settings.sound,
    vibration: settings.vibration,
    percent,
    notify: settings.notification,
    ...message,
  });

  // On Android the native alarm posts its own notification (with a STOP button
  // that works on the lock screen); elsewhere post one through expo-notifications.
  if (settings.notification && !hasNativeAlarm) {
    await setupNotificationChannel({ sound: settings.sound });
    await presentFullChargeNotification({
      percent,
      threshold: settings.threshold,
      sound: settings.sound,
    });
  }
  return true;
}

function rearm() {
  alerted = false;
  if (storageCleared) return;
  storageCleared = true;
  AsyncStorage.removeItem(ALERTED_KEY).catch(() => {});
}

/** Silence the alarm and clear its notification. The session stays alerted. */
export function dismissChargeAlarm() {
  stopAlarm();
  dismissChargeNotification();
}

/** Re-arm immediately, e.g. after the user picks a new target. */
export function resetChargeSession() {
  alerted = false;
  storageCleared = false;
  rearm();
}

/**
 * Feed one battery reading in. `settings` are the current user settings.
 * Safe to call as often as readings arrive.
 */
export async function handleBatteryReading({ percent, state, settings }) {
  if (percent == null) return false;

  if (!isPlugged(state)) {
    // Unplugging is the natural "I got it" — stop ringing and re-arm.
    if (isAlarmRinging()) dismissChargeAlarm();
    rearm();
    return false;
  }

  if (settings.enabled && isTargetReached(percent, state, settings.threshold)) {
    return fireChargeAlert({ percent, settings });
  }

  if (percent < settings.threshold - REARM_MARGIN) rearm();
  return false;
}

// "STOP ALARM" on the notification. Delivered while the app runs in the
// background too (the foreground service keeps the JS runtime alive).
try {
  Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier === STOP_ALARM_ACTION) dismissChargeAlarm();
  });
} catch {
  // notifications unavailable (e.g. web)
}
