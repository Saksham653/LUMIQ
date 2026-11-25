import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { type CSSAnimationProperties } from 'react-native-reanimated';

import { useAppState } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  border,
  duration,
  lineHeightFor,
  radius,
  rhythm,
  sizes,
  space,
  typeScale,
  useReducedMotion,
  useTheme,
  type Radius,
  type TypeVariant,
  keepLeftToRight,
} from '@/theme';
import { useUIStrings } from '@/ui/strings';

// Placeholders in the shape of what is coming. Loading is never a lone
// spinner: it is the screen's own outline, breathing gently until the real
// thing takes its place.
//
//   <Skeleton style={styles.column}>
//     <SkeletonCard />
//     <SkeletonRow />
//     <SkeletonRow />
//   </Skeleton>
//
// The outermost piece (a Skeleton, or any piece used by itself) is the group:
// it says "Loading" once to a screen reader and breathes for everything inside
// it, so one screen runs one loop however many bars it draws. Pieces inside a
// group are plain still views.

// How faint a placeholder gets at the low point of its breath. Local to the
// skeleton: nothing else in the app breathes this way, so it is not a token.
const BREATH_LOW = 0.5;

// One breath, there and back. The motion tokens have no step for a loop yet,
// so the longest one is used: slow enough to read as waiting, never as
// flashing.
const BREATH = duration.launch;

// A placeholder stays unseen for this long, so a load that is over at once
// never flashes one (the UX brief asks for about 300 ms). The motion tokens
// have no step for it yet; the nearest one is used.
const PATIENCE = duration.sweep;

// Opacity only: nothing moves, and nothing is laid out again. With reduced
// motion there is no loop at all and the shapes stand still.
const BREATHE: CSSAnimationProperties<ViewStyle> = {
  animationName: { '0%': { opacity: 1 }, '50%': { opacity: BREATH_LOW }, '100%': { opacity: 1 } },
  animationDuration: BREATH,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
};

// A line of text is drawn as a bar this much of its font size: about the
// height of a capital letter.
const BAR_OF_TEXT = 0.7;
// The last line of a paragraph stops short, as real text does.
const LAST_LINE: DimensionValue = '62%';
// A row's title and the smaller line under it: uneven, like real words.
const ROW_TITLE: DimensionValue = '56%';
const ROW_DETAIL: DimensionValue = '36%';
// A card's heading takes about half the card.
const CARD_HEADING: DimensionValue = '48%';
// The plot of a bar chart, as drawn on the brand board.
const PLOT = 88;
// The top of a chart bar (brand spec, section 6: this radius belongs to the
// chart and is not a token).
const BAR_TOP = 4;
// How tall each bar stands, as a share of the plot. A fixed pattern that
// ends on its highest bar, so the outline never changes between two draws.
const BAR_HEIGHTS: readonly DimensionValue[] = ['46%', '62%', '38%', '74%', '56%', '100%', '68%', '84%'];

// True inside a group, so a piece knows the group around it already speaks
// and breathes for it.
const InsideSkeleton = createContext(false);

export type SkeletonProps = {
  // Said once, for the whole group. Default: the library's own "Loading".
  // Pass the app's words when it can be more exact ("Opening your file").
  label?: string;
  // How long the group stays unseen before it shows, in ms, so a quick load
  // never flashes a placeholder. It keeps its place the whole time. Pass 0
  // where the placeholder must be the very first frame (the app opening).
  delay?: number;
  // Layout only (a gap, a flex, a width). Merged last.
  style?: StyleProp<ViewStyle>;
  // The pieces, laid out like the content they stand in for.
  children?: ReactNode;
  testID?: string;
};

// What every piece takes for when it is used by itself, outside a group.
type GroupProps = Pick<SkeletonProps, 'label' | 'delay' | 'testID'>;

