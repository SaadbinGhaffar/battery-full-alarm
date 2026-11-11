/**
 * Real-time battery readings for the UI.
 *
 * Subscribes to expo-battery level + state changes and reports every reading
 * through `onReading({ percent, state })`, where the alert logic
 * (services/chargeAlert) decides whether to ring. Re-reads when the app returns
 * to the foreground, since listeners can miss changes while suspended.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Battery from 'expo-battery';

import { isPlugged } from '../services/chargeAlert';

/**
 * Subscribe without letting an unsupported event source crash the app (e.g. the
 * web build has no native emitter). The monitor still works from the initial
 * read and the foreground re-check if a listener is unavailable.
 */
function safeSubscribe(subscribe, listener) {
  try {
    return subscribe(listener);
  } catch {
    return null;
  }
}

export function useBatteryMonitor({ onReading }) {
  const [level, setLevel] = useState(null); // 0..1
  const [batteryState, setBatteryState] = useState(Battery.BatteryState.UNKNOWN);
  const [lowPowerMode, setLowPowerMode] = useState(false);

  // Latest raw readings, so a listener for one value can report against the
  // most recent value of the other without resubscribing.
  const levelRef = useRef(null);
  const stateRef = useRef(Battery.BatteryState.UNKNOWN);
  // Keep the latest callback without re-subscribing listeners on every render.
  const onReadingRef = useRef(onReading);

  useEffect(() => {
    onReadingRef.current = onReading;
  }, [onReading]);

  const applyReading = useCallback(({ lvl, state }) => {
    if (lvl != null) {
      levelRef.current = lvl;
      setLevel(lvl);
    }
    if (state != null) {
      stateRef.current = state;
      setBatteryState(state);
    }
    if (levelRef.current != null) {
      onReadingRef.current?.({
        percent: Math.round(levelRef.current * 100),
        state: stateRef.current,
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [lvl, state] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
      ]);
      applyReading({ lvl, state });
    } catch {
      // battery API unavailable (e.g. web) — leave defaults
    }
  }, [applyReading]);

  useEffect(() => {
    // Initial read (async — state is set after the native call resolves).
    Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
      Battery.isLowPowerModeEnabledAsync(),
    ])
      .then(([lvl, state, lpm]) => {
        setLowPowerMode(lpm);
        applyReading({ lvl, state });
      })
      .catch(() => {});

    const levelSub = safeSubscribe(Battery.addBatteryLevelListener, ({ batteryLevel }) =>
      applyReading({ lvl: batteryLevel })
    );
    const stateSub = safeSubscribe(Battery.addBatteryStateListener, ({ batteryState: s }) =>
      applyReading({ state: s })
    );
    const lpmSub = safeSubscribe(Battery.addLowPowerModeListener, ({ lowPowerMode: lpm }) =>
      setLowPowerMode(lpm)
    );
    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });

    return () => {
      levelSub?.remove();
      stateSub?.remove();
      lpmSub?.remove();
      appSub?.remove();
    };
  }, [applyReading, refresh]);

  const percent = level == null ? null : Math.round(level * 100);

  return {
    level,
    percent,
    batteryState,
    pluggedIn: isPlugged(batteryState),
    charging: batteryState === Battery.BatteryState.CHARGING,
    full: batteryState === Battery.BatteryState.FULL,
    notCharging: batteryState === Battery.BatteryState.NOT_CHARGING,
    lowPowerMode,
    /** Re-read the battery now (e.g. after settings change). */
    refresh,
  };
}
