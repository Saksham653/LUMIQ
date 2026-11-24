// LUMIQ design tokens for the phone app ("Prism" direction): mostly neutral
// surfaces, cyan only for actions, big confident numerals, and one
// signature, the prism line (the app's only gradient). Text sizes start at
// 14 and body text is 18: the app is meant to be easy for everyone to read.
// The light primary is cyan-700 so white button text keeps an accessible
// contrast (5.4:1); every text colour below meets AA on its surfaces.

export type Palette = {
  background: string;
  card: string;
  // A quieter surface: icon circles, chart tracks, the selected-tab pill.
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  // Upcoming steps and hints; still AA on card and background.
  textTertiary: string;
  border: string;
  // Row highlight while a finger is on it.
  pressed: string;
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
  // Ink on a success-coloured fill (the verified check).
  onSuccess: string;
  // The person's own chat messages: ink on paper, inverted in dark mode.
  userBubble: string;
  onUserBubble: string;
  // The prism line: cyan → violet → amber.
  prism: readonly [string, string, string];
};

export const Colors: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#f7f8fa',
    card: '#ffffff',
    surfaceVariant: '#eef1f5',
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b',
    border: '#e5e7eb',
    pressed: 'rgba(15, 23, 42, 0.06)',
    primary: '#0e7490',
    onPrimary: '#ffffff',
    primaryContainer: '#e3f2f6',
    onPrimaryContainer: '#164e63',
    secondary: '#6d28d9',
    secondaryContainer: '#ede9fe',
    accent: '#b45309',
    accentContainer: '#fef3c7',
    success: '#15803d',
    successContainer: '#dcfce7',
    onSuccess: '#ffffff',
    userBubble: '#0f172a',
    onUserBubble: '#ffffff',
    prism: ['#06b6d4', '#8b5cf6', '#f59e0b'],
  },
  dark: {
    background: '#050914',
    card: '#0e1424',
    surfaceVariant: '#172033',
    text: '#e8edf5',
    textSecondary: '#a3b1c6',
    textTertiary: '#8391a7',
    border: '#1f2a3d',
    pressed: 'rgba(255, 255, 255, 0.08)',
    primary: '#22d3ee',
    onPrimary: '#04202a',
    primaryContainer: '#0b3442',
    onPrimaryContainer: '#a5f3fc',
    secondary: '#a78bfa',
    secondaryContainer: '#2e1065',
    accent: '#fbbf24',
    accentContainer: '#3b2a06',
    success: '#4ade80',
    successContainer: '#06301a',
    onSuccess: '#04210f',
    userBubble: '#e8edf5',
    onUserBubble: '#0b1220',
    prism: ['#22d3ee', '#a78bfa', '#fbbf24'],
  },
};

// Spacing grows in steps: gaps between rows < between groups < between
// sections (lg 16 → xxl 24 → huge 40).
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
export const Radius = { md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 } as const;
export const FontSize = { display: 30, title: 24, heading: 20, body: 18, label: 16, small: 14 } as const;

// Big numerals, the hero of each screen (bold, tabular figures, tight
// letter spacing; the unit beside them is lighter and smaller).
export const Numeral = { score: 64, hero: 56, large: 34, medium: 28 } as const;

// Smallest comfortable touch target, in dp.
export const TouchTarget = 52;

// Durations in ms. press: buttons, tens of times a day; fast: chips and
// small state changes; base: answers, sheets, results; slow: larger
// moves; reveal and launch: the rare moments (score ring, first launch).
export const Motion = {
  press: 120,
  fast: 150,
  base: 250,
  slow: 400,
  countUp: 600,
  reveal: 900,
  launch: 1200,
  stagger: 25,
  // Cubic-bezier control points: ease-out for things entering, in-out for
  // things moving on screen. Never ease-in.
  easeOut: [0.23, 1, 0.32, 1],
  easeInOut: [0.77, 0, 0.175, 1],
  // Only where a finger was involved.
  spring: { duration: 350, dampingRatio: 0.9 },
} as const;

// Two elevation levels at most, shadow opacity 0.08 or less. Surfaces are
// mostly told apart by background contrast, not shadows.
export const Elevation = {
  raised: '0 1px 2px rgba(15, 23, 42, 0.06)',
  floating: '0 6px 16px rgba(15, 23, 42, 0.08)',
} as const;
