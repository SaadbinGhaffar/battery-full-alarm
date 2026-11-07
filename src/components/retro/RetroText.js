import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Display text with an 80s look: a solid 3D extrusion, a hard offset shadow and
 * an arcade-style outline (all stacked copies — crisp on both platforms, unlike
 * textShadow), plus an optional neon glow.
 *
 * `style` is the text style (font, size, alignment). Use `containerStyle` for
 * layout (margins etc.) so the stacked layers stay aligned.
 */
export default function RetroText({
  children,
  style,
  containerStyle,
  color,
  extrude, // { depth, color }
  shadow, // { x, y, color }
  outline, // { width, color } — keeps the face legible over busy backgrounds
  glow, // color
  numberOfLines,
  maxFontSizeMultiplier = 1.2,
  ...rest
}) {
  // Painted back-to-front: shadow, extrusion (deepest first), outline, face.
  const layers = [];
  if (shadow) layers.push(shadow);
  if (extrude) {
    for (let d = extrude.depth; d >= 1; d -= 1) {
      layers.push({ x: d, y: d, color: extrude.color });
    }
  }
  if (outline) {
    const w = outline.width;
    for (const [x, y] of [[-w, -w], [0, -w], [w, -w], [-w, 0], [w, 0], [-w, w], [0, w], [w, w]]) {
      layers.push({ x, y, color: outline.color });
    }
  }

  const glowStyle = glow
    ? { textShadowColor: glow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 }
    : null;

  return (
    <View style={containerStyle}>
      {layers.map((layer, index) => (
        <Text
          key={index}
          aria-hidden
          importantForAccessibility="no-hide-descendants"
          numberOfLines={numberOfLines}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          style={[
            style,
            styles.layer,
            { color: layer.color, transform: [{ translateX: layer.x }, { translateY: layer.y }] },
          ]}
        >
          {children}
        </Text>
      ))}
      <Text
        numberOfLines={numberOfLines}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[style, { color }, glowStyle]}
        {...rest}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
});
