/**
 * Arcade "level complete" takeover shown when the charge target is reached:
 * turbo-speed green grid, color-cycling title, giant 3D percentage, a full
 * pixel battery and a big STOP button. The Android back button also stops it.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import RetroScene from './retro/RetroScene';
import RetroText from './retro/RetroText';
import RetroPanel from './retro/RetroPanel';
import PixelBattery from './retro/PixelBattery';
import ArcadeButton from './retro/ArcadeButton';
import PixelIcon from './retro/PixelIcon';
import Blink from './retro/Blink';

// Cycled at 400ms (2.5 Hz) — lively, but under the 3 Hz photosensitivity limit.
const TITLE_COLORS = [colors.sun, colors.green, colors.cream, colors.amber];
const CYCLE_MS = 400;

export default function AlarmOverlay({ visible, percent, threshold, onDismiss }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const [colorIndex, setColorIndex] = useState(0);
  const pop = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;

    if (reduceMotion) {
      pop.setValue(1);
      return undefined;
    }

    // Entrance: a quick screen flash, then the content pops in.
    pop.setValue(0);
    flash.setValue(0.85);
    Animated.parallel([
      Animated.timing(flash, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
    ]).start();

    const id = setInterval(() => setColorIndex((i) => (i + 1) % TITLE_COLORS.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [visible, reduceMotion, pop, flash]);

  const [line1, line2] = threshold >= 100 ? ['CHARGE', 'COMPLETE!'] : ['TARGET', 'REACHED!'];
  const bigSize = Math.min(60, Math.floor((width - 64) / 4.6));
  const titleColor = TITLE_COLORS[colorIndex];

  const popStyle = {
    opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.root}>
        <RetroScene horizon={0.64} speed="turbo" accent={colors.green} />

        <View style={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
          <Animated.View style={[styles.hero, popStyle]}>
            <RetroText style={[styles.title, styles.center]} color={titleColor} shadow={{ x: 4, y: 4, color: colors.ink }}>
              {line1}
            </RetroText>
            <RetroText
              style={[styles.title, styles.center]}
              containerStyle={styles.line2}
              color={titleColor}
              shadow={{ x: 4, y: 4, color: colors.ink }}
            >
              {line2}
            </RetroText>

            <RetroText
              style={[styles.big, { fontSize: bigSize, lineHeight: Math.round(bigSize * 1.2) }]}
              containerStyle={styles.bigWrap}
              color={colors.green}
              extrude={{ depth: 5, color: colors.greenDeep }}
              shadow={{ x: 9, y: 9, color: colors.ink }}
              outline={{ width: 2, color: colors.ink }}
              glow={colors.green}
              accessibilityLabel={`Battery at ${percent} percent`}
            >
              {`${percent}%`}
            </RetroText>

            <RetroPanel
              style={styles.batteryPanel}
              borderColor={colors.green}
              color="rgba(16, 5, 9, 0.92)"
              contentStyle={styles.batteryInner}
            >
              <PixelBattery percent={percent} mode="full" height={46} />
            </RetroPanel>

            <View style={styles.messageChip}>
              <Text style={styles.message}>UNPLUG YOUR PHONE NOW TO KEEP THE BATTERY HEALTHY</Text>
            </View>
          </Animated.View>

          <View style={styles.actions}>
            <Blink interval={500} enabled={!reduceMotion}>
              <Text style={styles.press}>PRESS TO STOP ALARM</Text>
            </Blink>
            <ArcadeButton
              label="STOP ALARM"
              scheme="green"
              onPress={onDismiss}
              icon={<PixelIcon name="check" size={3} color={colors.cream} shadow={colors.ink} />}
            />
          </View>
        </View>

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.skyTop },
  content: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  title: { ...type.pixelLg, fontSize: 24, lineHeight: 30 },
  line2: { marginTop: spacing.sm },
  bigWrap: { marginTop: spacing.xl, marginBottom: spacing.lg },
  big: { fontFamily: type.pixelLg.fontFamily, includeFontPadding: false, textAlign: 'center' },
  batteryPanel: { alignSelf: 'stretch' },
  batteryInner: { padding: spacing.md },
  messageChip: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.scrim,
    borderWidth: 2,
    borderColor: colors.greenDeep,
    borderRadius: 4,
  },
  message: { ...type.termMd, color: colors.cream, textAlign: 'center' },
  actions: { gap: spacing.md },
  press: { ...type.pixelSm, color: colors.green, textAlign: 'center' },
  flash: { backgroundColor: colors.cream },
});
