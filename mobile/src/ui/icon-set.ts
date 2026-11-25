// The LUMIQ icon family, as data (brand spec, section 10). One custom family
// for both platforms, drawn by <Icon name="..." /> in icon.tsx. No system
// symbols, no icon font, no emoji, no sparkles anywhere.
//
// The drawings are the ones on the brand board (showcase/directions/final.html,
// the symbols named "i-" plus the name): same path data, the board's
// rectangles and rings rewritten as paths. All 41 of the family are here, as
// the board has them after the brand's review (brand spec, section 15):
// `checked-stamp` is a ring with the tick and no fill, and the tick of
// `file-check` is the family's one tick at half size. One more, `minus`, was
// drawn for the stepper, which the family of 41 cannot build (see the foot of
// the list).
//
// HOW THE FAMILY IS KEPT EVEN (measured from the drawings; a new icon follows
// the same sizes so it sits level with its neighbours):
// - No line runs outside 3.5 to 20.5, so with its width of 2 nothing reaches
//   past 2.5 and 21.5.
// - Shapes are sized by how big they look, not by one box. A ring is 17
//   across (error, info, language, checked-stamp). A square frame is 15
//   (column, row, copy, the chart axes), because a square looks bigger than a
//   ring of the same width. A sheet is 13 by 17 (file, file-check, report). A
//   bare sign is smaller again: `add` and `minus` 13, `check` 13 wide, `close`
//   11, because its diagonals run longer.
// - Every drawing is centred on (12, 12) to within three quarters of a unit.
//   The one exception is `play`: a triangle is set toward its tip so that it
//   looks centred.
// - Corners: 2.5 on a frame, 2 on a sheet, the house and the small tiles of
//   `more`, 3 on the speech bubble.
// - A dot is 1.2 to 1.7 inside a drawing, and up to 2.4 where it stands for a
//   whole part (the knob of `settings`, the fourth tile of `more`).
// - One tick. `check` is the full drawing, a short stroke of 4.2 down and a
//   long one of 8.8 across and 9.4 up. `checked-stamp` holds it at two thirds
//   and `file-check` at half; the 28 stamp under an answer (proof-stamp.tsx)
//   holds it at five sixths. A tick is never drawn any other way.
//
// HOW AN ICON IS WRITTEN
//
//   name: { d, dot?, directional? }
//
// d            The lines, as SVG path data on a 24 by 24 grid. Drawn 2 wide
//              with round ends and round joins and no fill. Keep the drawing
//              inside the middle 20 (2 of padding on every side). Several
//              strokes go into the one string, each starting with its own
//              "M". There is no other shape: write a rectangle or a ring as
//              path data too (see `lock` and `search`).
// dot          At most one solid dot, as [cx, cy, r], radius 1.2 to 2.4. It
//              is the sun of the mark: the door of the house, the point on a
//              chart, the dot of an exclamation mark. It takes the icon's own
//              colour. It is never yellow.
// directional  true for an icon that points along the reading direction. It
//              is mirrored in right-to-left languages. The brand names four:
//              back, chevron, send, undo. Nothing else flips.
// knock        Not used by any icon now. It held lines drawn over the dot in
//              the colour of the surface behind (the old filled stamp). The
//              field stays in the type only because Icon still reads it; it
//              goes when Icon drops `knockColor`.
//
// TO ADD AN ICON: add one line below, in the same shape. The name becomes
// part of the IconName type by itself. Draw it at 24, check it at 20 (beside
// `label` and `small` text) on both a light and a dark surface, and keep its
// weight equal to its neighbours: same 2 line, same round ends, at most one
// dot.

export type IconDef = {
  d: string;
  dot?: readonly [cx: number, cy: number, r: number];
  knock?: string;
  directional?: boolean;
};

