/**
 * React view of the alarm in services/alarm.js. The alarm itself lives outside
 * React so the background monitor can ring it too; this provider just mirrors
 * its state (for the alarm screen) and exposes start/stop to the UI.
 */
import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

import { getAlarmState, startAlarm, stopAlarm, subscribeAlarm } from '../services/alarm';

const AlarmContext = createContext(null);

export function AlarmProvider({ children }) {
  const alarm = useSyncExternalStore(subscribeAlarm, getAlarmState);

  const value = useMemo(
    () => ({
      isAlarming: alarm.ringing,
      alarmPercent: alarm.percent,
      start: startAlarm,
      stop: stopAlarm,
    }),
    [alarm]
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarm must be used within an AlarmProvider');
  return ctx;
}