// A group of placeholders: one "Loading" for a screen reader, one breath for
// everything inside. Lay the pieces out with `style` the way the real content
// will be laid out, so nothing jumps when it arrives.
//
// With reduced motion the shapes are still. A Skeleton inside another one is
// only a layout box.
//
// SkeletonText and SkeletonRow need AppStateProvider above them (they follow
// the line height of the app's language).
export function Skeleton({ label, delay = PATIENCE, style, children, testID }: SkeletonProps) {
  const inside = useContext(InsideSkeleton);
  const strings = useUIStrings();
  const reduced = useReducedMotion();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (inside || delay <= 0) return undefined;
    const timer = setTimeout(() => setWaited(true), delay);
    return () => clearTimeout(timer);
  }, [inside, delay]);

  if (inside) {
    return (
      <View testID={testID} style={style}>
        {children}
      </View>
    );
  }

  const seen = waited || delay <= 0;
  return (
    <InsideSkeleton.Provider value={true}>
      {/* The shapes inside hold no words, so the one label here is all a screen reader meets. */}
      <Animated.View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label ?? strings.loading}
        aria-busy
        testID={testID}
        style={[style, seen ? (reduced ? null : BREATHE) : styles.unseen]}>
        {children}
      </Animated.View>
    </InsideSkeleton.Provider>
  );
}

// One bar or block of a placeholder. A step darker than both the ground and a
// card, so it shows on either, in light and dark.
function Bone({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.surfacePressed }, style]} />;
}

