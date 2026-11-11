import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '../theme';
import { THRESHOLD_OPTIONS } from '../constants';
import ArcadeButton from './retro/ArcadeButton';
import PixelIcon from './retro/PixelIcon';
import RetroSwitch from './retro/RetroSwitch';
import Scanlines from './retro/Scanlines';
import NativeAdCard from '../ads/NativeAdCard';
import { useAds } from '../ads/AdsProvider';

const TARGET_HINTS = {
  80: 'BEST FOR BATTERY LIFESPAN',
  90: 'BALANCED: HEALTH + RANGE',
  100: 'MAXIMUM CHARGE',
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{`> ${title}`}</Text>
      <View style={styles.inset}>{children}</View>
    </View>
  );
}

function ToggleRow({ title, subtitle, value, onChange, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <RetroSwitch value={value} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

export default function SettingsModal({ visible, onClose, settings, update }) {
  const insets = useSafeAreaInsets();
  const { privacyOptionsRequired, showPrivacyOptions } = useAds();
  const set = (key) => (value) => update({ [key]: value });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close settings" />
        <Scanlines opacity={0.3} />

        <View style={[styles.window, { paddingBottom: insets.bottom + spacing.lg }]}>
          {/* Retro window title bar */}
          <View style={styles.titleBar}>
            <Text style={styles.titleText}>SETTINGS</Text>
            <View style={styles.titleStripes}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.titleStripe} />
              ))}
            </View>
            <ArcadeButton
              scheme="dark"
              size="sm"
              onPress={onClose}
              accessibilityLabel="Close settings"
              icon={<PixelIcon name="close" size={2} color={colors.cream} />}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Section title="CHARGE TARGET">
              <View style={styles.targets}>
                {THRESHOLD_OPTIONS.map((opt) => {
                  const selected = settings.threshold === opt;
                  return (
                    <ArcadeButton
                      key={opt}
                      label={`${opt}%`}
                      size="sm"
                      scheme={selected ? 'orange' : 'dark'}
                      active={selected}
                      onPress={() => update({ threshold: opt })}
                      accessibilityLabel={`Alert at ${opt} percent`}
                      style={styles.target}
                    />
                  );
                })}
              </View>
              <Text style={styles.targetHint}>{TARGET_HINTS[settings.threshold]}</Text>
            </Section>

            <Section title="ALERTS">
              <ToggleRow title="MONITORING" subtitle="Master switch for charge alerts" value={settings.enabled} onChange={set('enabled')} />
              <ToggleRow title="ALARM SOUND" subtitle="Loop the alarm when charged" value={settings.sound} onChange={set('sound')} />
              <ToggleRow title="VIBRATION" subtitle="Buzz while the alarm rings" value={settings.vibration} onChange={set('vibration')} />
              <ToggleRow title="NOTIFICATION" subtitle="System alert, works in background" value={settings.notification} onChange={set('notification')} />
              <ToggleRow title="KEEP SCREEN ON" subtitle="Stay awake while plugged in" value={settings.keepAwake} onChange={set('keepAwake')} last />
            </Section>

            {Platform.OS === 'android' && (
              <Section title="BACKGROUND">
                <ToggleRow
                  title="BACKGROUND ALARM"
                  subtitle="Rings the moment you hit the target, even with the app closed or the screen off. Shows a small ongoing notification."
                  value={settings.exactBackground}
                  onChange={set('exactBackground')}
                  last
                />
              </Section>
            )}

            {/* Required by Google's consent policy wherever a consent form applies. */}
            {privacyOptionsRequired && (
              <Section title="ADS & PRIVACY">
                <View style={styles.privacyRow}>
                  <Text style={styles.rowSubtitle}>Review or change how ads use your data.</Text>
                  <ArcadeButton label="PRIVACY OPTIONS" size="sm" scheme="dark" onPress={showPrivacyOptions} />
                </View>
              </Section>
            )}

            <NativeAdCard style={styles.nativeAd} />

            <Text style={styles.footnote}>
              {Platform.OS === 'android'
                ? 'The alarm rings on your ALARM volume, even in silent mode. Unplug the charger or tap STOP to silence it. With the background alarm off, CHARGED can only send a notification when closed, and it may arrive up to ~15 min late.'
                : 'CHARGED watches your battery live while open. In the background the system wakes the app every so often, so a background alert may arrive a little late.'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6, 1, 4, 0.8)' },
  window: {
    maxHeight: '88%',
    backgroundColor: colors.panel,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.orange,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.ink,
  },
  titleText: { ...type.pixelMd, color: colors.ink },
  titleStripes: { flex: 1, height: 18, justifyContent: 'space-between', marginHorizontal: spacing.md },
  titleStripe: { height: 2, backgroundColor: colors.ink },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  section: { marginTop: spacing.lg },
  sectionLabel: { ...type.pixelSm, color: colors.amber, marginBottom: spacing.sm },
  inset: {
    backgroundColor: colors.panelDeep,
    borderWidth: 2,
    borderColor: colors.panelLine,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
  },
  targets: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md },
  target: { flex: 1 },
  targetHint: { ...type.termSm, color: colors.amber, textAlign: 'center', paddingVertical: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.panelLine,
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1 },
  rowTitle: { ...type.termMd, color: colors.cream },
  rowSubtitle: { ...type.termSm, color: colors.muted, marginTop: 2 },
  privacyRow: { gap: spacing.md, paddingVertical: spacing.md },
  nativeAd: { marginTop: spacing.xl },
  footnote: { ...type.termSm, color: colors.muted, marginTop: spacing.xl },
});
