import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import Scanlines from './Scanlines';

/**
 * Scrolling LED ticker. The message is repeated enough times to always fill the
 * strip, and the row slides left by exactly one copy per loop (seamless).
 * With "reduce motion" on, it shows a static line instead.
 */
export default function Marquee({ text, speed = 55, style, textStyle }) {
  const reduceMotion = useReducedMotion();
  const [stripWidth, setStripWidth] = useState(0);
  const [copyWidth, setCopyWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    offset.setValue(0);
    if (reduceMotion || !copyWidth) return undefined;
    const loop = Animated.loop(
      Animated.timing(offset, {
        toValue: -copyWidth,
        duration: (copyWidth / speed) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [copyWidth, speed, reduceMotion, offset]);

  const copies = copyWidth ? Math.ceil(stripWidth / copyWidth) + 1 : 2;

  return (
    <View
      style={[styles.strip, style]}
      onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      {reduceMotion ? (
        <Text numberOfLines={1} style={[textStyle, styles.static]}>
          {text}
        </Text>
      ) : (
        <Animated.View style={[styles.track, { transform: [{ translateX: offset }] }]}>
          {Array.from({ length: copies }, (_, i) => (
            <Text
              key={i}
              style={textStyle}
              onLayout={i === 0 ? (e) => setCopyWidth(e.nativeEvent.layout.width) : undefined}
            >
              {text}
            </Text>
          ))}
        </Animated.View>
      )}
      <Scanlines opacity={0.35} gap={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { overflow: 'hidden', justifyContent: 'center' },
  track: { flexDirection: 'row', width: 20000 },
  static: { paddingHorizontal: 12 },
});
