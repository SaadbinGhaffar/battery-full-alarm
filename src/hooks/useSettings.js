/**
 * Persisted user settings via AsyncStorage, exposed through React context so any
 * component can read/update them without prop drilling.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { DEFAULT_SETTINGS } from '../constants';
import { loadSettings, saveSettings } from '../services/settingsStore';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted settings once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadSettings();
      if (active) {
        setSettings(stored);
        setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, update, hydrated }),
    [settings, update, hydrated]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
