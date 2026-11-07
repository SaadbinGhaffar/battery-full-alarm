import React, { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';

import { colors } from '../../theme';

/** Pixel-art bitmaps: "X" = filled pixel. */
const BITMAPS = {
  bolt: [
    '...XXXX',
    '..XXXX.',
    '..XXX..',
    '.XXX...',
    '.XXXXXX',
    'XXXXXX.',
    '...XXX.',
    '..XXX..',
    '..XX...',
    '.XX....',
    '.X.....',
  ],
  sliders: [
    '.XXX.....',
    'XXXXXXXXX',
    '.XXX.....',
    '.........',
    '.....XXX.',
    'XXXXXXXXX',
    '.....XXX.',
    '.........',
    '..XXX....',
    'XXXXXXXXX',
    '..XXX....',
  ],
  play: ['X.....', 'XX....', 'XXX...', 'XXXX..', 'XXXXX.', 'XXXX..', 'XXX...', 'XX....', 'X.....'],
  close: ['XX...XX', 'XXX.XXX', '.XXXXX.', '..XXX..', '.XXXXX.', 'XXX.XXX', 'XX...XX'],
  check: [
    '.......XX',
    '......XXX',
    'XX...XXX.',
    'XXX.XXX..',
    '.XXXXX...',
    '..XXX....',
    '...X.....',
  ],
};

/** Merge each row's consecutive pixels into runs -> far fewer SVG nodes. */
function toRuns(rows) {
  const runs = [];
  rows.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x += 1) {
      const filled = row[x] === 'X';
      if (filled && start < 0) start = x;
      if (!filled && start >= 0) {
        runs.push({ x: start, y, w: x - start });
        start = -1;
      }
    }
  });
  return runs;
}

export default function PixelIcon({ name, size = 3, color = colors.cream, shadow }) {
  const rows = BITMAPS[name];
  const runs = useMemo(() => toRuns(rows), [rows]);
  const pad = shadow ? size : 0;

  return (
    <Svg width={rows[0].length * size + pad} height={rows.length * size + pad} shapeRendering="crispEdges">
      {shadow &&
        runs.map((r) => (
          <Rect
            key={`s${r.x}-${r.y}`}
            x={(r.x + 1) * size}
            y={(r.y + 1) * size}
            width={r.w * size}
            height={size}
            fill={shadow}
          />
        ))}
      {runs.map((r) => (
        <Rect key={`${r.x}-${r.y}`} x={r.x * size} y={r.y * size} width={r.w * size} height={size} fill={color} />
      ))}
    </Svg>
  );
}
