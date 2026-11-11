/**
 * Read/write persisted settings outside React (background task, foreground
 * service) and apply one-time migrations.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY, DEFAULT_SETTINGS, SETTINGS_SCHEMA } from '../constants';

/**
 * Schema 2: the background alarm (exactBackground) became the default, because
 * without it the alarm can't ring while the app is closed. Turn it on once for
 * existing installs; the user can still switch it off afterwards.
 */
function migrate(stored) {
  if (stored.schema === SETTINGS_SCHEMA) return { settings: stored, changed: false };
  return {
    settings: { ...stored, exactBackground: true, schema: SETTINGS_SCHEMA },
    changed: true,
  };
}

export function saveSettings(settings) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
}

/** Stored settings merged over defaults. Never throws. */
export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = JSON.parse(raw);
    // Keep the stored schema (not the default's) so old data gets migrated.
    const { settings, changed } = migrate({ ...DEFAULT_SETTINGS, ...stored, schema: stored.schema });
    if (changed) await saveSettings(settings);
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