export const ICONS = {
  // The four tabs.
  home: { d: 'M4 11.2 12 4.5l8 6.7V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', dot: [12, 14.8, 1.7] },
  insights: { d: 'M6 19.5V14M12 19.5v-9M18 19.5V12', dot: [12, 5.4, 1.7] },
  // A speech bubble with the dot inside.
  ask: { d: 'M7 4.5h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4.6L8 20v-3.5H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z', dot: [12, 10.5, 1.7] },
  more: { d: 'M6 4H8.5A2 2 0 0 1 10.5 6V8.5A2 2 0 0 1 8.5 10.5H6A2 2 0 0 1 4 8.5V6A2 2 0 0 1 6 4ZM6 13.5H8.5A2 2 0 0 1 10.5 15.5V18A2 2 0 0 1 8.5 20H6A2 2 0 0 1 4 18V15.5A2 2 0 0 1 6 13.5ZM15.5 13.5H18A2 2 0 0 1 20 15.5V18A2 2 0 0 1 18 20H15.5A2 2 0 0 1 13.5 18V15.5A2 2 0 0 1 15.5 13.5Z', dot: [16.75, 7.25, 2.3] },

  // Things to do.
  file: { d: 'M7.5 3.5h5.7l5.3 5.3v9.7a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM13 3.8V9h5.2M12.6 16.4H15', dot: [9.4, 16.4, 1.6] },
  add: { d: 'M12 5.5v13M5.5 12h13' },
  search: { d: 'M16.5 10.5A6 6 0 1 1 4.5 10.5A6 6 0 1 1 16.5 10.5ZM15 15l4.5 4.5', dot: [10.5, 10.5, 1.6] },
  close: { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' },
  back: { d: 'M19 12H5.5M11 6.5 5.5 12l5.5 5.5', directional: true },
  chevron: { d: 'M9.5 6l6 6-6 6', directional: true },
  share: { d: 'M12 14.5v-10M8 8.2l4-4 4 4M5.5 12.5v5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5' },
  delete: { d: 'M5 7h14M9.5 7V5.6a1.1 1.1 0 0 1 1.1-1.1h2.8a1.1 1.1 0 0 1 1.1 1.1V7M7 7l.7 10.6a2 2 0 0 0 2 1.9h4.6a2 2 0 0 0 2-1.9L17 7M10.5 11v4.5M13.5 11v4.5' },
  undo: { d: 'M8.5 5.5l-4 4 4 4M4.8 9.5h9.4a5.2 5.2 0 0 1 0 10.4H9.5', directional: true },
  copy: { d: 'M11 8.5H17A2.5 2.5 0 0 1 19.5 11V17A2.5 2.5 0 0 1 17 19.5H11A2.5 2.5 0 0 1 8.5 17V11A2.5 2.5 0 0 1 11 8.5ZM15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2' },
  retry: { d: 'M19.5 12A7.5 7.5 0 1 1 12 4.5c2.1 0 4.1.85 5.6 2.3l1.9 1.9M19.5 4.5v4.2h-4.2' },
  send: { d: 'M12 19V5.5M6.5 11 12 5.5l5.5 5.5', directional: true },
  play: { d: 'M8.5 6.3v11.4a.8.8 0 0 0 1.2.7l9-5.7a.8.8 0 0 0 0-1.4l-9-5.7a.8.8 0 0 0-1.2.7z' },
  pause: { d: 'M9 6v12M15 6v12' },
  filter: { d: 'M4.5 7h15M7.5 12h9M10.5 17h3' },
  sort: { d: 'M8 5v14M4.5 15.5 8 19l3.5-3.5M16 19V5M12.5 8.5 16 5l3.5 3.5' },

  // How things stand. Status is never colour alone: always with words.
  check: { d: 'M5.5 12.6l4.2 4.2 8.8-9.4' },
  // The stamp in one colour: a ring with the tick at two thirds, no fill. It
  // has one use (brand spec, section 10): in a row or a line that points to
  // checked words somewhere else and gives their count, in the colour of that
  // line, always with the words, and only when every number matched. Never
  // under an answer, never beside a number the phone simply worked out, never
  // yellow.
  'checked-stamp': { d: 'M20.5 12A8.5 8.5 0 1 1 3.5 12A8.5 8.5 0 1 1 20.5 12ZM7.7 12.3l2.8 2.8 5.9-6.3' },
  warning: { d: 'M12 4.6 20.2 19H3.8zM12 10v3.8', dot: [12, 16.3, 1.2] },
  error: { d: 'M20.5 12A8.5 8.5 0 1 1 3.5 12A8.5 8.5 0 1 1 20.5 12ZM12 7.8v4.8', dot: [12, 15.9, 1.3] },
  info: { d: 'M20.5 12A8.5 8.5 0 1 1 3.5 12A8.5 8.5 0 1 1 20.5 12ZM12 11.4v4.8', dot: [12, 8.1, 1.3] },
  lock: { d: 'M8 10.5H16A2.5 2.5 0 0 1 18.5 13V17.5A2.5 2.5 0 0 1 16 20H8A2.5 2.5 0 0 1 5.5 17.5V13A2.5 2.5 0 0 1 8 10.5ZM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5', dot: [12, 15.2, 1.6] },
  offline: { d: 'M4.8 10.2a10.2 10.2 0 0 1 14.4 0M8 13.6a5.7 5.7 0 0 1 8 0M5.5 4.5l13 15', dot: [12, 17, 1.7] },

  // Settings.
  settings: { d: 'M4.5 8h7M18 8h1.5M4.5 16H6M12.5 16h7M17 8A2.5 2.5 0 1 1 12 8A2.5 2.5 0 1 1 17 8Z', dot: [9, 16, 2.4] },
  language: { d: 'M20.5 12A8.5 8.5 0 1 1 3.5 12A8.5 8.5 0 1 1 20.5 12ZM3.5 12h17M12 3.5c-3.2 3-3.2 14 0 17M12 3.5c3.2 3 3.2 14 0 17' },
  theme: { d: 'M19.2 14.3A7.8 7.8 0 1 1 9.7 4.8a6.2 6.2 0 0 0 9.5 9.5z', dot: [17, 6.6, 1.7] },
  numbers: { d: 'M9.5 4.5l-2 15M16.5 4.5l-2 15M5 9h14.5M4.5 15H19' },
  currency: { d: 'M6 6.5H18A2.5 2.5 0 0 1 20.5 9V15A2.5 2.5 0 0 1 18 17.5H6A2.5 2.5 0 0 1 3.5 15V9A2.5 2.5 0 0 1 6 6.5Z', dot: [12, 12, 2] },

  // A spreadsheet and what is made from it.
  calendar: { d: 'M7 5.5H17A2.5 2.5 0 0 1 19.5 8V17A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V8A2.5 2.5 0 0 1 7 5.5ZM4.5 10h15M8.5 3.8V7M15.5 3.8V7', dot: [15.3, 14.8, 1.6] },
  column: { d: 'M7 4.5H17A2.5 2.5 0 0 1 19.5 7V17A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5ZM9.5 4.5v15M14.5 4.5v15', dot: [12, 12, 1.5] },
  row: { d: 'M7 4.5H17A2.5 2.5 0 0 1 19.5 7V17A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5ZM4.5 9.5h15M4.5 14.5h15', dot: [12, 12, 1.5] },
  'chart-bar': { d: 'M4.5 4.5v15h15M9 15.5V12M13 15.5v-7M17 15.5V10' },
  'chart-line': { d: 'M4.5 4.5v15h15M8 15l3.4-4 3 2.4 2.5-3.5', dot: [18, 8.2, 1.7] },
  'what-if': { d: 'M7.6 12h2.9c3.2 0 2.8-5.5 6-5.5h3M10.5 12c3.2 0 2.8 5.5 6 5.5h3', dot: [5.6, 12, 1.7] },
  // The sheet of `file`, with the tick at half size where its row was.
  'file-check': { d: 'M7.5 3.5h5.7l5.3 5.3v9.7a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM13 3.8V9h5.2M8.8 15l2.1 2.1 4.4-4.7' },
  report: { d: 'M8 3.5H16A2.5 2.5 0 0 1 18.5 6V18A2.5 2.5 0 0 1 16 20.5H8A2.5 2.5 0 0 1 5.5 18V6A2.5 2.5 0 0 1 8 3.5ZM12 8h3.5M9 16.8v-2.3M12 16.8v-4.6M15 16.8v-3.3', dot: [9.2, 8, 1.5] },
  story: { d: 'M7.5 7.5H16.5A2.5 2.5 0 0 1 19 10V17.5A2.5 2.5 0 0 1 16.5 20H7.5A2.5 2.5 0 0 1 5 17.5V10A2.5 2.5 0 0 1 7.5 7.5ZM7.5 4.5h9', dot: [12, 13.8, 1.7] },

  // Not one of the brand's 41. The stepper counts down as well as up, and the
  // family has `add` but nothing to pair with it. This is the cross bar of
  // `add`, so the two look like one pair. If the brand owner would rather not
  // grow the family, remove this line and the stepper draws its own bar.
  minus: { d: 'M5.5 12h13' },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

// Every name, for a gallery or a picker.
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
