import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Battery from 'expo-battery';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { colors, spacing, type } from '../theme';
import { useSettings } from '../hooks/useSettings';
import { useBatteryMonitor } from '../hooks/useBatteryMonitor';
import { useAlarm } from '../providers/AlarmProvider';
import { ensureNotificationPermission, setupNotificationChannel } from '../services/notifications';
import { registerBackgroundTask } from '../services/backgroundTask';
import { startForegroundMonitor, stopForegroundMonitor } from '../services/foregroundService';
import { dismissChargeAlarm, handleBatteryReading, resetChargeSession } from '../services/chargeAlert';

import RetroScene from '../components/retro/RetroScene';
import RetroText from '../components/retro/RetroText';
import RetroPanel from '../components/retro/RetroPanel';
import PixelBattery from '../components/retro/PixelBattery';
import PixelIcon from '../components/retro/PixelIcon';
import ArcadeButton from '../components/retro/ArcadeButton';
import Marquee from '../components/retro/Marquee';
import Blink from '../components/retro/Blink';
import SettingsModal from '../components/SettingsModal';
import AlarmOverlay from '../components/AlarmOverlay';
import BannerAdSlot from '../ads/BannerAdSlot';

const KEEP_AWAKE_TAG = 'charged-screen';
const LOW_BATTERY = 20;

/** Hero number colors per battery mode: face + 3D side. */
const HERO_COLORS = {
  normal: { face: colors.sun, side: colors.orangeHot },
  full: { face: colors.green, side: colors.greenDeep },
  low: { face: colors.red, side: colors.redDeep },
};

