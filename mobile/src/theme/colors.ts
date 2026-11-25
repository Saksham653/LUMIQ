// LUMIQ colours ("Roshni": a sheet of paper carried to a window). Quiet
// neutral paper, one deep blue for ink that acts, and one sunlight yellow
// that appears only where the phone has checked a number.
//
// Every value is copied from the locked brand tokens (tokens.json, color.light
// and color.dark). Components never type a colour: they read a role from
// useTheme().colors. Text reaches 4.5 to 1 on its surfaces in both themes;
// large numerals and marks that carry meaning reach 3 to 1.

export type Palette = {
  // The screen. Neutral warm paper, never cream.
  ground: string;
  // Cards, sheets, fields. One step lighter than the ground in both themes.
  surface: string;
  // Wells inside a card: icon tiles, the "how it was worked out" block, tracks.
  surfaceSunk: string;
  // A row or card under a finger. The sheet grabber.
  surfacePressed: string;
  // Text and numerals.
  ink: string;
  // Second-level text, labels of things not chosen, units beside numerals.
  inkSoft: string;
  // Hints and placeholders. Also the 1.5 edge of fields, chips not chosen and
  // radio rings.
  inkFaint: string;
  // 1 hairlines and card edges. Decoration: never the only thing that marks a
  // control.
  line: string;
  // Fills that act: the main button, send, the chosen chip, tab and radio.
  // One filled main button per screen.
  action: string;
  // Text and icons on `action`.
  onAction: string;
  // The blue as text or icon on ground, surface, sunk surface or the tab bar:
  // links, text buttons.
  actionText: string;
  // Quiet buttons.
  actionSoft: string;
  // Text on `actionSoft`.
  onActionSoft: string;
  // The sun. It has one job: this number was checked on your phone. Allowed
  // in four places only: the band under a checked number, the checked stamp,
  // the logo, the launch moment. Never on buttons, never as a wash, never for
  // emphasis, never in icons, charts, badges or illustrations.
  light: string;
  // The band behind a checked number.
  lightSoft: string;
  // The checked number itself, and the tick in the stamp.
  onLight: string;
  // The 2 solid line at the foot of the band, and the 2 ring of the stamp.
  checkedLine: string;
  // Success, as text or icon on surface or on `goodSoft`.
  good: string;
  // Fill of a success note.
  goodSoft: string;
  // Text on a `good` fill.
  onGood: string;
  // "Could not be matched" and "not yet". The dashed line under an unmatched
  // number.
  warn: string;
  // Fill of a warning note.
  warnSoft: string;
  // Failures and refusals, and the label of a destructive action.
  bad: string;
  // Fill of a failure note.
  badSoft: string;
  // The person's own question in Ask.
  userBubble: string;
  // Text in that bubble.
  onUserBubble: string;
  // Behind a sheet or dialog. Its opacity follows the sheet's position.
  scrim: string;
  // Resting bars, lines and axis marks.
  chartRest: string;
  // The one bar or point being pointed at. Always labelled as well.
  chartPeak: string;
  // An average or forecast band behind the marks. Decoration.
  chartBand: string;
  // Fill of the floating tab bar.
  tabBar: string;
  // A control that cannot be used: plain paper, never a faded blue.
  disabledFill: string;
  // Its label.
  disabledInk: string;
  // 3 ring, 3 away from the control, on keyboard focus.
  focusRing: string;
};

export const lightPalette: Palette = {
  ground: '#F1F0EC',
  surface: '#FBFAF7',
  surfaceSunk: '#E7E5DF',
  surfacePressed: '#DCD9D1',
  ink: '#1F1C17',
  inkSoft: '#4E4A42',
  inkFaint: '#5E5A51',
  line: '#D6D3CB',
  action: '#2440C0',
  onAction: '#FFFFFF',
  actionText: '#1F39B0',
  actionSoft: '#E2E7FB',
  onActionSoft: '#1B2F96',
  light: '#FFD033',
  lightSoft: '#FFE170',
  onLight: '#1F1C17',
  checkedLine: '#9A7200',
  good: '#166C3D',
  goodSoft: '#DCEFE2',
  onGood: '#FFFFFF',
  warn: '#8A4A00',
  warnSoft: '#FBE4CF',
  bad: '#A8281C',
  badSoft: '#F9DDD6',
  userBubble: '#E2E7FB',
  onUserBubble: '#1F1C17',
  scrim: 'rgba(31, 28, 23, 0.45)',
  chartRest: '#827E74',
  chartPeak: '#2440C0',
  chartBand: '#DDE3FA',
  tabBar: '#FBFAF7',
  disabledFill: '#E7E5DF',
  disabledInk: '#827E75',
  focusRing: '#2440C0',
};

export const darkPalette: Palette = {
  ground: '#151412',
  surface: '#1F1E1B',
  surfaceSunk: '#2A2925',
  surfacePressed: '#36342F',
  ink: '#F1EEE6',
  inkSoft: '#C3BEB3',
  inkFaint: '#A9A498',
  line: '#3A3833',
  action: '#4866EA',
  onAction: '#FFFFFF',
  actionText: '#A3B3FF',
  actionSoft: '#20284F',
  onActionSoft: '#C5CEFF',
  light: '#FFD033',
  lightSoft: '#EDC341',
  onLight: '#1F1C17',
  checkedLine: '#A37E12',
  good: '#6CCF98',
  goodSoft: '#15301F',
  onGood: '#0B2415',
  warn: '#F49852',
  warnSoft: '#38240F',
  bad: '#FF8D85',
  badSoft: '#3D1816',
  userBubble: '#20284F',
  onUserBubble: '#F1EEE6',
  scrim: 'rgba(0, 0, 0, 0.6)',
  chartRest: '#807D75',
  chartPeak: '#A3B3FF',
  chartBand: '#252C52',
  tabBar: '#24231F',
  disabledFill: '#2A2925',
  disabledInk: '#7F7B72',
  focusRing: '#A3B3FF',
};

export type Scheme = 'light' | 'dark';

export const palettes: Record<Scheme, Palette> = { light: lightPalette, dark: darkPalette };

// The logo's own colours. They are the same in light and dark (brand spec,
// section 2), so the logo and the launch moment read them here and not from
// the palette: the tile stays this blue on a dark screen too.
export const brand = {
  // The tile behind the mark. Corner radius 22.5 percent of its width.
  tile: lightPalette.action,
  // The L on the tile.
  onTile: lightPalette.onAction,
  // The sun. Yellow only on the tile or on a dark ground, never on paper.
  sun: lightPalette.light,
} as const;
