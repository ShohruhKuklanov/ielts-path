// IELTS PATH brand colours and shared design tokens.
//
// Path Blue #2F62E9 is the brand colour: the light theme's `primary`, the
// app-level `primaryColor` in app.config.ts and the colour for store assets.
// Dark mode uses the lighter Path Blue Dark #6C93FF instead, because #2F62E9
// is too dark on the near-black background (about 3.6:1).
//
// Contrast checks (WCAG 2.x):
//   white #FFFFFF on Path Blue #2F62E9         ≈ 5.2:1  (AA for all text)
//   Path Blue #2F62E9 on background #F7F8FA    ≈ 4.9:1  (AA for all text)
//   Path Navy #17345F on background #F7F8FA    ≈ 11.7:1
//   #0E1117 on Path Blue Dark #6C93FF          ≈ 6.5:1  (AA for all text)
//   Path Blue Dark #6C93FF on #0E1117          ≈ 6.5:1

/** Path Blue: primary brand colour (light theme, icons, store listing). */
export const BRAND_BLUE = '#2F62E9';
/** Path Blue Dark: the brand blue on dark backgrounds. */
export const BRAND_BLUE_DARK = '#6C93FF';
/** Path Navy: the "IELTS" half of the wordmark on light backgrounds. */
export const BRAND_NAVY = '#17345F';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  streak: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1F5',
    border: '#DDE2EA',
    text: '#141A26',
    textMuted: '#5B6577',
    primary: BRAND_BLUE,
    onPrimary: '#FFFFFF',
    primarySoft: '#E5ECFD',
    success: '#1F9D57',
    warning: '#C77A00',
    danger: '#D33A3A',
    streak: '#F27A1A',
  },
  dark: {
    background: '#0E1117',
    surface: '#171B24',
    surfaceAlt: '#212734',
    border: '#2C3342',
    text: '#EEF1F6',
    textMuted: '#9AA4B5',
    primary: BRAND_BLUE_DARK,
    onPrimary: '#0E1117',
    primarySoft: '#1E2A47',
    success: '#4CC985',
    warning: '#F0B04A',
    danger: '#F07070',
    streak: '#FF9A4D',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const type = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
} as const;

export type TypeVariant = keyof typeof type;

/** Minimum height for anything tappable: generous for beginners. */
export const TOUCH_TARGET = 52;
