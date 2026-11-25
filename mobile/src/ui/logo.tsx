import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { brand, useTheme } from '@/theme';

// The LUMIQ logo (brand spec, section 2), drawn in code so it looks the same
// before any font or image has loaded. Three parts:
//
//   Mark      an L and a sun. The L is two edges of one spreadsheet cell and
//             the two axes of a chart; the sun is the number the phone has
//             checked, held in the corner.
//   Wordmark  the name in five drawn letters. The Q is a whole ring with a
//             dot for its tail.
//   Lockup    the mark on its tile, a gap, the name.
//
// <Logo variant="lockup | mark | wordmark" /> picks one of the three.
//
// The rules the code keeps for you:
// - The sun is yellow only on the blue tile. Without the tile the whole mark
//   is one colour: there is no way to ask for yellow on paper.
// - The name is one colour, its dot included. The yellow never enters it.
// - Small sizes are redrawn, not shrunk: the 24 and the 16 drawings, on a
//   tile and off it.
// - On a tile the art sits a little right and up of centre, where it looks
//   centred (an L is heavy at the bottom left).
// - Nothing is drawn under its smallest size: tile 24, one colour mark 16,
//   letters 16 high. A lockup whose name would be smaller is the tile alone.
// - The logo never mirrors: a lockup reads mark first, then name, in Hebrew
//   too.
// What stays with you: one arm's width of clear space on every side (9 of the
// tile's 48 units), and never rotate, outline, shadow or recolour it.

// --- The drawings ------------------------------------------------------------
// Copied from the brand files: mark.svg and mark-mono.svg (the 48 drawing),
// mark-24.svg, mark-16.svg, wordmark.svg, lockup.svg. Do not edit a number
// here without changing the brand.

type MarkArt = {
  // The side of the grid the drawing is made on.
  box: number;
  l: string;
  sun: string;
};

// The 48 grid: the L fills a square of 32 in the middle, its arms are 9 thick,
// the sun is a circle of 16 at (29, 19), and the inside corner of the L is an
// arc drawn from the sun's own centre, so the gap between them is 4 all the
// way round.
const MARK_48: MarkArt = {
  box: 48,
  l: 'M10 8H15A2 2 0 0 1 17 10V19A12 12 0 0 0 29 31H38A2 2 0 0 1 40 33V38A2 2 0 0 1 38 40H13A5 5 0 0 1 8 35V10A2 2 0 0 1 10 8Z',
  sun: 'M37 19A8 8 0 1 1 21 19A8 8 0 0 1 37 19Z',
};

// 24: the mark fills its box, arms 6, sun 10, gap 3.
const MARK_24: MarkArt = {
  box: 24,
  l: 'M3.25 2H6.75A1.25 1.25 0 0 1 8 3.25V8A8 8 0 0 0 16 16H20.75A1.25 1.25 0 0 1 22 17.25V20.75A1.25 1.25 0 0 1 20.75 22H5A3 3 0 0 1 2 19V3.25A1.25 1.25 0 0 1 3.25 2Z',
  sun: 'M21 8A5 5 0 1 1 11 8A5 5 0 0 1 21 8Z',
};

// 16: arms 4, sun 7, gap 2.
const MARK_16: MarkArt = {
  box: 16,
  l: 'M1.75 1H4.25A.75 .75 0 0 1 5 1.75V5.5A5.5 5.5 0 0 0 10.5 11H14.25A.75 .75 0 0 1 15 11.75V14.25A.75 .75 0 0 1 14.25 15H3A2 2 0 0 1 1 13V1.75A.75 .75 0 0 1 1.75 1Z',
  sun: 'M14 5.5A3.5 3.5 0 1 1 7 5.5A3.5 3.5 0 0 1 14 5.5Z',
};

// The mark in one colour, by the side of its box: mark-mono.svg from 40 up,
// mark-24.svg from 20, mark-16.svg below that.
function monoArtFor(side: number): MarkArt {
  if (side >= 40) return MARK_48;
  if (side >= 20) return MARK_24;
  return MARK_16;
}

// The tile is a square with a corner of 22.5 percent of its width.
const TILE_RADIUS = 0.225;

type TileArt = {
  // The side of the tile the placement below is measured on.
  tile: number;
  art: MarkArt;
  // Where the drawing's own box starts inside that tile.
  x: number;
  y: number;
};

