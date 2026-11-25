// Spacing and the few sizes every component shares (brand spec, section 6).
// All in dp.

// The spacing scale: 4, 8, 12, 16, 20, 24, 32, 40. Gaps and padding come from
// here and nowhere else. A component never sets its own outer margin; its
// parent spaces it (with `gap`).
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
export type Space = keyof typeof space;

// What the scale means on a screen.
export const rhythm = {
  // Between the screen's edge and its content.
  screenEdge: space.lg,
  // Inside a card.
  cardPadding: space.lg,
  // Between cards.
  cardGap: space.md,
  // Between sections.
  sectionGap: space.xxl,
} as const;

// Sizes shared by more than one component. A size that belongs to a single
// component (the 22 radio, the 28 stamp, the 64 tab bar) stays in that
// component's file, with a comment that names the brand spec.
export const sizes = {
  // The smallest thing a finger can press. A smaller drawing gets hitSlop
  // (Press adds it by itself).
  target: 48,
  // The main button, a field, the send button.
  control: 52,
  // A list row is at least this high.
  row: 56,
  // The sunk tile that holds a row's icon.
  iconTile: 40,
  // An icon by itself, or beside body text.
  icon: 24,
  // An icon beside `label` or `small` text.
  iconSmall: 20,
} as const;

// Line widths.
export const border = {
  // Hairlines and card edges, in `line`. Also the edge of anything that
  // floats (see lift).
  hairline: 1,
  // The edge of a field, a chip that is not chosen, a radio ring: `inkFaint`.
  control: 1.5,
  // A focused field's edge (`action`), the line under a checked number, the
  // ring of the stamp.
  strong: 2,
  // The keyboard focus ring: this wide and this far from the control, in
  // `focusRing`.
  focus: 3,
} as const;
