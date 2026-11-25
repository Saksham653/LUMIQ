import { palettes, type Palette as RoshniPalette } from '@/theme';

// The OLD token names, kept so the screens that have not been rebuilt yet
// still compile, now wearing the new look ("Roshni"): every colour below is
// read from the new palette in '@/theme', so there is one source of colour.
// Neutral warm paper, one deep blue for things that act, no gradient.
// New code uses '@/theme' and '@/ui' directly, never this file.
// Text sizes start at 14 and body text is 18: the app is meant to be easy
// for everyone to read.

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
  // The blue as a FILL (a button, a chosen chip, a bar). Never as small text:
  // in dark it is too dim for that.
  primary: string;
  // The blue as TEXT or as an icon on paper: links, text buttons, "See it".
  primaryText: string;
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
  // The person's own question in Ask, and the text in it.
  userBubble: string;
  onUserBubble: string;
  // Once a cyan, violet and amber gradient. The new look has no gradient:
  // all three stops are the action blue, so anything still drawing it draws
  // one solid line.
  prism: readonly [string, string, string];
};

// Each old role, read from the new palette.
function fromRoshni(colors: RoshniPalette): Palette {
  return {
    background: colors.ground,
    card: colors.surface,
    surfaceVariant: colors.surfaceSunk,
    text: colors.ink,
    textSecondary: colors.inkSoft,
    textTertiary: colors.inkFaint,
    border: colors.line,
    pressed: colors.surfacePressed,
    primary: colors.action,
    primaryText: colors.actionText,
    onPrimary: colors.onAction,
    primaryContainer: colors.actionSoft,
    onPrimaryContainer: colors.onActionSoft,
    secondary: colors.actionText,
    secondaryContainer: colors.actionSoft,
    accent: colors.warn,
    accentContainer: colors.warnSoft,
    success: colors.good,
    successContainer: colors.goodSoft,
    onSuccess: colors.onGood,
    userBubble: colors.userBubble,
    onUserBubble: colors.onUserBubble,
    prism: [colors.action, colors.action, colors.action],
  };
}

// One object per scheme, so the same palette is always the same object.
export const Colors: Record<'light' | 'dark', Palette> = {
  light: fromRoshni(palettes.light),
  dark: fromRoshni(palettes.dark),
};

// Spacing grows in steps: gaps between rows < between groups < between
// sections (lg 16 → xxl 24 → huge 40).
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
// The old names on the new corners: wells and controls 14 (md, lg), cards
// and panels 20 (xl, xxl), buttons and chips fully round.
export const Radius = { md: 14, lg: 14, xl: 20, xxl: 20, pill: 999 } as const;
export const FontSize = { display: 30, title: 24, heading: 20, body: 18, label: 16, small: 14 } as const;

// Big numerals, the hero of each screen (the figures face, tabular; the
// currency sign and the unit beside them are lighter and smaller).
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

// Not used by the new look: a card is a surface with a 1 px line edge and no
// shadow. Kept only so old imports still compile.
export const Elevation = {
  raised: '0 1px 2px rgba(15, 23, 42, 0.06)',
  floating: '0 6px 16px rgba(15, 23, 42, 0.08)',
} as const;
