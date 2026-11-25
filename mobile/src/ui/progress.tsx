import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type CSSAnimationProperties,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { duration, radius, sizes, space, timing, transition, useIsRTL, useReducedMotion, useTheme, keepLeftToRight } from '@/theme';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

// How far along a piece of real work is: a bar or a ring.
//
//   <ProgressBar value={rowsRead / rowsInFile} label={t('import.reading')} valueText={t('import.rowsRead', { n })} />
//   <ProgressBar label={t('import.copying')} />            the amount is not known: it sweeps
//   <ProgressRing value={0.64} size="lg"><Icon name="file" /></ProgressRing>
//
// The value is a real count, never a timer made to look like one. An amount
// that is not known is never drawn as zero: the bar sweeps, and the ring is
// drawn in dashes, a shape of its own that no amount can take.

// ink     heavier ink on the sunk track: the default, and the proof thread of
//         a story.
// action  the action blue, where the bar sits beside the thing it belongs to.
// Never the yellow: that is kept for a number the phone has checked.
export type ProgressTone = 'ink' | 'action';
export type ProgressSize = 'sm' | 'md' | 'lg';

type ProgressCommon = {
  // How far along, from 0 to 1. Leave it out (or pass null) while the amount
  // is not known.
  value?: number | null;
  // What is happening, in the app's words ("Reading rows"). A screen reader
  // says it. Default: the library's own "Loading".
  label?: string;
  // The amount in the app's own words and number style ("319 of 1,200 rows").
  // A screen reader says it in place of the percentage.
  valueText?: string;
  // Default ink.
  tone?: ProgressTone;
  // Bar: 4, 8 or 12 thick. Ring: 24, 40 or 64 across. Default md.
  size?: ProgressSize;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type ProgressBarProps = ProgressCommon;

export type ProgressRingProps = ProgressCommon & {
  // Drawn in the middle of the ring: an icon, a short figure. A screen
  // reader hears the label and the value, not this.
  children?: ReactNode;
};

export type ProgressProps = ({ variant?: 'bar' } & ProgressBarProps) | ({ variant: 'ring' } & ProgressRingProps);

// The bar's thickness: steps of the spacing scale.
const BAR: Record<ProgressSize, number> = { sm: space.xs, md: space.sm, lg: space.md };

// The ring's box and its line. sm sits where an icon sits and md where a
// row's icon tile sits; lg stands by itself with something in its middle.
// The 64 box and the three line widths (about a tenth of the box) belong to
// this component alone, so they are named here and are not tokens.
const RING: Record<ProgressSize, { box: number; line: number }> = {
  sm: { box: sizes.icon, line: 3 },
  md: { box: sizes.iconTile, line: 4 },
  lg: { box: 64, line: 6 },
};

// While the amount is not known, a stretch of the bar this wide (a share of
// the track, in percent) crosses it again and again.
const SWEEP_SHARE = 38;
const SWEEP_WIDTH: DimensionValue = `${SWEEP_SHARE}%`;
// One crossing. The motion tokens have no step for a loop yet, so the longest
// one is used.
const SWEEP_TIME = duration.launch;
// A percent translation is of the stretch's own width: it starts just off
// the start edge and ends just past the far one. The track cuts off the rest.
const SWEEP: CSSAnimationProperties<ViewStyle> = {
  animationName: {
    from: { transform: [{ translateX: '-100%' }] },
    to: { transform: [{ translateX: `${Math.ceil(10000 / SWEEP_SHARE)}%` }] },
  },
  animationDuration: SWEEP_TIME,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
};

// While the amount is not known the ring is drawn in dashes: the brand's own
// sign for "not here yet" (the dashed rows of the empty sheet in its
// drawings). A dash and the gap after it together take about this many line
// widths; the count is rounded, so the last dash meets the first.
const RING_DASH_PITCH = 4;
// The dashed ring breathes for as long as the work takes, down to this and
// back. Opacity only: nothing turns. Local to this ring, so it is not a
// token.
const RING_BREATH_LOW = 0.5;
const RING_BREATHE: CSSAnimationProperties<ViewStyle> = {
  animationName: { '0%': { opacity: 1 }, '50%': { opacity: RING_BREATH_LOW }, '100%': { opacity: 1 } },
  animationDuration: SWEEP_TIME,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
};

// The amount as a number from 0 to 1, or null when it is not known. Not
// known is never turned into zero.
function amountOf(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.min(Math.max(value, 0), 1);
}

type SpokenProps = Pick<
  ViewProps,
  | 'accessible'
  | 'accessibilityRole'
  | 'accessibilityLabel'
  | 'aria-busy'
  | 'aria-valuemin'
  | 'aria-valuemax'
  | 'aria-valuenow'
  | 'aria-valuetext'
>;

// What a screen reader meets: one progress bar with a name, and a value only
// when there is one.
function spoken(label: string, amount: number | null, valueText: string | undefined): SpokenProps {
  return {
    accessible: true,
    accessibilityRole: 'progressbar',
    accessibilityLabel: label,
    'aria-busy': amount === null || amount < 1,
    'aria-valuemin': amount === null ? undefined : 0,
    'aria-valuemax': amount === null ? undefined : 100,
    'aria-valuenow': amount === null ? undefined : Math.round(amount * 100),
    'aria-valuetext': valueText,
  };
}

// A bar that fills from the reading edge.
//
// With a value it fills by scale alone, on the UI thread, and eases to each
// new value from wherever it is. Without one, a stretch of it sweeps across
// for as long as the work takes.
//
// With reduced motion the fill jumps to its value. A sweep that stood still
// would look like a measure, so the words stand in for it: the label is shown
// as a still line where the bar would be (brand spec, section 8).
//
// It is as wide as its parent. In a row, give it `flex: 1` so it shares the
// row with its neighbours. That still line is text, so the bar needs
// AppStateProvider above it.
export function ProgressBar({ value, label, valueText, tone = 'ink', size = 'md', style, testID }: ProgressBarProps) {
  const { colors } = useTheme();
  const strings = useUIStrings();
  const reduced = useReducedMotion();
  const rtl = useIsRTL();

  const amount = amountOf(value);
  const words = label ?? strings.loading;
  const ink = tone === 'action' ? colors.action : colors.ink;

  if (amount === null && reduced) {
    return (
      <View {...spoken(words, amount, valueText)} testID={testID} style={style}>
        <Txt variant="small" tone="soft">
          {words}
        </Txt>
      </View>
    );
  }

  return (
    <View
      {...spoken(words, amount, valueText)}
      testID={testID}
      style={[styles.track, { height: BAR[size], backgroundColor: colors.surfaceSunk }, rtl && styles.mirrored, style]}>
      {amount === null ? (
        <Animated.View style={[styles.stretch, { backgroundColor: ink }, SWEEP]} />
      ) : (
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: ink, transform: [{ scaleX: amount }] },
            transition(['transform'], duration.sweep, 'standard', reduced),
          ]}
        />
      )}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// A ring that fills clockwise from the top, in every language.
