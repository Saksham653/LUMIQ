import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { border, cascadeMax, space, stagger, useTheme } from '@/theme';
import {
  AxisEnds,
  BAR_CORNER,
  BarRing,
  ChartEmpty,
  DashedRule,
  GrowBar,
  MARK_MIN,
  PLOT_HEIGHT,
  PinnedLabel,
  PlotSurface,
  usePlotWidth,
  useReading,
  type ChartSize,
} from '@/ui/charts/bar-chart';
import { cascadeDelay, clamp, isKnown, linearScale, type Bin } from '@/ui/charts/scale';
import { Skeleton, SkeletonChart, SkeletonText } from '@/ui/skeleton';
import { Txt } from '@/ui/text';

// One bar of the histogram: how many values fall from `from` up to `to`. The
// last bin also holds its upper edge.
export type DistributionBin = Bin;

export type DistributionProps = {
  // The bins, lowest first and touching: each starts where the one before
  // ends. They come from the app's own engine, or from binValues() in
  // scale.ts when the app only has the values.
  bins: readonly DistributionBin[];
  // The median, from the app. The chart marks where it falls and never works
  // it out.
  median?: number | null;
  // The words written at the mark, with the value: "Median 42".
  medianLabel?: string;
  // The app's formatting for a value of the data: the two ends of the axis
  // and the edges of a bin. (value) => numbers.amount(value).
  format: (value: number) => string;
  // The app's formatting for how many values a bin holds. Kept apart from
  // `format`, which may add a currency or a unit that a count must not carry.
  formatCount: (count: number) => string;
  // What the whole chart says, spoken once: "How order sizes are spread.
  // Most are between 30 and 50. The median is 42."
  summary: string;
  // What one bar says to a screen reader. Default: its two edges, then its
  // count. Pass the app's sentence for it ("30 to 40: 3 orders").
  markLabel?: (bin: DistributionBin, index: number) => string;
  // Shown instead of the chart when there are fewer than two bins, or no
  // values in them. Without it nothing is shown at all.
  emptyLabel?: string;
  // The height of the plot: 64, 88 or 132. Default md.
  size?: ChartSize;
  // Bars grow from the baseline once, on arrival. Default true.
  animate?: boolean;
  // The numbers are on their way: an outline of the chart, the same size.
  loading?: boolean;
  // Called when a screen reader or a keyboard moves to another bar.
  onSelect?: (index: number) => void;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The bars of a histogram touch, with only a hairline of paper between them:
// they are one spread, not separate things.
const BIN_GAP = border.strong;

// How a set of values is spread: a histogram with the median marked.
//   <Distribution
//     bins={spread.bins}
//     median={spread.median}
//     medianLabel={t('insights.median', { value: numbers.amount(spread.median) })}
//     format={(value) => numbers.amount(value)}
//     formatCount={(count) => numbers.count(count)}
//     summary={t('insights.spreadSummary')}
//   />
//
// Each bar stands where its values are on the axis and is as tall as its
// count. The median is a 2 dashed `inkFaint` line down the plot with its
// words above it, and the bar it falls in is `chartPeak`; the others are
// `chartRest`. The two ends of the axis carry the lowest and highest edge.
//
// It is a still picture to a finger. To a screen reader, and to a keyboard,
// the plot is one adjustable element like every plot here: a step moves one
// bar, says its range and its count, and rings it. Like every plot it runs
// left to right in every language.
//
// Needs AppStateProvider above it (its text reads the app language).
export function Distribution({
  bins,
  median,
  medianLabel,
  format,
  formatCount,
  summary,
  markLabel,
  emptyLabel,
  size = 'md',
  animate = true,
  loading = false,
  onSelect,
  style,
}: DistributionProps) {
  const { colors } = useTheme();
  const { width, onLayout } = usePlotWidth();
  const count = bins.length;
  const { picked, active, go } = useReading(count, onSelect);

  const height = PLOT_HEIGHT[size];

  if (loading) {
    return (
      <Skeleton style={[styles.root, style]}>
        <SkeletonText lines={1} variant="small" width="36%" />
        <SkeletonChart bars={count >= 2 ? Math.min(count, 12) : 8} height={height} />
        <SkeletonText lines={1} variant="small" />
      </Skeleton>
    );
  }

  const most = bins.reduce((top, bin) => Math.max(top, isKnown(bin.count) ? bin.count : 0), 0);
  const from = count > 0 ? bins[0].from : 0;
  const to = count > 0 ? bins[count - 1].to : 0;
  // One bin is every value in one place: there is no spread to draw.
  if (count < 2 || !(most > 0) || !(to > from)) return <ChartEmpty label={emptyLabel} style={style} />;

  const x = linearScale([from, to], [0, width]);
  // A median outside the bins is not marked at all: it would point at nothing.
  const middle = isKnown(median) && median >= from && median <= to ? median : null;
  const marked = middle !== null;
  // Where the median falls, as a share of the axis: the same before and after
  // the plot has been measured.
  const share = middle !== null ? clamp((middle - from) / (to - from), 0, 1) : 0;
  const holds = (bin: DistributionBin, index: number): boolean =>
    middle !== null && middle >= bin.from && (middle < bin.to || index === count - 1);

  const speak = (index: number): string => {
    const bin = bins[index];
    return markLabel?.(bin, index) ?? `${format(bin.from)} – ${format(bin.to)}, ${formatCount(bin.count)}`;
  };
  // What a screen reader hears first: the bar that holds the median, if one
  // is marked.
  const home = bins.findIndex(holds);
  const at = picked ?? home;

  // How tall a bin stands. A bin with one value among thousands still shows.
  const tallOf = (bin: DistributionBin): number =>
    bin.count > 0 ? Math.min(height, Math.max((bin.count / most) * height, MARK_MIN)) : 0;

  return (
    <View style={[styles.root, style]}>
      {marked && medianLabel !== undefined && medianLabel !== '' ? (
        <PinnedLabel at={share}>
          <Txt variant="small" tone="soft" snug numberOfLines={1}>
            {medianLabel}
          </Txt>
        </PinnedLabel>
      ) : null}
      <PlotSurface
        summary={summary}
        count={count}
        current={at}
        spoken={at >= 0 ? speak(at) : undefined}
        onStep={go}
        // One hairline taller than its bars: the baseline's own room.
        height={height + border.hairline}
        onLayout={onLayout}>
        {width > 0 ? (
          <View aria-hidden style={styles.layer}>
            {bins.map((bin, index) => {
              const left = x(bin.from);
              const wide = Math.max(1, x(bin.to) - left - BIN_GAP);
              return (
                <GrowBar
                  key={index}
                  start={left + BIN_GAP / 2}
                  top={0}
                  width={wide}
                  height={height}
                  grows="up"
                  fill={tallOf(bin) / height}
                  color={holds(bin, index) ? colors.chartPeak : colors.chartRest}
                  corner={Math.min(BAR_CORNER, wide / 2)}
                  delay={cascadeDelay(index, count, stagger, cascadeMax)}
                  animate={animate}
                />
              );
            })}
            <View style={[styles.baseline, { top: height, backgroundColor: colors.line }]} />
            {marked ? (
              <View style={[styles.median, { insetInlineStart: share * width - border.strong / 2 }]}>
                <DashedRule vertical length={height} color={colors.inkFaint} />
              </View>
            ) : null}
            {bins.map((bin, index) => {
              const left = x(bin.from);
              const wide = Math.max(1, x(bin.to) - left - BIN_GAP);
              // An empty bin is ringed where it stands on the baseline.
              const tall = Math.max(tallOf(bin), space.sm);
              return (
                <BarRing
                  key={index}
                  index={index}
                  active={active}
                  start={left + BIN_GAP / 2}
                  top={height - tall}
                  width={wide}
                  height={tall}
                  corner={Math.min(BAR_CORNER, wide / 2)}
                  color={colors.ink}
                />
              );
            })}
          </View>
        ) : null}
      </PlotSurface>
      <AxisEnds first={format(from)} last={format(to)} figures />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  // The drawing. It is silent and never takes a touch.
  layer: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  baseline: { position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, height: border.hairline },
  median: { position: 'absolute', top: 0 },
});
