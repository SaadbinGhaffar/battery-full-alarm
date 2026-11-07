/**
 * Expo config plugin for react-native-background-actions.
 *
 * The library declares its foreground service in its own AndroidManifest. On
 * Android 14+ every foreground service MUST declare an `android:foregroundServiceType`
 * that matches the type requested at runtime. We request `specialUse` (battery
 * monitoring doesn't fit any of the named categories), so this plugin merges a
 * matching <service> override into the app manifest using the manifest-merger's
 * `tools:replace`, and declares the special-use subtype property.
 *
 * It also ensures the required foreground-service permissions are present.
 */
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const SERVICE_NAME = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';
const FGS_TYPE = 'specialUse';
const SUBTYPE_VALUE = 'Alerts the user the moment their phone reaches its charge target while plugged in.';

const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.WAKE_LOCK',
];

function ensurePermissions(manifest) {
  manifest['uses-permission'] = manifest['uses-permission'] || [];
  for (const name of PERMISSIONS) {
    const exists = manifest['uses-permission'].some(
      (p) => p.$ && p.$['android:name'] === name
    );
    if (!exists) {
      manifest['uses-permission'].push({ $: { 'android:name': name } });
    }
  }
}

module.exports = function withBatteryForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Make sure the `tools` namespace is available for tools:replace.
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    ensurePermissions(manifest);

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = app.service || [];

    let service = app.service.find(
      (s) => s.$ && s.$['android:name'] === SERVICE_NAME
    );
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } };
      app.service.push(service);
    }

    service.$['android:foregroundServiceType'] = FGS_TYPE;
    service.$['android:exported'] = 'false';
    // Force our type to win over the value in the library's merged manifest.
    service.$['tools:replace'] = 'android:foregroundServiceType';

    // Required justification for the "specialUse" foreground service type.
    service.property = [
      {
        $: {
          'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
          'android:value': SUBTYPE_VALUE,
        },
      },
    ];

    return cfg;
  });
};
