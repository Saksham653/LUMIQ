import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { brand, useTheme, keepLeftToRight } from '@/theme';

// The lockup of the app header (brand spec, section 2, rule 6): the mark on
// its blue tile at 32, a gap of 9, then the drawn name 75 by 20. Drawn in
// code so it shows before any font or image has loaded.
//
// The drawings are the brand's own and are never edited here:
// - the tile holds the 24 drawing of the mark, its box 5 from the left and 3
//   from the top of a tile of 32 (a small tile never holds the 48 drawing
//   shrunk);
// - the name is wordmark.svg, five paths (one per letter) in a box of 150
//   by 40.
// The sun is yellow only because it sits on the tile. The name is one colour,
// the Q's tail included. Nothing here mirrors in right-to-left languages.

const TILE = 32;
// The corner of the tile: 22.5 percent of its width.
const TILE_CORNER = TILE * 0.225;
// Where the 24 drawing's own box starts inside the tile of 32.
const MARK_X = 5;
const MARK_Y = 3;
const MARK_L =
  'M3.25 2H6.75A1.25 1.25 0 0 1 8 3.25V8A8 8 0 0 0 16 16H20.75A1.25 1.25 0 0 1 22 17.25V20.75A1.25 1.25 0 0 1 20.75 22H5A3 3 0 0 1 2 19V3.25A1.25 1.25 0 0 1 3.25 2Z';
const MARK_SUN = 'M21 8A5 5 0 1 1 11 8A5 5 0 0 1 21 8Z';
// The viewBox starts where the tile's corner lies in the drawing's own box,
// so the paths stay exactly as the brand drew them.
const TILE_VIEW_BOX = `${-MARK_X} ${-MARK_Y} ${TILE} ${TILE}`;

// The name at the size of the app header.
const NAME_WIDTH = 75;
const NAME_HEIGHT = 20;
const NAME_VIEW_BOX = '0 0 150 40';
const NAME_PATHS = [
  // L
  'M0 5.5A1.5 1.5 0 0 1 1.5 4L5.5 4A1.5 1.5 0 0 1 7 5.5L7 29L16.5 29A1.5 1.5 0 0 1 18 30.5L18 34.5A1.5 1.5 0 0 1 16.5 36L4 36A4 4 0 0 1 0 32Z',
  // U
  'M23.5 4H27.5A1.5 1.5 0 0 1 29 5.5V23.5A6.5 6.5 0 0 0 42 23.5V5.5A1.5 1.5 0 0 1 43.5 4H47.5A1.5 1.5 0 0 1 49 5.5V23.5A13.5 13.5 0 0 1 22 23.5V5.5A1.5 1.5 0 0 1 23.5 4Z',
  // M
  'M56.5 5.5A1.5 1.5 0 0 1 58 4L64.27 4A1 1 0 0 1 65.17 4.57L73.96 22.87A.6 .6 0 0 0 75.04 22.87L83.83 4.57A1 1 0 0 1 84.73 4L91 4A1.5 1.5 0 0 1 92.5 5.5L92.5 34.5A1.5 1.5 0 0 1 91 36L87 36A1.5 1.5 0 0 1 85.5 34.5L85.5 15.87L76.06 35.55A.8 .8 0 0 1 75.34 36L73.66 36A.8 .8 0 0 1 72.94 35.55L63.5 15.87L63.5 34.5A1.5 1.5 0 0 1 62 36L58 36A1.5 1.5 0 0 1 56.5 34.5Z',
  // I
  'M100 5.5A1.5 1.5 0 0 1 101.5 4L105.5 4A1.5 1.5 0 0 1 107 5.5L107 34.5A1.5 1.5 0 0 1 105.5 36L101.5 36A1.5 1.5 0 0 1 100 34.5Z',
  // Q: the ring and the tail that crosses it, ending in a round dot, as one
  // shape.
  'M139.79 34.24A17 17 0 1 1 144.74 29.29L148.96 33.51A3.5 3.5 0 0 1 148.96 38.46A3.5 3.5 0 0 1 144.01 38.46ZM139.6 24.15A10 10 0 1 0 134.65 29.1L133.33 27.78A1.5 1.5 0 0 1 133.33 25.66L136.16 22.83A1.5 1.5 0 0 1 138.28 22.83Z',
] as const;

// The mark and the name, side by side:
//   <BrandLockup label="LUMIQ" />
// One image to a screen reader, named by `label`.
export function BrandLockup({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.lockup}>
      <Svg width={TILE} height={TILE} viewBox={TILE_VIEW_BOX} fill="none">
        <Rect x={-MARK_X} y={-MARK_Y} width={TILE} height={TILE} rx={TILE_CORNER} fill={brand.tile} />
        <Path d={MARK_L} fill={brand.onTile} />
        <Path d={MARK_SUN} fill={brand.sun} />
      </Svg>
      <Svg width={NAME_WIDTH} height={NAME_HEIGHT} viewBox={NAME_VIEW_BOX} fill="none">
        {NAME_PATHS.map((d) => (
          <Path key={d} d={d} fill={colors.ink} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mark first, then name, in every language: `direction` pins the row so a
  // right-to-left layout cannot mirror it. 9 between them is the lockup's own
  // gap at this size (brand spec, section 2), not a step of the spacing scale.
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 9, ...keepLeftToRight },
});
