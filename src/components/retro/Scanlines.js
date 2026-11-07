import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { useSvgId } from '../../hooks/useSvgId';

/** CRT scanline overlay. Fills its parent and never intercepts touches. */
export default function Scanlines({ opacity = 0.22, gap = 4 }) {
  const id = useSvgId('scan');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width="4" height={gap}>
            <Rect x="0" y="0" width="4" height="1" fill="#000" fillOpacity={opacity} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
