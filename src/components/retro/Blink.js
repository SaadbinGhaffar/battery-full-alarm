import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/** Hard on/off blink (no fade), like a terminal cursor or an arcade prompt. */
export default function Blink({ children, interval = 500, enabled = true, minOpacity = 0, style }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      opacity.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: minOpacity, duration: 0, delay: interval, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 0, delay: interval, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, interval, minOpacity, opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
