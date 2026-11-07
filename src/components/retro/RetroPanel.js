import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';

/** Chunky bordered panel with a solid, offset "hard" shadow. */
export default function RetroPanel({
  children,
  style,
  contentStyle,
  color = colors.panel,
  borderColor = colors.orange,
  shadowColor = colors.ink,
  borderWidth = 3,
  offset = 6,
  radius = 6,
}) {
  return (
    <View style={[{ paddingRight: offset, paddingBottom: offset }, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { top: offset, left: offset, backgroundColor: shadowColor, borderRadius: radius },
        ]}
      />
      <View
        style={[
          { backgroundColor: color, borderColor, borderWidth, borderRadius: radius },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
