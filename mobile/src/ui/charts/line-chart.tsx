import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { border, duration, easing, space, useTheme } from '@/theme';
import {
  AverageRule,
  AxisEnds,
  ChartEmpty,
  ChartValue,
  NARROW_COLUMN,
  PLOT_HEIGHT,
  PinnedLabel,
  PlotSurface,
  RULE_DASH,
  ReadOut,
  TICK_MIN,
  usePlotWidth,
  useReading,
  type ChartPaper,
  type ChartSize,
} from '@/ui/charts/bar-chart';
import {
  UNKNOWN,
  areaPath,
  extent,
  isKnown,
  linePath,
  linearScale,
  maxIndex,
  minIndex,
  pointLayout,
  pointX,
  withZero,
  type Domain,
  type XY,
} from '@/ui/charts/scale';
import { Skeleton, SkeletonBlock, SkeletonText } from '@/ui/skeleton';

export type LinePoint = {
  // The point's name on the time axis: a month, a date. Shown in the read-out;
  // the first and the last are also written under the plot.
  label: string;
  // null is "not known": the line breaks there. It never dips to zero.
  value: number | null;
  // Not real yet: a value the app has projected. The line reaches it in
  // dashes.
  projected?: boolean;
  // The range the value is expected to fall in. Where both are known the
  // band is drawn between them. Give the last real point low = high = its
  // value and the band opens from the end of the line.
  low?: number | null;
  high?: number | null;
};

