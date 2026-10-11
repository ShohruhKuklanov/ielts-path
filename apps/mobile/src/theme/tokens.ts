// Design tokens. Brand colours are placeholders until the brand is chosen:
// change `primary` here and the whole app follows.

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
    primary: '#2F62E9',
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
    primary: '#6C93FF',
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