//
// The stroke eases to each new value on the UI thread; with reduced motion it
// jumps. Three forms, told apart by shape and not only by movement:
//   nothing yet   the empty track
//   some of it    the track with the stroke on it
//   not known     a ring of dashes, breathing while the work goes on
// It never spins. With reduced motion the dashes stand still: they say "not
// known" by themselves, and the label says what is happening.
//
// It does not grow with the text size (like an icon), and what you put in
// its middle is for the eye only.
export function ProgressRing({
  value,
  label,
  valueText,
  tone = 'ink',
  size = 'md',
  style,
  testID,
  children,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const strings = useUIStrings();
  const reduced = useReducedMotion();

  const amount = amountOf(value);
  const target = amount ?? 0;
  const { box, line } = RING[size];
  const centre = box / 2;
  const reach = (box - line) / 2;
  const around = 2 * Math.PI * reach;
  const ink = tone === 'action' ? colors.action : colors.ink;

  // The dashes of the "not known" ring: a whole number of them, each with a
  // gap as long as itself. A round end adds half a line to each end of a
  // dash, so the drawn part is a line shorter than it looks.
  const pitch = around / Math.max(1, Math.round(around / (line * RING_DASH_PITCH)));
  const dash = Math.max(pitch / 2 - line, 0);

  // Starts where it stands, so a ring that mounts with a value does not draw
  // itself in: nothing moves unless the amount has changed.
  const drawn = useSharedValue(target);

  useEffect(() => {
    drawn.set(withTiming(target, timing(duration.sweep, 'standard', reduced)));
  }, [drawn, target, reduced]);

  const arc = useAnimatedProps(() => ({
    strokeDashoffset: around * (1 - drawn.get()),
  }));

  return (
    <View
      {...spoken(label ?? strings.loading, amount, valueText)}
      testID={testID}
      style={[{ width: box, height: box }, style]}>
      {/* Only the drawing breathes; what sits in the middle stays as it is. */}
      <Animated.View style={amount === null && !reduced ? RING_BREATHE : null}>
        <Svg width={box} height={box} style={styles.fromTop}>
          {amount === null ? (
            <Circle
              cx={centre}
              cy={centre}
              r={reach}
              stroke={ink}
              strokeWidth={line}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${pitch - dash}`}
              fill="none"
            />
          ) : (
            <>
              <Circle cx={centre} cy={centre} r={reach} stroke={colors.surfaceSunk} strokeWidth={line} fill="none" />
              <AnimatedCircle
                cx={centre}
                cy={centre}
                r={reach}
                stroke={ink}
                strokeWidth={line}
                // A round end on an arc of no length would draw a dot at the
                // top and say "a little" where the truth is "nothing yet".
                strokeLinecap={target > 0 ? 'round' : 'butt'}
                fill="none"
                strokeDasharray={`${around} ${around}`}
                animatedProps={arc}
              />
            </>
          )}
        </Svg>
      </Animated.View>
      {children === undefined || children === null ? null : <View style={styles.middle}>{children}</View>}
    </View>
  );
}

// One name for both shapes, for a caller that picks the shape from data:
//   <Progress value={0.4} />
//   <Progress variant="ring" value={0.4} size="sm" />
export function Progress(props: ProgressProps) {
  return props.variant === 'ring' ? <ProgressRing {...props} /> : <ProgressBar {...props} />;
}

const styles = StyleSheet.create({
  // As wide as its parent (a width, not a stretch, so a row can still centre
  // it against its neighbours). Inside the track everything is written left
  // to right; a right-to-left language mirrors the track as a whole (below),
  // so the fill and the sweep start from the reading edge without a second
  // set of numbers.
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.pill,
    ...keepLeftToRight,
  },
  mirrored: { transform: [{ scaleX: -1 }] },
  // Absolutely placed and childless: scaling it lays nothing out again. The
  // track's round corners cut its start; its leading edge stays straight.
  fill: { ...StyleSheet.absoluteFill, transformOrigin: 'left' },
  stretch: { position: 'absolute', top: 0, bottom: 0, start: 0, width: SWEEP_WIDTH },
  // The circle's own path starts at three o'clock; turned back a quarter, it
  // starts at the top.
  fromTop: { transform: [{ rotate: '-90deg' }] },
  // Over the ring, in its middle. Never takes a touch.
  middle: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
});
