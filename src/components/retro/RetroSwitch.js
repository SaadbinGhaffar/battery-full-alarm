import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const TRACK_W = 72;
const TRACK_H = 34;
const BORDER = 3;
const KNOB = 22;
const INSET = 3;
const TRAVEL = TRACK_W - BORDER * 2 - KNOB - INSET * 2;

/** Pixel-style ON/OFF toggle with a square sliding knob. */
export default function RetroSwitch({ value, onValueChange, accessibilityLabel }) {
  const reduceMotion = useReducedMotion();
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: reduceMotion ? 0 : 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [value, reduceMotion, position]);

  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
    >
      <View style={[styles.track, { backgroundColor: value ? colors.orange : colors.raised }]}>
        <Text style={[styles.label, value ? styles.labelOn : styles.labelOff]}>{value ? 'ON' : 'OFF'}</Text>
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]}>
          <View style={styles.knobShine} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderWidth: BORDER,
    borderColor: colors.ink,
    borderRadius: 4,
    justifyContent: 'center',
  },
  label: { ...type.pixelXs, position: 'absolute' },
  labelOn: { left: 7, color: colors.ink },
  labelOff: { right: 6, color: colors.creamDim },
  knob: {
    position: 'absolute',
    top: INSET,
    left: INSET,
    width: KNOB,
    height: KNOB,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 2,
  },
  knobShine: { position: 'absolute', top: 2, left: 2, width: 6, height: 3, backgroundColor: '#FFFFFF' },
});