function Header({ onOpenSettings }) {
  return (
    <View style={styles.header}>
      <View>
        <View style={styles.logoRow}>
          <PixelIcon name="bolt" size={3} color={colors.sun} shadow={colors.orangeHot} />
          <RetroText
            style={styles.logo}
            color={colors.sun}
            extrude={{ depth: 3, color: colors.orangeHot }}
            shadow={{ x: 5, y: 5, color: colors.ink }}
            accessibilityRole="header"
          >
            CHARGED
          </RetroText>
        </View>
        <Text style={styles.tagline}>BATTERY FULL ALARM</Text>
      </View>
      <ArcadeButton
        scheme="dark"
        size="sm"
        onPress={onOpenSettings}
        accessibilityLabel="Open settings"
        icon={<PixelIcon name="sliders" size={2} color={colors.amber} />}
      />
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { settings, update, hydrated } = useSettings();
  const { isAlarming, alarmPercent, start } = useAlarm();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Every live reading goes to the shared alert logic, which rings once per
  // charging session (deduped against the background monitor).
  const onReading = useCallback(
    ({ percent: p, state }) => {
      if (hydrated) handleBatteryReading({ percent: p, state, settings });
    },
    [hydrated, settings]
  );

  const { percent, batteryState, pluggedIn, charging, full, notCharging, lowPowerMode, refresh } =
    useBatteryMonitor({ onReading });

  // Evaluate once settings load. Later, a new target or re-enabled monitoring
  // starts a fresh session (e.g. picking 80% while already at 85% rings), but
  // the first load must not — or reopening the app would ring again.
  const sessionKeyRef = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    const key = `${settings.threshold}:${settings.enabled}`;
    if (sessionKeyRef.current !== null && sessionKeyRef.current !== key) resetChargeSession();
    sessionKeyRef.current = key;
    refresh();
  }, [hydrated, settings.threshold, settings.enabled, refresh]);

  // One-time setup: notification permission + channel + background task.
  useEffect(() => {
    (async () => {
      await ensureNotificationPermission();
      await setupNotificationChannel({ sound: settings.sound });
      await registerBackgroundTask();
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/stop the Android foreground-service monitor (rings with the app closed).
  // Wait for stored settings so we never start it on defaults by mistake.
  useEffect(() => {
    if (Platform.OS !== 'android' || !hydrated) return;
    if (settings.enabled && settings.exactBackground) {
      startForegroundMonitor();
    } else {
      stopForegroundMonitor();
    }
  }, [hydrated, settings.enabled, settings.exactBackground]);

  // Keep the screen awake while plugged in, if enabled. Only release a wake lock
  // this effect actually took — releasing an inactive tag throws.
  useEffect(() => {
    if (!(settings.keepAwake && pluggedIn)) return undefined;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      try {
        Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
      } catch {
        // already released
      }
    };
  }, [settings.keepAwake, pluggedIn]);

  // Stopping silences the alarm; it won't ring again until the next charge
  // session (unplug, or the level drops below the target).
  const dismissAlarm = dismissChargeAlarm;

  const handleTest = useCallback(() => {
    start({
      sound: settings.sound,
      vibration: settings.vibration,
      percent: percent ?? 100,
      title: '🔔 Test alarm',
      body: 'This is how Charged alerts you. Tap STOP ALARM to silence it.',
    });
  }, [percent, settings.sound, settings.vibration, start]);

  // ---- Derived display state -------------------------------------------------
  const targetReached = percent != null && pluggedIn && (full || percent >= settings.threshold);
  const low = !pluggedIn && percent != null && percent <= LOW_BATTERY;
  const mode = targetReached ? 'full' : low ? 'low' : 'normal';

  const status = useMemo(() => {
    if (targetReached) return { text: 'TARGET REACHED', color: colors.green };
    if (charging) return { text: 'CHARGING', color: colors.amber };
    if (notCharging) return { text: 'CHARGE PAUSED', color: colors.sun };
    if (batteryState === Battery.BatteryState.UNPLUGGED) {
      return low ? { text: 'LOW BATTERY', color: colors.red } : { text: 'ON BATTERY', color: colors.creamDim };
    }
    return { text: 'SCANNING', color: colors.muted };
  }, [targetReached, charging, notCharging, batteryState, low]);

  const ticker = useMemo(() => {
    const t = settings.threshold;
    if (!settings.enabled) return 'MONITORING OFF  *  OPEN SETTINGS TO ARM THE ALARM  *  ';
    if (targetReached) return 'TARGET REACHED  *  UNPLUG NOW TO SAVE YOUR BATTERY  *  ';
    if (pluggedIn) return `CHARGING  *  ALARM SET FOR ${t}%  *  SIT BACK AND RELAX  *  `;
    return `PLUG IN TO START  *  ALARM ARMED FOR ${t}%  *  `;
  }, [settings.enabled, settings.threshold, targetReached, pluggedIn]);

  const hero = HERO_COLORS[mode];
  const heroSize = Math.min(64, Math.floor((width - 56) / 4.8));
  const heroLabel =
    percent == null ? 'Battery level unknown' : `Battery ${percent} percent, ${status.text.toLowerCase()}`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RetroScene horizon={0.47} speed={charging ? 'charging' : 'idle'} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Header onOpenSettings={() => setSettingsOpen(true)} />

          <View style={styles.hero} accessible accessibilityLabel={heroLabel}>
            <RetroText
              style={[styles.heroNumber, { fontSize: heroSize, lineHeight: Math.round(heroSize * 1.2) }]}
              color={hero.face}
              extrude={{ depth: 5, color: hero.side }}
              shadow={{ x: 9, y: 9, color: colors.ink }}
              outline={{ width: 2, color: colors.ink }}
              maxFontSizeMultiplier={1}
            >
              {percent == null ? '--%' : `${percent}%`}
            </RetroText>
            <View style={[styles.statusChip, { borderColor: status.color }]}>
              <Text style={[styles.statusText, { color: status.color, textShadowColor: status.color }]}>
                {`> ${status.text}`}
              </Text>
              <Blink interval={530}>
                <View style={[styles.cursor, { backgroundColor: status.color }]} />
              </Blink>
            </View>
          </View>

          <Marquee text={ticker} style={styles.ticker} textStyle={styles.tickerText} />

          <RetroPanel style={styles.console} color="rgba(20, 6, 14, 0.94)" contentStyle={styles.consoleInner}>
            <View style={styles.consoleHeader}>
              <Text style={styles.consoleLabel}>POWER MONITOR</Text>
              <View style={styles.liveRow}>
                <Blink interval={600} enabled={settings.enabled}>
                  <View style={[styles.liveDot, { backgroundColor: settings.enabled ? colors.green : colors.muted }]} />
                </Blink>
                <Text style={[styles.consoleLabel, { color: settings.enabled ? colors.green : colors.muted }]}>
                  {settings.enabled ? 'LIVE' : 'OFF'}
                </Text>
              </View>
            </View>

            <PixelBattery percent={percent ?? 0} charging={charging} mode={mode} />

            <View style={styles.stats}>
              <Stat label="TARGET" value={`${settings.threshold}%`} color={colors.amber} />
              <View style={styles.statDivider} />
              <Stat label="ALARM" value={settings.sound ? 'ON' : 'MUTE'} color={settings.sound ? colors.green : colors.muted} />
              <View style={styles.statDivider} />
              <Stat label="SAVER" value={lowPowerMode ? 'ON' : 'OFF'} color={lowPowerMode ? colors.sun : colors.creamDim} />
            </View>
          </RetroPanel>

          <ArcadeButton
            label="TEST ALERT"
            onPress={handleTest}
            style={styles.testButton}
            icon={<PixelIcon name="play" size={2} color={colors.cream} shadow={colors.ink} />}
          />
        </View>

        {/* Full-width banner, outside the padded content (adaptive = screen width). */}
        <BannerAdSlot />
      </SafeAreaView>

      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        update={update}
      />

      <AlarmOverlay visible={isAlarming} percent={alarmPercent ?? percent ?? 100} threshold={settings.threshold} onDismiss={dismissAlarm} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.skyTop },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { ...type.pixelLg },
  tagline: { ...type.termSm, color: colors.amber, letterSpacing: 2, marginTop: spacing.sm },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroNumber: { fontFamily: type.pixelLg.fontFamily, includeFontPadding: false, textAlign: 'center' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.scrim,
    borderWidth: 2,
    borderRadius: 4,
  },
  statusText: {
    ...type.termLg,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  cursor: { width: 14, height: 24 },

  ticker: {
    height: 36,
    marginHorizontal: -spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(10, 2, 7, 0.88)',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.orange,
  },
  tickerText: {
    ...type.termMd,
    color: colors.amber,
    textShadowColor: colors.orange,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  console: { marginBottom: spacing.lg },
  consoleInner: { padding: spacing.md, gap: spacing.md },
  consoleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  consoleLabel: { ...type.pixelXs, color: colors.muted },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8 },

  stats: { flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { ...type.pixelXs, color: colors.muted },
  statValue: { ...type.termLg, marginTop: spacing.xs },
  statDivider: { width: 2, backgroundColor: colors.panelLine },

  // Clear gap above the banner so the button can't be mistaken for / mis-tapped into the ad.
  testButton: { marginBottom: spacing.md },
});
