/** App-wide constants: storage keys, task + channel identifiers, defaults. */

export const STORAGE_KEY = '@charged/settings/v2';

export const BACKGROUND_TASK_NAME = 'charged-battery-full-check';

export const NOTIFICATION_CHANNEL_ID = 'battery-full';

/** Silent channel used while the native alarm does the ringing (Android). */
export const SILENT_CHANNEL_ID = 'charge-alert';

/** Bump when a stored-settings migration is needed (see settingsStore). */
export const SETTINGS_SCHEMA = 2;

/** Bundled alarm file name (declared in app.json -> expo-notifications sounds). */
export const ALARM_SOUND_FILE = 'alarm.wav';

/** Selectable charge targets. 100% = full; 80/90% help preserve battery health. */
export const THRESHOLD_OPTIONS = [80, 90, 100];

/** Default user settings, merged with whatever is persisted. */
export const DEFAULT_SETTINGS = {
  enabled: true, // master switch for monitoring
  threshold: 100, // notify when charge reaches this %
  sound: true, // play the looping alarm tone
  vibration: true, // vibrate while the alarm is active
  notification: true, // post a system notification
  keepAwake: false, // keep the screen on while charging (in-app)
  exactBackground: true, // Android: foreground-service monitor, rings with the app closed
  schema: SETTINGS_SCHEMA,
};

/** Foreground-service (exact background) polling interval, milliseconds. */
export const FG_POLL_MS = 15000;

/**
 * Foreground service type(s) requested at runtime. MUST match the
 * android:foregroundServiceType declared by the config plugin.
 */
export const FG_SERVICE_TYPES = ['specialUse'];

/** Vibration pattern (ms) used while the alarm is ringing: wait, buzz, pause... */
export const VIBRATION_PATTERN = [0, 600, 400, 600, 900];