// On a tile the art is placed by eye, not by its box: 1.5 units right and 1.5
// up of centre on the 48 grid, so the L's outer edges and the sun's outer
// edges are the same distance (9.5) from the tile's edges. Small tiles hold
// the small drawings, never the 48 drawing shrunk.
const TILE_48: TileArt = { tile: 48, art: MARK_48, x: 1.5, y: -1.5 };
// The 24 drawing in a tile of 32: arms 6 of 32, the same share as 9 of 48.
const TILE_32: TileArt = { tile: 32, art: MARK_24, x: 5, y: 3 };
// The 16 drawing in a tile of 24.
const TILE_24: TileArt = { tile: 24, art: MARK_16, x: 5, y: 3 };

// A tile between two rows of the brand's table is the row below it, scaled.
function tileArtFor(side: number): TileArt {
  if (side >= 48) return TILE_48;
  if (side >= 32) return TILE_32;
  return TILE_24;
}

// The name: five drawn letters in a box of 150 by 40. The cap height is 32,
// from y 4 to y 36: the box is centred on the letters, so centring the box
// centres the name. One list of paths per letter, in reading order. The Q is
// its ring and its dot; the dot is the last path, as in wordmark.svg.
const WORD_WIDTH = 150;
const WORD_HEIGHT = 40;
const WORD_CAP = 32;
const WORD_VIEW_BOX = `0 0 ${WORD_WIDTH} ${WORD_HEIGHT}`;
const WORD_LETTERS: readonly (readonly string[])[] = [
  // L
  ['M0 5.5A1.5 1.5 0 0 1 1.5 4L5.5 4A1.5 1.5 0 0 1 7 5.5L7 29L16.5 29A1.5 1.5 0 0 1 18 30.5L18 34.5A1.5 1.5 0 0 1 16.5 36L4 36A4 4 0 0 1 0 32Z'],
  // U
  ['M23.5 4H27.5A1.5 1.5 0 0 1 29 5.5V23.5A6.5 6.5 0 0 0 42 23.5V5.5A1.5 1.5 0 0 1 43.5 4H47.5A1.5 1.5 0 0 1 49 5.5V23.5A13.5 13.5 0 0 1 22 23.5V5.5A1.5 1.5 0 0 1 23.5 4Z'],
  // M
  ['M56.5 5.5A1.5 1.5 0 0 1 58 4L64.27 4A1 1 0 0 1 65.17 4.57L73.96 22.87A.6 .6 0 0 0 75.04 22.87L83.83 4.57A1 1 0 0 1 84.73 4L91 4A1.5 1.5 0 0 1 92.5 5.5L92.5 34.5A1.5 1.5 0 0 1 91 36L87 36A1.5 1.5 0 0 1 85.5 34.5L85.5 15.87L76.06 35.55A.8 .8 0 0 1 75.34 36L73.66 36A.8 .8 0 0 1 72.94 35.55L63.5 15.87L63.5 34.5A1.5 1.5 0 0 1 62 36L58 36A1.5 1.5 0 0 1 56.5 34.5Z'],
  // I
  ['M100 5.5A1.5 1.5 0 0 1 101.5 4L105.5 4A1.5 1.5 0 0 1 107 5.5L107 34.5A1.5 1.5 0 0 1 105.5 36L101.5 36A1.5 1.5 0 0 1 100 34.5Z'],
  // Q: a whole ring whose outer edge gives way round the dot, then the dot,
  // its tail. The dot hangs below the line, so the letter never reads as an O.
  [
    'M136.53 35.9A17 17 0 1 1 146.4 26.03A1.5 1.5 0 0 1 144.99 27A7.5 7.5 0 0 0 137.5 34.49A1.5 1.5 0 0 1 136.53 35.9ZM140.5 20A10 10 0 1 0 120.5 20A10 10 0 1 0 140.5 20Z',
    'M150 34.5A5 5 0 1 1 140 34.5A5 5 0 0 1 150 34.5Z',
  ],
];

// The parts, for the launch moment, which moves them one by one. Everything
// else uses the components below.
export const LOGO_ART = {
  mark: {
    // The side of the grid every number below is measured on.
    box: MARK_48.box,
    l: MARK_48.l,
    sun: MARK_48.sun,
    // The sun's centre and radius, in the drawing's own box.
    sunX: 29,
    sunY: 19,
    sunRadius: 8,
    // The tile: its corner as a part of its width, how far the drawing's box
    // is moved on it, and the viewBox that shows the drawing so placed in a
    // tile-sized view.
    tileRadius: TILE_RADIUS,
    tileShiftX: TILE_48.x,
    tileShiftY: TILE_48.y,
    tileViewBox: `${-TILE_48.x} ${-TILE_48.y} ${TILE_48.tile} ${TILE_48.tile}`,
  },
  wordmark: {
    viewBox: WORD_VIEW_BOX,
    width: WORD_WIDTH,
    height: WORD_HEIGHT,
    capHeight: WORD_CAP,
    // One list of paths per letter, in reading order. The Q holds two: its
    // ring and its dot, which move as one letter.
    letters: WORD_LETTERS,
  },
} as const;

