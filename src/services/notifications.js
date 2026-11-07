/**
 * Thin wrapper around expo-notifications: permissions, the Android channel,
 * and a single helper to post the "battery full" notification.
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
  ALARM_SOUND_FILE,
  VIBRATION_PATTERN,
} from '../constants';

// True when running inside the Expo Go sandbox (no custom native resources).
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Resolve a usable sound value: custom file in a real build, else default. */
function resolveSound(wantSound) {
  if (!wantSound) return null; // caller should omit the key entirely
  return isExpoGo ? 'default' : ALARM_SOUND_FILE;
}

// Show the notification even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
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

/** Create the high-importance Android channel. Never throws. */
export async function setupNotificationChannel({ sound = true } = {}) {
  if (Platform.OS !== 'android') return;

  // Build options without any undefined/null values (passing them crashes the
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
      // give up silently; the in-app alarm still fires
    }
  }
}

/**
 * Post the "charged" notification immediately. Never throws.
 * `sound` toggles the alarm tone attached to the notification.
 */
export async function presentFullChargeNotification({
  percent = 100,
  threshold = 100,
  sound = true,
} = {}) {
  const title =
    threshold >= 100 ? '🔋 Fully charged!' : `🔋 ${threshold}% reached`;
  const body =
    threshold >= 100
      ? 'Your phone is at 100%. Unplug it to protect the battery.'
      : `Battery is at ${percent}%. Time to unplug for better battery health.`;

  const content = {
    title,
    body,
    priority: Notifications.AndroidNotificationPriority.MAX,
  };
  const resolved = resolveSound(sound);
  if (resolved) content.sound = resolved;

  // On Android the channel is selected via a channel-aware trigger (delivers
  // immediately); on iOS an immediate notification uses a null trigger.
  const trigger =
    Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : null;

  try {
    await Notifications.scheduleNotificationAsync({ content, trigger });
  } catch {
    // ignore; in-app alarm still shows
  }
}

/** Remove any delivered "charged" notifications (called on dismiss). */
export async function clearDeliveredNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // no-op: not critical
  }
}