export type LineChartProps = {
  // The points, in time order, left to right.
  data: readonly LinePoint[];
  // The app's own number formatting: (value) => numbers.amount(value).
  format: (value: number) => string;
  // What the whole chart says, spoken once: "Revenue for twelve months, from
  // 310 K to 712 K, and the next three months as projected."
  summary: string;
  // What one point says to a screen reader. Default: its name, then what the
  // read-out says about it.
  markLabel?: (point: LinePoint, index: number) => string;
  // What the read-out says about a point, after its name. Default: its
  // formatted value, and `projectedLabel` when it is a projection. It is only
  // asked about a point whose value is known.
  detail?: (point: LinePoint & { value: number }, index: number) => string;
  // The app's word for a value that is not real yet ("projected"). The
  // dashes say it to the eye; this says it in the read-out, under the last
  // point and aloud.
  projectedLabel?: string;
  // Shown in the read-out until the line has been touched: "Drag along the
  // line to read it."
  hint?: string;
  // Shown instead of the chart when fewer than two values are known. Without
  // it nothing is shown at all.
  emptyLabel?: string;
  // The value a dashed line is drawn at, and the words written on it. The
  // value comes from the app: the chart does not work it out.
  average?: number | null;
  averageLabel?: string;
  // Where the scale starts. `zero` (the default) keeps zero in the picture,
  // so a rise looks as big as it is. `fit` starts at the lowest value, for
  // numbers that never come near zero; the lowest and highest points carry
  // their values in words either way.
  baseline?: 'zero' | 'fit';
  // The first and the last point carry their values under their names.
  // Default true. (An end that is also the highest or the lowest point is
  // already labelled and is not written twice.)
  endValues?: boolean;
  // The spoken names of the previous and next buttons, which join the
  // read-out when the points are too close to aim at ("Previous point",
  // "Next point"). Left out, each button is named after the point it goes to.
  previousLabel?: string;
  nextLabel?: string;
  // The height of the plot: 64, 88 or 132. Default md.
  size?: ChartSize;
  // The paper the chart is drawn on. Default surface (a card).
  paper?: ChartPaper;
  // Whether a finger can read the line. Default true; it needs a
  // GestureHandlerRootView above it. false draws a still picture with no
  // read-out; a screen reader can still step through its points.
  interactive?: boolean;
  // The drawing fades in once, on arrival. Default true.
  animate?: boolean;
  // The numbers are on their way: an outline of the chart, the same size.
  loading?: boolean;
  // Called when another point is read.
  onSelect?: (index: number) => void;
  // What stands for a value that is not known. Default a dash. Pass the
  // app's words ("no value") if it should be spoken as words.
  missing?: string;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The dot on the lowest and the highest point: radius 4, with a 2 ring of
// paper round it so it stands clear of the line. These belong to this chart.
const DOT = 4;
const DOT_REACH = DOT + border.strong;

// The drawing arrives as a change of opacity: nothing travels, and it is kept
// when the phone asks for less motion (Reanimated then shows it at once).
const ARRIVE = FadeIn.duration(duration.quick).easing(easing.standard);

type LineCursorProps = {
  active: SharedValue<number>;
  // Where each point is. A y below zero is a point with no value.
  xs: number[];
  ys: number[];
  height: number;
  paper: ChartPaper;
};

// What marks the point being read: a faint line down the plot and a ring of
// ink on the point itself. Both follow the finger on the UI thread, moved by
// a transform, and jump from point to point (there is no value between two
// points to glide over).
function LineCursor({ active, xs, ys, height, paper }: LineCursorProps) {
  const { colors } = useTheme();
  const count = xs.length;
  const line = useAnimatedStyle<ViewStyle>(() => {
    const index = active.get();
    const on = index >= 0 && index < count;
    return { opacity: on ? 1 : 0, transform: [{ translateX: on ? xs[index] : 0 }] };
  });
  const ring = useAnimatedStyle<ViewStyle>(() => {
    const index = active.get();
    const on = index >= 0 && index < count && ys[index] >= 0;
    return {
      opacity: on ? 1 : 0,
      transform: [{ translateX: on ? xs[index] : 0 }, { translateY: on ? ys[index] : 0 }],
    };
  });
  return (
    <View aria-hidden style={styles.layer}>
      <Animated.View style={[styles.cursorLine, { height, backgroundColor: colors.inkFaint }, line]} />
      <Animated.View style={[styles.cursorRing, { backgroundColor: colors[paper], borderColor: colors.ink }, ring]} />
    </View>
  );
}

// A line through time:
//   <LineChart
//     data={forecast.points}
//     format={(value) => numbers.amount(value)}
//     summary={t('forecast.summary')}
//     projectedLabel={t('forecast.projected')}
//     hint={t('forecast.hint')}
//   />
//
// The line is `chartRest`, drawn in straight segments from point to point (a
// curve would draw values nobody measured). Four points are labelled without
// a touch: the highest is `chartPeak` with its value written above the plot,
// the lowest carries its value under it, and the first and the last stand at
// the two ends of the axis with their names and values. Projected points
// continue the line in dashes, and a forecast range is the `chartBand` behind
// it.
//
// Tap the plot, rest a finger on it or drag along it, and the read-out above
// says which point the finger is on, while a ring follows it along the line.
// A drag up or down scrolls the page as usual. When the points are closer
// than 24 the read-out also carries a previous and a next button.
//
// Needs AppStateProvider above it (its text reads the app language) and, when
// interactive, a GestureHandlerRootView.
export function LineChart({
  data,
  format,
  summary,
  markLabel,
  detail,
  projectedLabel,
  hint,
  emptyLabel,
  average,
  averageLabel,
  baseline = 'zero',
  endValues = true,
  previousLabel,
  nextLabel,
  size = 'md',
  paper = 'surface',
  interactive = true,
  animate = true,
  loading = false,
  onSelect,
  missing = UNKNOWN,
  style,
}: LineChartProps) {
  const { colors } = useTheme();
  const { width, onLayout } = usePlotWidth();
  const count = data.length;
  const { picked, active, choose, go } = useReading(count, onSelect);

  const height = PLOT_HEIGHT[size];
  const values = data.map((point) => point.value);
  const known = values.filter(isKnown);

  if (loading) {
    return (
      <Skeleton style={[styles.root, style]}>
        {interactive ? <SkeletonText lines={1} variant="small" width="44%" /> : null}
        <SkeletonBlock height={height} />
        <SkeletonText lines={1} variant="small" />
      </Skeleton>
    );
  }
  // One point is not a line. Say so in words instead.
  if (known.length < 2) return <ChartEmpty label={emptyLabel} style={style} />;

  const projected = (index: number): boolean => data[index].projected === true;
  // A range is drawn only where both of its edges are known.
  const ranged = (index: number): boolean => isKnown(data[index].low) && isKnown(data[index].high);

  // The scale holds everything that is drawn: the values, the range round
  // them and the average.
  const drawn: number[] = [...known];
  data.forEach((point, index) => {
    if (ranged(index)) drawn.push(point.low as number, point.high as number);
  });
  if (isKnown(average)) drawn.push(average);
  const reach: Domain = extent(drawn) ?? [0, 0];
  const span: Domain = baseline === 'zero' ? withZero(reach) : reach;
  // Zero sits on the axis itself. Any other floor leaves room for a dot.
  const foot = span[0] === 0 ? 0 : DOT_REACH;
  const y = linearScale(span[0] === 0 && span[1] === 0 ? [0, 1] : span, [height - foot, DOT_REACH]);

  const points = pointLayout(count, width, DOT_REACH);
  const xs = data.map((_, index) => pointX(points, index));
  const place = (value: number | null | undefined, index: number): XY | null =>
    isKnown(value) ? { x: xs[index], y: y(value) } : null;

  const solid = linePath(data.map((point, index) => (projected(index) ? null : place(point.value, index))));
  // The dashes start at the last real point before a projection.
  const dashes = linePath(
    data.map((point, index) => {
      if (projected(index)) return place(point.value, index);
      const leads = index + 1 < count && projected(index + 1) && isKnown(data[index + 1].value);
      return leads ? place(point.value, index) : null;
    }),
  );
  const band = areaPath(
    data.map((point, index) => (ranged(index) ? place(point.high, index) : null)),
    data.map((point, index) => (ranged(index) ? place(point.low, index) : null)),
  );

  // The highest and lowest are looked for among real values: a projection is
  // never called the peak. With nothing real, all values are looked at.
  const real = values.map((value, index) => (projected(index) ? null : value));
  const measured = real.some(isKnown) ? real : values;
  const top = maxIndex(measured);
  const bottom = minIndex(measured);
  // A flat line has no lowest point apart from its highest.
  const low = top >= 0 && bottom >= 0 && values[top] !== values[bottom] ? bottom : -1;
  let latest = -1;
  for (let index = count - 1; index >= 0 && latest < 0; index--) {
    if (isKnown(measured[index])) latest = index;
  }

  // A value as the chart writes it by itself: the app's number, and the app's
  // word for "not real yet" where that applies.
  const written = (index: number): string => {
    const value = values[index];
    if (!isKnown(value)) return missing;
    const text = format(value);
    return projected(index) && projectedLabel !== undefined ? `${text}, ${projectedLabel}` : text;
  };
  const describe = (index: number): string => {
    const point = data[index];
    const value = point.value;
    if (!isKnown(value)) return missing;
    return detail?.({ ...point, value }, index) ?? written(index);
  };
  const speak = (index: number): string => markLabel?.(data[index], index) ?? `${data[index].label}, ${describe(index)}`;
  // What an end of the axis carries under its name.
  const ending = (index: number): string | undefined =>
    endValues && index !== top && index !== low ? written(index) : undefined;

  // A drag along close-set points would be a buzz in the hand, so it stays
  // quiet; a finger that lands on a point is always felt.
  const dense = points.step < TICK_MIN;
  const pick = (index: number, moving: boolean) => {
    choose(index, !(moving && dense));
  };

  // What is being read: the point last touched, or the latest real value
  // until then.
  const at = picked ?? latest;
  const touched = picked !== null;

  // Points too close to aim at: the read-out carries a previous and a next
  // button. Each is named by the app, or else after the point it goes to.
  const narrow = width > 0 && points.step < NARROW_COLUMN;
  const before = at < 0 ? count - 1 : at - 1;
  const after = at < 0 ? 0 : at + 1;
  const steps = narrow
    ? {
        previousLabel: previousLabel ?? speak(Math.max(0, before)),
        nextLabel: nextLabel ?? speak(Math.min(count - 1, after)),
        // The button gave its tap at contact, so the step itself is silent.
        onPrevious: before >= 0 ? () => go(before, false) : undefined,
        onNext: after <= count - 1 ? () => go(after, false) : undefined,
      }
    : undefined;

  const marks =
    width > 0 ? (
      <>
        <Animated.View aria-hidden entering={animate ? ARRIVE : undefined} style={styles.layer}>
          {/* A little taller than the plot, so a dot on the axis is not cut. */}
          <Svg width={width} height={height + DOT_REACH}>
            {band !== '' ? <Path d={band} fill={colors.chartBand} /> : null}
            {span[0] < 0 && span[1] > 0 ? (
              <Line x1={0} y1={y(0)} x2={width} y2={y(0)} stroke={colors.line} strokeWidth={border.hairline} />
            ) : null}
            {solid !== '' ? (
              <Path
                d={solid}
                stroke={colors.chartRest}
                strokeWidth={border.strong}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
            {dashes !== '' ? (
              <Path
                d={dashes}
                stroke={colors.chartRest}
                strokeWidth={border.strong}
                strokeDasharray={RULE_DASH}
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
            {low >= 0 ? (
              <Circle
                cx={xs[low]}
                cy={y(values[low] as number)}
                r={DOT}
                fill={colors.chartRest}
                stroke={colors[paper]}
                strokeWidth={border.strong}
              />
            ) : null}
            {top >= 0 ? (
              <Circle
                cx={xs[top]}
                cy={y(values[top] as number)}
                r={DOT}
                fill={colors.chartPeak}
                stroke={colors[paper]}
                strokeWidth={border.strong}
              />
            ) : null}
          </Svg>
          <View style={[styles.axisLine, { top: height, backgroundColor: colors.line }]} />
          {isKnown(average) ? (
            <AverageRule
              y={y(average)}
              width={width}
              height={height + border.hairline}
              label={averageLabel}
              paper={paper}
            />
          ) : null}
        </Animated.View>
        <LineCursor
          active={active}
          xs={xs}
          ys={values.map((value) => (isKnown(value) ? y(value) : -1))}
          height={height}
          paper={paper}
        />
      </>
    ) : null;

  // Before the plot has been measured the labels stand where they will be,
  // near enough.
  const share = (index: number): number => (width > 0 ? xs[index] / width : count > 1 ? index / (count - 1) : 0.5);

  return (
    <View style={[styles.root, style]}>
      {interactive ? (
        <ReadOut
          name={at >= 0 ? data[at].label : undefined}
          detail={at >= 0 ? describe(at) : undefined}
          hint={touched ? undefined : hint}
          steps={steps}
        />
      ) : null}
      {top >= 0 ? (
        <PinnedLabel at={share(top)}>
          <ChartValue text={format(values[top] as number)} variant="label" strong />
        </PinnedLabel>
      ) : null}
      <PlotSurface
        summary={summary}
        count={count}
        current={at}
        spoken={at >= 0 ? speak(at) : undefined}
        onStep={go}
        // One hairline taller than its drawing: the axis line's own room.
        height={height + border.hairline}
        scrub={
          interactive ? { step: points.step, inset: points.inset, snap: 'point', active, onPick: pick } : undefined
        }
        onLayout={onLayout}>
        {marks}
      </PlotSurface>
      {low >= 0 ? (
        <PinnedLabel at={share(low)}>
          <ChartValue text={format(values[low] as number)} tone="soft" />
        </PinnedLabel>
      ) : null}
      <AxisEnds
        first={data[0].label}
        last={data[count - 1].label}
        firstValue={ending(0)}
        lastValue={ending(count - 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  // The drawing. It is silent and never takes a touch.
  layer: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  axisLine: { position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, height: border.hairline },
  // Both stand at the plot's top left corner and are moved onto the point.
  cursorLine: { position: 'absolute', top: 0, insetInlineStart: -border.control / 2, width: border.control },
  cursorRing: {
    position: 'absolute',
    top: -DOT_REACH,
    insetInlineStart: -DOT_REACH,
    width: DOT_REACH * 2,
    height: DOT_REACH * 2,
    borderRadius: DOT_REACH,
    borderWidth: border.strong,
  },
});
