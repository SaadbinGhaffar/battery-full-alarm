/**
 * Thin wrapper around expo-notifications: permissions, the Android channel,
 * the "STOP ALARM" action, and a helper to post the "battery full" notification.
 *
 * Sound: on Android real builds the native alarm (services/alarm.js) does the
 * ringing, so the notification uses a *silent* channel instead of playing a
 * second, overlapping tone. Where there is no native alarm (iOS, Expo Go) the
 * notification carries the sound itself.
 *
 * Expo Go note: custom notification sounds (alarm.wav) are bundled as native
 * resources by the expo-notifications config plugin, which only applies in a
 * development/production build. In Expo Go that resource doesn't exist, and
 * handing its name to the native channel/notification crashes with a
 * NullPointerException. So in Expo Go we fall back to the default system sound.
 */
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import {
  NOTIFICATION_CHANNEL_ID,
  SILENT_CHANNEL_ID,
  ALARM_SOUND_FILE,
  VIBRATION_PATTERN,
} from '../constants';
import { hasNativeAlarm } from './alarm';

export const ALARM_CATEGORY_ID = 'charge-alarm';
export const STOP_ALARM_ACTION = 'stop-alarm';
const CHARGE_NOTIFICATION_ID = 'charge-alert';

// True when running inside the Expo Go sandbox (no custom native resources).
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** The native alarm rings, so the notification itself should stay quiet. */
const useSilentChannel = Platform.OS === 'android' && hasNativeAlarm;

/** Resolve a usable sound value: custom file in a real build, else default. */
function resolveSound(wantSound) {
  if (!wantSound || useSilentChannel) return null; // caller omits the key entirely
  return isExpoGo ? 'default' : ALARM_SOUND_FILE;
}

// Show the notification even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: !useSilentChannel,
    shouldSetBadge: false,
  }),
});

/** Ask for notification permission; returns true if granted. */
export async function ensureNotificationPermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const request = await Notifications.requestPermissionsAsync();
    return request.granted;
  } catch {
    return false;
  }
}

/** Register the "STOP ALARM" button shown on the charge notification. */
async function setupAlarmCategory() {
  try {
    await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
      {
        identifier: STOP_ALARM_ACTION,
        buttonTitle: 'STOP ALARM',
        options: { opensAppToForeground: false },
      },
    ]);
  } catch {
    // the notification still works without the button
  }
}

async function setupSilentChannel() {
  try {
    await Notifications.setNotificationChannelAsync(SILENT_CHANNEL_ID, {
      name: 'Charge alerts',
      description: 'Shown while the charge alarm rings',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      enableVibrate: false,
      lightColor: '#FF5A00',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    return SILENT_CHANNEL_ID;
  } catch {
    return null;
  }
}

async function setupSoundChannel({ sound }) {
  // Build options without any undefined values (passing them crashes the
  // native module). Only attach `sound` when we actually have one.
  const channel = {
    name: 'Battery full alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: VIBRATION_PATTERN,
    enableVibrate: true,
    lightColor: '#FF5A00',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  };
  const resolved = resolveSound(sound);
  if (resolved) channel.sound = resolved;

  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, channel);
  } catch {
    // Last-resort fallback: a minimal channel with the default sound so alerts
    // still work even if the custom configuration is rejected.
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Battery full alerts',
        importance: Notifications.AndroidImportance.HIGH,
      });
    } catch {
      // give up silently; the alarm still rings
    }
  }
  return NOTIFICATION_CHANNEL_ID;
}

let channelId = NOTIFICATION_CHANNEL_ID;

/** Create the Android channel + the STOP action. Never throws. */
export async function setupNotificationChannel({ sound = true } = {}) {
  await setupAlarmCategory();
  if (Platform.OS !== 'android') return;
  channelId = (useSilentChannel && (await setupSilentChannel())) || (await setupSoundChannel({ sound }));
}

/** Title + body for the "target reached" alert. */
export function chargeMessage({ percent = 100, threshold = 100 } = {}) {
  return threshold >= 100
    ? { title: '🔋 Fully charged!', body: 'Your phone is at 100%. Unplug it to protect the battery.' }
    : {
        title: `🔋 ${threshold}% reached`,
        body: `Battery is at ${percent}%. Unplug now for better battery health.`,
      };
}

/**
 * Post the "charged" notification immediately. Never throws.
 * `sound` toggles the alarm tone attached to the notification (non-native path).
 */
export async function presentFullChargeNotification({
  percent = 100,
  threshold = 100,
  sound = true,
} = {}) {
  const { title, body } = chargeMessage({ percent, threshold });
  const content = {
    title,
    body,
    categoryIdentifier: ALARM_CATEGORY_ID,
    priority: Notifications.AndroidNotificationPriority.MAX,
  };
  const resolved = resolveSound(sound);
  if (resolved) content.sound = resolved;

  // On Android the channel is selected via a channel-aware trigger (delivers
  // immediately); on iOS an immediate notification uses a null trigger.
  const trigger = Platform.OS === 'android' ? { channelId } : null;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: CHARGE_NOTIFICATION_ID,
      content,
      trigger,
    });
  } catch {
    // ignore; the alarm still rings
  }
}

/** Remove the "charged" notification (alarm stopped or charger unplugged). */
export async function dismissChargeNotification() {
  try {
    await Notifications.dismissNotificationAsync(CHARGE_NOTIFICATION_ID);
  } catch {
    // no-op: not critical
  }
}
