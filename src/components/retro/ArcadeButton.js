import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, type, spacing } from '../../theme';
import RetroText from './RetroText';

const SCHEMES = {
  orange: { face: colors.orange, side: colors.ember, highlight: '#FFA54D', text: colors.cream },
  green: { face: colors.greenFace, side: colors.greenDeep, highlight: '#A8FF9C', text: colors.cream },
  dark: { face: colors.raised, side: colors.ink, highlight: colors.raisedLight, text: colors.cream },
};

// Label shadow scales with the text so small labels stay crisp, not smeared.
const SIZES = {
  lg: { depth: 7, padV: 16, padH: spacing.xl, text: type.pixelMd, shadow: 2 },
  sm: { depth: 5, padV: 9, padH: spacing.md, text: type.pixelSm, shadow: 1 },
};

/**
 * Physical arcade-style push button: the face sinks into its darker base when
 * pressed. `active` holds it down (used for selected segmented options).
 */
export default function ArcadeButton({
  label,
  icon,
  onPress,
  scheme = 'orange',
  size = 'lg',
  active = false,
  style,
  accessibilityLabel,
}) {
  const s = SCHEMES[scheme];
  const z = SIZES[size];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected: active }}
      hitSlop={6}
      style={[{ paddingBottom: z.depth }, style]}
    >
      {({ pressed }) => {
        const down = pressed || active;
        return (
          <>
            <View style={[styles.base, { top: z.depth, backgroundColor: s.side }]} />
            <View
              style={[
                styles.face,
                {
                  backgroundColor: s.face,
                  paddingVertical: z.padV,
                  paddingHorizontal: z.padH,
                  transform: [{ translateY: down ? z.depth - 1 : 0 }],
                },
              ]}
            >
              <View style={[styles.highlight, { backgroundColor: s.highlight }]} />
              {icon}
              {!!label && (
                <RetroText
                  style={[z.text, styles.label]}
                  color={s.text}
                  shadow={{ x: z.shadow, y: z.shadow, color: colors.ink }}
                >
                  {label}
                </RetroText>
              )}
            </View>
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  highlight: { position: 'absolute', top: 2, left: 4, right: 4, height: 3, opacity: 0.7 },
  label: { textAlign: 'center' },
});