// --- Sizes ---------------------------------------------------------------------

export type LogoSize = 'sm' | 'md' | 'lg';

// The mark, as the side of its box (on a tile, the side of the tile): the
// smallest tile, the tile of the app header, the tile of lockup.svg.
const MARK_SIDE: Record<LogoSize, number> = { sm: 24, md: 32, lg: 48 };
// The name, as the height of its letters: the smallest (the app header's),
// the name of lockup.svg, and the size it is drawn at (the launch).
const WORD_CAP_HEIGHT: Record<LogoSize, number> = { sm: 16, md: 24, lg: 32 };

// One lockup, one ratio, at every size: the tile, a gap of 14 of the tile's
// 48 units, then the name with letters half as high as the tile.
const LOCKUP_GAP = 14 / 48;
const LOCKUP_CAP = 1 / 2;

// Nothing is drawn smaller than this (brand spec, section 2, rule 5).
const MIN_TILE = 24;
const MIN_MARK = 16;
const MIN_CAP = 16;

// --- Shared props --------------------------------------------------------------

// color  the form the app uses, in both themes: the mark on its blue tile with
//        the sun lit, the name in ink.
// mono   one colour and no tile, for where the tile cannot go: ink, or
//        `color`.
export type LogoTone = 'color' | 'mono';

type SharedProps = {
  // What a screen reader says: the app's name. Without it the logo is
  // decoration and stays silent, which is right beside a screen title.
  label?: string;
  // Layout only (alignSelf, a flex). Merged last.
  style?: StyleProp<ViewStyle>;
};

// With a label the logo is one image to a screen reader; without, it is
// hidden from it.
function voice(label: string | undefined) {
  return label === undefined
    ? ({ 'aria-hidden': true } as const)
    : ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: label } as const);
}

// --- Mark ----------------------------------------------------------------------

export type MarkProps = SharedProps & {
  // Default color: on its tile.
  tone?: LogoTone;
  // sm 24, md 32 (the default, the tile of the app header) or lg 48; or a
  // number of dp. It is the side of the mark's box: on a tile, the side of
  // the tile.
  size?: LogoSize | number;
  // For `tone="mono"`: the one colour, a palette colour. Default ink. On
  // paper use ink or actionText; reversed, ground on ink. Never the yellow.
  color?: string;
};

