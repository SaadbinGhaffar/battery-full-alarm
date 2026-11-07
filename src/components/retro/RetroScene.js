/**
 * Full-screen synthwave backdrop: night sky, pixel stars, a striped setting sun
 * behind mountains, and a neon perspective grid floor.
 *
 * The grid's horizontal lines travel toward the viewer — slowly when idle, fast
 * while charging ("energy flowing"), very fast in "turbo". They are plain Views
 * driven by the native animation driver, so the motion is smooth and cheap.
 * Respects the OS "reduce motion" setting (grid holds still).
 *
 * Render it as a sibling *behind* your content — it is memoized and only
 * re-renders when its own props or the window size change.
 */
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useSvgId } from '../../hooks/useSvgId';
import Scanlines from './Scanlines';

const CYCLE_MS = { idle: 9000, charging: 1400, turbo: 550 };
const H_LINES = 12;
const SAMPLES = [0, 0.25, 0.5, 0.75, 1];

/** Small deterministic PRNG so the star field is stable between renders. */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(width, horizonY) {
  const rand = seededRandom(1986);
  return Array.from({ length: 48 }, () => ({
    x: Math.round(rand() * width),
    y: Math.round(rand() * horizonY * 0.82),
    size: rand() > 0.85 ? 3 : 2,
    opacity: 0.25 + rand() * 0.7,
  }));
}

/** Union of horizontal bands: solid top half, then stripes with growing gaps. */
function makeSunBands(cx, cy, r) {
  const bands = [{ y: cy - r - 1, h: r + r * 0.08 }];
  let y = cy + r * 0.08;
  let k = 0;
  while (y < cy + r) {
    const gap = 3 + k * 2.5;
    const h = Math.max(4, r * 0.1 - k * 1.6);
    y += gap;
    bands.push({ y, h });
    y += h;
    k += 1;
  }
  return bands.map((b) => ({ ...b, x: cx - r - 1, w: r * 2 + 2 }));
}

function makeMountains(width, horizonY, peak) {
  const p = (fx, fh) => `${Math.round(width * fx)},${Math.round(horizonY - peak * fh)}`;
  const left = [p(0, 0), p(0, 0.62), p(0.07, 0.95), p(0.14, 0.58), p(0.21, 0.82), p(0.29, 0.34), p(0.36, 0.14), p(0.42, 0)];
  const right = [p(0.58, 0), p(0.64, 0.22), p(0.71, 0.7), p(0.78, 0.46), p(0.87, 1), p(0.94, 0.66), p(1, 0.78), p(1, 0)];
  return [left.join(' '), right.join(' ')];
}

