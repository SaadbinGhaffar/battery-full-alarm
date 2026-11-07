/**
 * Guarded access to react-native-google-mobile-ads.
 *
 * The SDK is a native module: it isn't present in Expo Go (or on web), and a
 * plain import would crash the whole app there. Loading it lazily lets the app
 * run everywhere — ads just don't appear where the SDK is unavailable.
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { PRODUCTION_AD_UNITS } from './adConfig';

function loadSdk() {
  if (Platform.OS === 'web') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null; // Expo Go
  try {
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

/** The SDK module, or null when unavailable. */
export const GoogleAds = loadSdk();

/** Ad unit for a format ("banner" | "native"), or null if ads are off for it. */
export function getAdUnitId(format) {
  if (!GoogleAds) return null;
  if (__DEV__) {
    return format === 'banner' ? GoogleAds.TestIds.ADAPTIVE_BANNER : GoogleAds.TestIds.NATIVE;
  }
  return PRODUCTION_AD_UNITS[Platform.OS]?.[format] ?? null;
}

/** True when this build has at least one ad unit to serve. */
export const ADS_ENABLED = !!(getAdUnitId('banner') || getAdUnitId('native'));