export type SkeletonBlockProps = GroupProps & {
  // Default: the whole width of its parent.
  width?: DimensionValue;
  // Default 48. Give the height of what it stands in for (a numeral's line,
  // a picture, a button).
  height?: number;
  // The corner, by token name. Default control.
  radius?: Radius;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// A plain block: a big number, a picture, a chip, a button.
//   <SkeletonBlock width={160} height={numeralLine.hero} />
//   <SkeletonBlock width={96} height={sizes.target} radius="pill" />
export function SkeletonBlock({
  width = '100%',
  height = sizes.target,
  radius: corner = 'control',
  style,
  ...group
}: SkeletonBlockProps) {
  const { colors } = useTheme();
  return (
    <Skeleton
      {...group}
      style={[{ width, height, borderRadius: radius[corner], backgroundColor: colors.surfacePressed }, style]}
    />
  );
}

export type SkeletonTextProps = GroupProps & {
  // How many lines. Default 3. With more than one, the last stops short.
  lines?: number;
  // The step of the type scale the real text will use. Default body.
  variant?: TypeVariant;
  // How wide the lines run. Default: the whole width of its parent. Give a
  // share for a single short line (a title, a label).
  width?: DimensionValue;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// Lines of text. Each line takes exactly the room a real line of that step
// will take, in the app's language and at the phone's text size, so the
// screen does not shift when the words arrive.
//   <SkeletonText lines={3} />
//   <SkeletonText lines={1} variant="heading" width="50%" />
export function SkeletonText({ lines = 3, variant = 'body', width = '100%', style, ...group }: SkeletonTextProps) {
  const { language } = useAppState();
  const { fontScale } = useWindowDimensions();

  // Real text follows the phone's text size up to the same limit.
  const scale = Math.min(fontScale, MAX_FONT_SCALE);
  const line = Math.round(lineHeightFor(variant, language) * scale);
  const bar = Math.round(typeScale[variant].size * scale * BAR_OF_TEXT);
  const count = Math.max(1, Math.floor(lines));

  return (
    <Skeleton {...group} style={[{ width }, style]}>
      {Array.from({ length: count }, (_, at) => (
        <View key={at} style={[styles.line, { height: line }]}>
          <Bone style={[styles.words, { height: bar, width: count > 1 && at === count - 1 ? LAST_LINE : '100%' }]} />
        </View>
      ))}
    </Skeleton>
  );
}

export type SkeletonRowProps = GroupProps & {
  // The 40 icon tile at the start of the row. Default true.
  leading?: boolean;
  // The title alone, or the title with a smaller line under it. Default 2.
  lines?: 1 | 2;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// A list row: the icon tile, a title and the smaller line under it. At least
// 56 high, like the row it stands in for, and it grows with the text size.
//   <SkeletonRow />
//   <SkeletonRow leading={false} lines={1} />
export function SkeletonRow({ leading = true, lines = 2, style, ...group }: SkeletonRowProps) {
  return (
    <Skeleton {...group} style={[styles.row, style]}>
      {leading ? <Bone style={styles.tile} /> : null}
      <View style={styles.grow}>
        <SkeletonText lines={1} variant="label" width={ROW_TITLE} />
        {lines === 2 ? <SkeletonText lines={1} variant="small" width={ROW_DETAIL} /> : null}
      </View>
    </Skeleton>
  );
}

export type SkeletonCardProps = GroupProps & {
  // A heading line on top. Default true.
  heading?: boolean;
  // Lines of text under the heading. Default 3.
  lines?: number;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
  // Your own pieces, in place of the heading and the lines.
  children?: ReactNode;
};

// A card: the surface, its 1 line edge and its 16 of padding, with a heading
// and a few lines inside, or with the pieces you give it.
//   <SkeletonCard />
//   <SkeletonCard>
//     <SkeletonText lines={1} variant="small" width="40%" />
//     <SkeletonBlock width={160} height={numeralLine.hero} />
//   </SkeletonCard>
export function SkeletonCard({ heading = true, lines = 3, style, children, ...group }: SkeletonCardProps) {
  const { colors } = useTheme();
  return (
    <Skeleton {...group} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>
      {children ?? (
        <>
          {heading ? <SkeletonText lines={1} variant="heading" width={CARD_HEADING} /> : null}
          {lines > 0 ? <SkeletonText lines={lines} /> : null}
        </>
      )}
    </Skeleton>
  );
}

export type SkeletonChartProps = GroupProps & {
  // How many bars. Default 6.
  bars?: number;
  // The height of the plot. Default 88, the plot on the brand board.
  height?: number;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// A bar chart: bars of uneven height standing on the chart's own baseline.
// Like the chart it stands in for, it does not mirror in right-to-left
// languages.
//   <SkeletonChart />
//   <SkeletonChart bars={12} />
export function SkeletonChart({ bars = 6, height = PLOT, style, ...group }: SkeletonChartProps) {
  const { colors } = useTheme();
  const count = Math.max(1, Math.floor(bars));
  return (
    <Skeleton {...group} style={[styles.plot, { height, borderBottomColor: colors.line }, style]}>
      {Array.from({ length: count }, (_, at) => (
        <Bone key={at} style={[styles.bar, { height: BAR_HEIGHTS[at % BAR_HEIGHTS.length] }]} />
      ))}
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  // Still in its place, not yet shown.
  unseen: { opacity: 0 },
  // One line of text: the bar sits in the middle of the line's own height
  // and starts at the reading edge.
  line: { justifyContent: 'center', alignItems: 'flex-start' },
  words: { borderRadius: radius.pill },
  // A list row (brand spec, section 6): at least 56 high, 12 between the tile
  // and the words.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: sizes.row,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  // The icon tile holds an icon, never text, so it may have a fixed size.
  tile: { width: sizes.iconTile, height: sizes.iconTile, borderRadius: radius.control },
  grow: { flex: 1 },
  // A card (brand spec, section 6): radius 20, a 1 line edge, 16 inside, no
  // shadow. Colour is added at render because it changes with the theme.
  card: {
    borderWidth: border.hairline,
    borderRadius: radius.card,
    padding: rhythm.cardPadding,
    gap: space.md,
  },
  // The time axis of a chart never flips, so neither does its outline.
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    borderBottomWidth: border.hairline,
    ...keepLeftToRight,
  },
  bar: { flex: 1, borderTopStartRadius: BAR_TOP, borderTopEndRadius: BAR_TOP },
});
