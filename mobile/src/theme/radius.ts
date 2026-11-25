// Corner radii, in dp (tokens.json, radius).
//
// Two radii belong to single components and are not tokens: the band under a
// checked number (6, with 2 at the foot) and the top of a chart bar (4). They
// stay in those components, with a comment that names the brand spec.
export const radius = {
  // List rows, icon tiles, wells, multi-line fields.
  control: 14,
  // Cards, the hero, toasts, the question bubble (with one corner of 6 toward
  // the speaker).
  card: 20,
  // Sheets (top corners), dialogs, the tab bar.
  sheet: 28,
  // Buttons, chips, single-line fields, tags, the tab pill, the language
  // control.
  pill: 999,
} as const;
export type Radius = keyof typeof radius;
