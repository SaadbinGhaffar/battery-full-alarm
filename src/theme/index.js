/**
 * Retro (80s synthwave / arcade) design tokens.
 * Orange-led sunset palette on a warm night sky, a pixel font for display text
 * and a CRT terminal font for readouts. Every visual value lives here.
 */

export const colors = {
  // Sunset oranges — the brand
  sun: '#FFD23F',
  amber: '#FFB000',
  orange: '#FF7A00',
  orangeHot: '#FF4A1C',
  ember: '#B33A00',
  emberDeep: '#6E1E00',

  // Night sky + grid floor
  skyTop: '#0E0410',
  skyMid: '#2B0A1E',
  skyHorizon: '#6A1A12',
  floorTop: '#1E0716',
  floorBottom: '#0A0207',
  mountain: '#16050F',

  // Surfaces
  ink: '#0A0306', // outlines + hard shadows
  panel: '#1A0A12',
  panelDeep: '#100509',
  panelLine: '#3A1626',
  raised: '#2E1323', // dark controls that must stand out on panels
  raisedLight: '#4E2238',
  scrim: 'rgba(10, 2, 7, 0.86)', // backing for text over the scene

  // Text
  cream: '#FFEBCC',
  creamDim: '#D9B999',
  muted: '#9A7468',

  // Phosphor states
  green: '#7CFF6B',
  greenFace: '#3FD957',
  greenDeep: '#1F7A2C',
  red: '#FF5050',
  redDeep: '#7A1010',
};

export const fonts = {
  pixel: 'PressStart2P_400Regular',
  terminal: 'VT323_400Regular',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Typography presets. Pixel fonts need explicit line heights to avoid clipping. */
export const type = {
  pixelXs: { fontFamily: fonts.pixel, fontSize: 8, lineHeight: 12, includeFontPadding: false },
  pixelSm: { fontFamily: fonts.pixel, fontSize: 10, lineHeight: 14, includeFontPadding: false },
  pixelMd: { fontFamily: fonts.pixel, fontSize: 13, lineHeight: 18, includeFontPadding: false },
  pixelLg: { fontFamily: fonts.pixel, fontSize: 20, lineHeight: 26, includeFontPadding: false },
  termSm: { fontFamily: fonts.terminal, fontSize: 19, lineHeight: 21, includeFontPadding: false },
  termMd: { fontFamily: fonts.terminal, fontSize: 25, lineHeight: 27, includeFontPadding: false },
  termLg: { fontFamily: fonts.terminal, fontSize: 32, lineHeight: 34, includeFontPadding: false },
};

/** Ten-step ramp used by the segmented pixel battery (hot orange -> sun). */
export const cellRamp = [
  '#FF3B1C', '#FF4F17', '#FF6312', '#FF770D', '#FF8B08',
  '#FF9F05', '#FFB000', '#FFBE1A', '#FFC82E', '#FFD23F',
];
