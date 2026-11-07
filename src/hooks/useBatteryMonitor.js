/**
 * Real-time battery monitor.
 *
 * Subscribes to expo-battery level + state changes and fires `onReachTarget`
 * exactly once per charging session when the phone is plugged in AND the charge
 * has reached the configured threshold (or the OS reports a FULL state).
 *
 * The trigger re-arms automatically when the charger is unplugged or the level
 * drops meaningfully below the threshold.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Battery from 'expo-battery';

// Hysteresis so a battery hovering at the threshold doesn't re-trigger.
const REARM_MARGIN = 3;

function isPlugged(state) {
  return (
    state === Battery.BatteryState.CHARGING ||
    state === Battery.BatteryState.FULL ||
    state === Battery.BatteryState.NOT_CHARGING
  );
}

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

export function useBatteryMonitor({ threshold, enabled, onReachTarget }) {
  const [level, setLevel] = useState(null); // 0..1
  const [batteryState, setBatteryState] = useState(
    Battery.BatteryState.UNKNOWN
  );
  const [lowPowerMode, setLowPowerMode] = useState(false);

  const triggeredRef = useRef(false);
  // Latest raw readings, so a listener for one value can evaluate against the
  // most recent value of the other without resubscribing or abusing setState.
  const levelRef = useRef(null);
  const stateRef = useRef(Battery.BatteryState.UNKNOWN);
  // Keep the latest callback without re-subscribing listeners on every render.
  const onReachRef = useRef(onReachTarget);
  const configRef = useRef({ threshold, enabled });

  useEffect(() => {
    onReachRef.current = onReachTarget;
    configRef.current = { threshold, enabled };
  }, [onReachTarget, threshold, enabled]);

  const evaluate = useCallback((lvl, state) => {
    if (lvl == null) return;
    const { threshold: th, enabled: on } = configRef.current;
    const percent = Math.round(lvl * 100);
    const plugged = isPlugged(state);
    const reached = state === Battery.BatteryState.FULL || percent >= th;

    if (on && plugged && reached && !triggeredRef.current) {
      triggeredRef.current = true;
      onReachRef.current?.({ percent, state });
    }

    // Re-arm when unplugged or the charge has dropped clearly below target.
    if (!plugged || percent < th - REARM_MARGIN) {
      triggeredRef.current = false;
    }
  }, []);

  // Commit a new level/state reading to both React state and the refs, then
  // evaluate the trigger against the latest of each.
  const applyReading = useCallback(
    ({ lvl, state }) => {
      if (lvl != null) {
        levelRef.current = lvl;
        setLevel(lvl);
      }
      if (state != null) {
        stateRef.current = state;
        setBatteryState(state);
      }
      evaluate(levelRef.current, stateRef.current);
    },
    [evaluate]
  );

  // Initial read + subscriptions.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [lvl, state, lpm] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
          Battery.isLowPowerModeEnabledAsync(),
        ]);
        if (!mounted) return;
        setLowPowerMode(lpm);
        applyReading({ lvl, state });
      } catch {
        // battery API unavailable (e.g. web) — leave defaults
      }
    })();

    const levelSub = safeSubscribe(Battery.addBatteryLevelListener, ({ batteryLevel }) =>
      applyReading({ lvl: batteryLevel })
    );

    const stateSub = safeSubscribe(Battery.addBatteryStateListener, ({ batteryState: s }) =>
      applyReading({ state: s })
    );

    const lpmSub = safeSubscribe(Battery.addLowPowerModeListener, ({ lowPowerMode: lpm }) =>
      setLowPowerMode(lpm)
    );

    // Re-check when the app returns to the foreground (listeners can miss
    // changes that happened while suspended).
    const appSub = AppState.addEventListener('change', async (next) => {
      if (next !== 'active') return;
      try {
        const [lvl, state] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
        ]);
        applyReading({ lvl, state });
      } catch {
        // ignore
      }
    });

    return () => {
      mounted = false;
      levelSub?.remove();
      stateSub?.remove();
      lpmSub?.remove();
      appSub?.remove();
    };
  }, [applyReading]);

  /** Manually re-arm the trigger (after the user dismisses the alarm). */
  const rearm = useCallback(() => {
    triggeredRef.current = false;
  }, []);

  const percent = level == null ? null : Math.round(level * 100);
  const pluggedIn = isPlugged(batteryState);
  const charging = batteryState === Battery.BatteryState.CHARGING;
  const full = batteryState === Battery.BatteryState.FULL;
  const notCharging = batteryState === Battery.BatteryState.NOT_CHARGING;

  return {
    level,
    percent,
    batteryState,
    pluggedIn,
    charging,
    full,
    notCharging,
    lowPowerMode,
    rearm,
  };
}