// The mark:
//   <Mark />                             on its tile, 32
//   <Mark size="lg" />                   on its tile, 48
//   <Mark tone="mono" size={16} />       one colour, the 16 drawing
//   <Mark tone="mono" color={colors.actionText} />
export function Mark({ tone = 'color', size = 'md', color, label, style }: MarkProps) {
  const { colors } = useTheme();
  const asked = typeof size === 'number' ? size : MARK_SIDE[size];

  if (tone === 'mono') {
    const side = Math.max(asked, MIN_MARK);
    const art = monoArtFor(side);
    const one = color ?? colors.ink;
    return (
      <View style={[{ width: side, height: side }, style]} {...voice(label)}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${art.box} ${art.box}`} fill="none">
          <Path d={art.l} fill={one} />
          <Path d={art.sun} fill={one} />
        </Svg>
      </View>
    );
  }

  const side = Math.max(asked, MIN_TILE);
  const { tile, art, x, y } = tileArtFor(side);
  // The view is the tile; its viewBox starts where the tile's corner lies in
  // the drawing's own box, so the paths stay exactly as the brand drew them.
  return (
    <View style={[{ width: side, height: side }, style]} {...voice(label)}>
      <Svg width="100%" height="100%" viewBox={`${-x} ${-y} ${tile} ${tile}`} fill="none">
        <Rect x={-x} y={-y} width={tile} height={tile} rx={tile * TILE_RADIUS} fill={brand.tile} />
        <Path d={art.l} fill={brand.onTile} />
        <Path d={art.sun} fill={brand.sun} />
      </Svg>
    </View>
  );
}

// --- Wordmark ------------------------------------------------------------------

export type WordmarkProps = SharedProps & {
  // sm 16, md 24 (the default) or lg 32; or a number of dp. It is the height
  // of the letters. The box is a quarter taller (it holds the tail of the Q)
  // and 4.69 times as wide as the letters are high.
  size?: LogoSize | number;
  // The one colour, a palette colour. Default ink, which is right on paper
  // and on a dark ground. The dot takes it too.
  color?: string;
};

// The name:
//   <Wordmark label={appName} />         letters 24 high
//   <Wordmark size="sm" />               letters 16 high, the smallest
//   <Wordmark color={colors.onLight} />
export function Wordmark({ size = 'md', color, label, style }: WordmarkProps) {
  const { colors } = useTheme();
  const cap = Math.max(typeof size === 'number' ? size : WORD_CAP_HEIGHT[size], MIN_CAP);
  const scale = cap / WORD_CAP;
  const one = color ?? colors.ink;

  return (
    <View style={[{ width: WORD_WIDTH * scale, height: WORD_HEIGHT * scale }, style]} {...voice(label)}>
      <Svg width="100%" height="100%" viewBox={WORD_VIEW_BOX} fill="none">
        {WORD_LETTERS.map((paths, letter) => paths.map((d, part) => <Path key={`${letter}-${part}`} d={d} fill={one} />))}
      </Svg>
    </View>
  );
}

// --- Lockup --------------------------------------------------------------------

export type LockupProps = SharedProps & {
  // Default color: the mark on its tile, the name in ink.
  tone?: LogoTone;
  // md (the default, the app header: tile 32, the name 75 by 20, 9 apart) or
  // lg (lockup.svg: tile 48, the name 112.5 by 30, 14 apart); or a number of
  // dp, the side of the tile. sm, or any tile under 32, is the tile alone at
  // that size: its name would have letters under 16 high, and the brand then
  // uses the tile by itself.
  size?: LogoSize | number;
  // The one colour, a palette colour. Default ink. With `tone="mono"` it is
  // the whole logo; otherwise it is the name, and the tile keeps its own.
  color?: string;
};

// The mark and the name, side by side:
//   <Lockup label={appName} />           the app header
//   <Lockup size="lg" />                 tile 48
//   <Lockup tone="mono" />               one colour, no tile
export function Lockup({ tone = 'color', size = 'md', color, label, style }: LockupProps) {
  const tile = Math.max(typeof size === 'number' ? size : MARK_SIDE[size], MIN_TILE);
  const cap = tile * LOCKUP_CAP;

  // Too small for the name: the tile alone (brand spec, section 2, rule 5).
  if (cap < MIN_CAP) return <Mark tone={tone} size={tile} color={color} label={label} style={style} />;

  // Whole dp: 9 at tile 32 and 14 at tile 48, as the brand's table has them.
  const gap = Math.round(tile * LOCKUP_GAP);
  // Its own width, so it is a box of fixed size like the mark and the name:
  // the screen places it (at the right in Hebrew) and cannot stretch it.
  const width = tile + gap + (WORD_WIDTH * cap) / WORD_CAP;

  return (
    <View style={[styles.lockup, { width, gap }, style]} {...voice(label)}>
      <Mark tone={tone} size={tile} color={color} />
      <Wordmark size={cap} color={color} />
    </View>
  );
}

// --- Logo ----------------------------------------------------------------------

export type LogoVariant = 'lockup' | 'mark' | 'wordmark';

export type LogoProps = SharedProps & {
  // Which part to draw. Default lockup.
  variant?: LogoVariant;
  // The mark and the lockup only: on the tile, or one colour. The name is
  // always one colour.
  tone?: LogoTone;
  // sm, md (the default) or lg, or a number of dp. Each part reads it its own
  // way: see MarkProps, WordmarkProps and LockupProps.
  size?: LogoSize | number;
  // The one colour, a palette colour. Default ink.
  color?: string;
};

// The logo, one name for its three parts:
//   <Logo label={appName} />                   the lockup of the app header
//   <Logo variant="mark" size="lg" />
//   <Logo variant="wordmark" color={colors.actionText} />
export function Logo({ variant = 'lockup', tone, size, color, label, style }: LogoProps) {
  if (variant === 'mark') return <Mark tone={tone} size={size} color={color} label={label} style={style} />;
  if (variant === 'wordmark') return <Wordmark size={size} color={color} label={label} style={style} />;
  return <Lockup tone={tone} size={size} color={color} label={label} style={style} />;
}

const styles = StyleSheet.create({
  // Mark first, then name, in every language: `direction` pins the row so a
  // right-to-left layout cannot mirror it. The name's box is centred on its
  // letters, so centring the box on the tile centres the name.
  lockup: { flexDirection: 'row', alignItems: 'center', direction: 'ltr' },
});
