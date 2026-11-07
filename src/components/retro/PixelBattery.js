import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, cellRamp } from '../../theme';
import Blink from './Blink';

const CELLS = 10;

function Cell({ color }) {
  return (
    <View style={[styles.cell, color ? { backgroundColor: color, borderColor: colors.ink } : styles.cellEmpty]}>
      {!!color && <View style={styles.shine} />}
    </View>
  );
}

/**
 * Ten-cell segmented battery. Each cell is 10%; while charging, the next cell
 * blinks. `mode`: "normal" (sunset ramp) | "full" (green) | "low" (red).
 */
export default function PixelBattery({ percent = 0, charging = false, mode = 'normal', height = 54 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.floor(clamped / (100 / CELLS));
  const frame = mode === 'full' ? colors.green : colors.cream;

  const colorFor = (i) => {
    if (mode === 'full') return colors.green;
    if (mode === 'low') return colors.red;
    return cellRamp[i];
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Battery level"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <View style={[styles.body, { height, borderColor: frame }]}>
        {Array.from({ length: CELLS }, (_, i) => {
          if (i < filled) return <Cell key={i} color={colorFor(i)} />;
          if (charging && i === filled) {
            return (
              <Blink key={i} interval={450} style={styles.blinkWrap}>
                <Cell color={colorFor(i)} />
              </Blink>
            );
          }
          return <Cell key={i} />;
        })}
      </View>
      <View style={[styles.nub, { height: height * 0.42, backgroundColor: frame }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 4,
    borderRadius: 4,
    backgroundColor: colors.panelDeep,
    padding: 4,
    gap: 4,
  },
  blinkWrap: { flex: 1 },
  cell: { flex: 1, borderWidth: 2, borderRadius: 2 },
  cellEmpty: { backgroundColor: '#1F0B16', borderColor: colors.panelLine },
  shine: { position: 'absolute', top: 2, left: 2, right: 2, height: 4, backgroundColor: '#FFFFFF', opacity: 0.35 },
  nub: { width: 8, marginLeft: 2, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
});
