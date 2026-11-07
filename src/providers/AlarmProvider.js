/**
 * Owns the looping alarm audio player (expo-audio) and the vibration loop.
 * Exposes `start()`, `stop()` and `isAlarming` through context so both the
 * battery monitor and the UI can drive / observe the alarm.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Vibration } from 'react-native';
import {
  useAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';

import { VIBRATION_PATTERN } from '../constants';

// Static require so the bundler packages the asset.
const ALARM_SOURCE = require('../../assets/alarm.wav');

const AlarmContext = createContext(null);

export function AlarmProvider({ children }) {
  const player = useAudioPlayer(ALARM_SOURCE);
  const [isAlarming, setIsAlarming] = useState(false);
  const vibratingRef = useRef(false);

  // Allow the alarm to sound even in silent mode / when backgrounded.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    try {
      player.pause();
      player.seekTo(0);
    } catch {
      // player may not be ready; ignore
    }
    if (vibratingRef.current) {
      Vibration.cancel();
      vibratingRef.current = false;
    }
    setIsAlarming(false);
  }, [player]);

  const start = useCallback(
    ({ sound = true, vibration = true } = {}) => {
      try {
        if (sound) {
          player.loop = true;
          player.volume = 1;
          player.seekTo(0);
          player.play();
        }
      } catch {
        // ignore playback errors; vibration/notification still fire
      }
      if (vibration) {
        Vibration.vibrate(VIBRATION_PATTERN, true); // repeat until cancelled
        vibratingRef.current = true;
      }
      setIsAlarming(true);
    },
    [player]
  );

  // Clean up on unmount.
  useEffect(() => stop, [stop]);

  const value = useMemo(
    () => ({ isAlarming, start, stop }),
    [isAlarming, start, stop]
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarm must be used within an AlarmProvider');
  return ctx;
}
