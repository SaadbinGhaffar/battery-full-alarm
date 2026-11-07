/**
 * AdMob configuration.
 *
 * The AdMob *App IDs* live in app.json (react-native-google-mobile-ads plugin),
 * because they are baked into the native manifest / Info.plist at build time.
 * This file holds the *ad unit* IDs used at runtime.
 *
 * Debug builds (__DEV__) always use Google's test units — never your real ones.
 * Viewing or clicking your own live ads is "invalid traffic" and can get the
 * AdMob account suspended. Release builds use the production units below.
 */

export const PRODUCTION_AD_UNITS = {
  android: {
    banner: 'ca-app-pub-2685624187820858/2314147961',
    native: 'ca-app-pub-2685624187820858/5927099079',
  },
  // Add these once an iOS app exists in AdMob (and set iosAppId in app.json).
  // While null, release iOS builds simply show no ads.
  ios: {
    banner: null,
    native: null,
  },
};

/** Contextual keywords to help AdMob serve relevant ads. */
export const AD_KEYWORDS = ['battery', 'phone charger', 'mobile accessories', 'power bank'];