function RetroScene({ horizon = 0.5, speed = 'idle', accent = colors.orange }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const ids = {
    sky: useSvgId('sky'),
    sun: useSvgId('sun'),
    glow: useSvgId('glow'),
    clip: useSvgId('clip'),
    floor: useSvgId('floor'),
    grid: useSvgId('grid'),
    vignette: useSvgId('vig'),
  };

  const horizonY = Math.round(H * horizon);
  const floorH = H - horizonY;
  const sunR = Math.round(Math.min(W * 0.4, 200));
  const sunCx = W / 2;
  const sunCy = horizonY - sunR * 0.28;

  const stars = useMemo(() => makeStars(W, horizonY), [W, horizonY]);
  const sunBands = useMemo(() => makeSunBands(sunCx, sunCy, sunR), [sunCx, sunCy, sunR]);
  const mountains = useMemo(() => makeMountains(W, horizonY, H * 0.075), [W, horizonY, H]);
  const verticals = useMemo(() => {
    const spacing = W / 5;
    return Array.from({ length: 25 }, (_, i) => W / 2 + (i - 12) * spacing);
  }, [W]);

  // --- Animated horizontal grid lines -------------------------------------
  const progress = useRef(new Animated.Value(0)).current;
  const cycle = reduceMotion ? 0 : CYCLE_MS[speed];

  useEffect(() => {
    progress.setValue(0);
    if (!cycle) return undefined;
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: cycle, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [cycle, progress]);

  // Line i sits at depth (i + t) / N; squaring it gives the perspective spacing.
  // Line i at t=1 lands exactly where line i+1 starts, so the loop is seamless.
  const hLines = useMemo(
    () =>
      Array.from({ length: H_LINES }, (_, i) => {
        const depth = SAMPLES.map((s) => (i + s) / H_LINES);
        return {
          translateY: progress.interpolate({ inputRange: SAMPLES, outputRange: depth.map((d) => floorH * d * d) }),
          opacity: progress.interpolate({ inputRange: SAMPLES, outputRange: depth.map((d) => Math.min(1, d * 3) * 0.9) }),
          scaleY: progress.interpolate({ inputRange: SAMPLES, outputRange: depth.map((d) => 0.6 + d * 2.4) }),
        };
      }),
    [progress, floorH]
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.skyTop} />
            <Stop offset="0.6" stopColor={colors.skyMid} />
            <Stop offset="1" stopColor={colors.skyHorizon} />
          </LinearGradient>
          <LinearGradient id={ids.sun} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE45C" />
            <Stop offset="0.45" stopColor="#FFA21A" />
            <Stop offset="0.8" stopColor={colors.orangeHot} />
            <Stop offset="1" stopColor="#E8203A" />
          </LinearGradient>
          {/* Relative units (default): Android react-native-svg mis-renders
              absolute-unit radial gradients as solid black. */}
          <RadialGradient id={ids.glow} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.orange} stopOpacity="0.45" />
            <Stop offset="0.55" stopColor={colors.orangeHot} stopOpacity="0.12" />
            <Stop offset="1" stopColor={colors.orangeHot} stopOpacity="0" />
          </RadialGradient>
          <ClipPath id={ids.clip}>
            {sunBands.map((b, i) => (
              <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />
            ))}
          </ClipPath>
          <LinearGradient id={ids.floor} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.floorTop} />
            <Stop offset="1" stopColor={colors.floorBottom} />
          </LinearGradient>
          <LinearGradient id={ids.grid} x1="0" y1={horizonY} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={accent} stopOpacity="0" />
            <Stop offset="0.3" stopColor={accent} stopOpacity="0.55" />
            <Stop offset="1" stopColor={accent} stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        {/* Sky + stars */}
        <Rect x="0" y="0" width={W} height={horizonY} fill={`url(#${ids.sky})`} />
        {stars.map((s, i) => (
          <Rect key={i} x={s.x} y={s.y} width={s.size} height={s.size} fill={colors.cream} opacity={s.opacity} />
        ))}

        {/* Sun with glow, cut into stripes */}
        <Circle cx={sunCx} cy={sunCy} r={sunR * 1.8} fill={`url(#${ids.glow})`} />
        <G clipPath={`url(#${ids.clip})`}>
          <Circle cx={sunCx} cy={sunCy} r={sunR} fill={`url(#${ids.sun})`} />
        </G>

        {/* Floor */}
        <Rect x="0" y={horizonY} width={W} height={floorH} fill={`url(#${ids.floor})`} />

        {/* Mountains, rim-lit */}
        {mountains.map((points, i) => (
          <Polygon key={i} points={points} fill={colors.mountain} stroke={accent} strokeWidth={2} strokeOpacity={0.75} />
        ))}

        {/* Converging grid lines */}
        {verticals.map((x, i) => (
          <Line key={i} x1={W / 2} y1={horizonY} x2={x} y2={H} stroke={`url(#${ids.grid})`} strokeWidth={1.5} />
        ))}

        {/* Neon horizon */}
        <Line x1="0" y1={horizonY} x2={W} y2={horizonY} stroke={accent} strokeWidth={10} strokeOpacity={0.12} />
        <Line x1="0" y1={horizonY} x2={W} y2={horizonY} stroke={accent} strokeWidth={4} strokeOpacity={0.35} />
        <Line x1="0" y1={horizonY} x2={W} y2={horizonY} stroke={colors.sun} strokeWidth={1.5} />
      </Svg>

      {/* Moving horizontal grid lines */}
      <View style={[styles.floorLines, { top: horizonY, height: floorH }]}>
        {hLines.map((line, i) => (
          <Animated.View
            key={i}
            style={[
              styles.hLine,
              {
                backgroundColor: accent,
                opacity: line.opacity,
                transform: [{ translateY: line.translateY }, { scaleY: line.scaleY }],
              },
            ]}
          />
        ))}
      </View>

      <Scanlines opacity={0.18} />
      {/* Defs must live in the same <Svg> that uses them: on native each <Svg>
          is its own canvas, and an unresolved url(#id) fill renders solid black. */}
      <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
        <Defs>
          <RadialGradient id={ids.vignette} cx="50%" cy="45%" r="75%">
            <Stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.6" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${ids.vignette})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  floorLines: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  hLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
});

export default memo(RetroScene);
