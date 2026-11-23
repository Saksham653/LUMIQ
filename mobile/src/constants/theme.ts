// LUMIQ design tokens for the phone app, taken from the Stitch designs.
// Text sizes start at 14 and body text is 18: the app is meant to be easy for
// everyone to read. The light primary is cyan-700 rather than the design's
// cyan-600 so white button text keeps an accessible contrast (5.4:1).

export type Palette = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  accent: string;
  accentContainer: string;
  success: string;
  successContainer: string;
};

export const Colors: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#e2e8f0',
    primary: '#0e7490',
    onPrimary: '#ffffff',
    primaryContainer: '#cffafe',
    onPrimaryContainer: '#164e63',
    secondary: '#6d28d9',
    secondaryContainer: '#ede9fe',
    accent: '#b45309',
    accentContainer: '#fef3c7',
    success: '#15803d',
    successContainer: '#dcfce7',
  },
  dark: {
    background: '#050914',
    card: '#0f1a33',
    text: '#e2e8f0',
    textSecondary: '#a3b1c6',
    border: '#1e2d5c',
    primary: '#22d3ee',
    onPrimary: '#04202a',
    primaryContainer: '#083344',
    onPrimaryContainer: '#a5f3fc',
    secondary: '#a78bfa',
    secondaryContainer: '#2e1065',
    accent: '#fbbf24',
    accentContainer: '#422006',
    success: '#4ade80',
    successContainer: '#052e16',
  },
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const Radius = { md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const FontSize = { display: 30, title: 24, heading: 20, body: 18, label: 16, small: 14 } as const;

// Smallest comfortable touch target, in dp.
export const TouchTarget = 52;
