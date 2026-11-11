/**
 * The alarm itself, independent of React so the app UI, the foreground-service
 * loop and the background task can all ring (and stop) the same alarm.
 *
 * Android (real builds): the local `ChargedAlarm` native module plays on the
 * ALARM stream with a wake lock, so it follows the alarm volume, rings in silent
 * mode and keeps ringing in the background with the screen off.
 *
 * Elsewhere (iOS, Expo Go, web): falls back to expo-audio + JS vibration, which
 * only rings reliably while the app is open.
 */
import { AppState, Platform, Vibration } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { VIBRATION_PATTERN } from '../constants';

const NativeAlarm = Platform.OS === 'android' ? requireOptionalNativeModule('ChargedAlarm') : null;
const ALARM_SOURCE = require('../../assets/alarm.wav');

/** True when the native alarm (rings in the background) is available. */
export const hasNativeAlarm = !!NativeAlarm;

function nativeRinging() {
  try {
    return !!NativeAlarm && NativeAlarm.isRinging();
  } catch {
    return false;
  }
}

// The native alarm can outlive a JS runtime (e.g. started by the background
// task), so pick up an alarm that is already ringing.
let state = { ringing: nativeRinging(), percent: null };
const listeners = new Set();
let fallbackPlayer = null;

function setState(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

function getFallbackPlayer() {
  if (!fallbackPlayer) {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
    fallbackPlayer = createAudioPlayer(ALARM_SOURCE);
  }
  return fallbackPlayer;
}

/**
 * Start ringing. `percent` is shown on the in-app alarm screen.
 *
 * On Android the native alarm also shows the notification (`title`/`body`)
 * whose STOP ALARM button works with the screen off; it's shown whenever the
 * alarm rings, or when `notify` is set. Elsewhere the caller posts its own
 * notification.
 */
export function startAlarm({
  sound = true,
  vibration = true,
  percent = null,
  notify = false,
  title = 'Charged',
  body = '',
} = {}) {
  if (NativeAlarm) {
    try {
      NativeAlarm.start(sound, vibration, notify, title, body);
    } catch {
      // fall through: the notification still alerts the user
    }
  } else {
    if (sound) {
      try {
        const player = getFallbackPlayer();
        player.loop = true;
        player.volume = 1;
        player.seekTo(0);
        player.play();
      } catch {
        // ignore playback errors
      }
    }
    if (vibration) Vibration.vibrate(VIBRATION_PATTERN, true);
  }
  setState({ ringing: true, percent });
}

/** Silence the alarm (safe to call when it isn't ringing). */
export function stopAlarm() {
  if (NativeAlarm) {
    try {
      NativeAlarm.stop();
    } catch {
      // ignore
    }
  } else {
    try {
      fallbackPlayer?.pause();
    } catch {
      // ignore
    }
    Vibration.cancel();
  }
  if (state.ringing) setState({ ringing: false });
}

export function getAlarmState() {
  return state;
}

/** Is anything ringing right now — this runtime's alarm or the native one? */
export function isAlarmRinging() {
  return state.ringing || nativeRinging();
}

/** Subscribe to ring state changes; returns an unsubscribe function. */
export function subscribeAlarm(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Stopped from the notification's STOP button, swipe-away or the safety timeout.
try {
  NativeAlarm?.addListener('onStop', () => {
    if (state.ringing) setState({ ringing: false });
  });
} catch {
  // events unavailable — the AppState resync below still covers it
}

// Resync with the native alarm when the app comes back: it stops itself after
// a safety timeout, and it may have been started from another JS runtime.
AppState.addEventListener('change', (next) => {
  if (next !== 'active' || !NativeAlarm) return;
  const ringing = nativeRinging();
  if (ringing !== state.ringing) setState({ ringing });
});
