import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { border, cascadeMax, space, stagger, useTheme } from '@/theme';
import {
  BAR_CORNER,
  ChartEmpty,
  ChartSummary,
  ChartValue,
  GrowBar,
  MARK_MIN,
  MARK_ROLE,
  usePlotWidth,
  type ChartSize,
} from '@/ui/charts/bar-chart';
import { UNKNOWN, cascadeDelay, extent, isKnown, linearScale, maxIndex, withZero } from '@/ui/charts/scale';
import { Skeleton, SkeletonBlock, SkeletonText } from '@/ui/skeleton';
import { Txt } from '@/ui/text';

export type HBarDatum = {
  // The row's name: a group, a place, a product. It may be long.
  label: string;
  // null is "not known": the row keeps its place, shows a dash and no bar.
  value: number | null;
};

export type HBarChartProps = {
  // The rows, in the order they are shown. The chart does not sort: rank them
  // in the app, biggest first, the way the numbers were worked out.
  data: readonly HBarDatum[];
  // The app's own number formatting: (value) => numbers.amount(value).
  format: (value: number) => string;
  // What the whole chart says, spoken once: "Revenue by category. Grocery has
  // the most, 2.39 M."
  summary: string;
  // What one row says to a screen reader. Default: its name, then its value.
  markLabel?: (datum: HBarDatum, index: number) => string;
  // Shown instead of the chart when fewer than two values are known. Without
  // it nothing is shown at all.
  emptyLabel?: string;
  // The one row painted in the chart's blue and written in heavier ink. Left
  // out: the highest row, if one row is the highest alone. null: none.
  peakIndex?: number | null;
  // How thick the bars are: 8, 12 or 16. Default md.
  size?: ChartSize;
  // Bars grow from the start edge once, on arrival. Default true.
  animate?: boolean;
  // The numbers are on their way: an outline of the rows, the same size.
  loading?: boolean;
  // What stands for a value that is not known. Default a dash. Pass the
  // app's words ("no value") if it should be spoken as words.
  missing?: string;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// How thick a bar is. They are steps of the spacing scale.
const THICKNESS: Record<ChartSize, number> = { sm: space.sm, md: space.md, lg: space.lg };

// The outline shown while loading: rows that get shorter, like a ranking.
const OUTLINE_NAMES: readonly DimensionValue[] = ['46%', '34%', '52%', '28%'];
const OUTLINE_BARS: readonly DimensionValue[] = ['100%', '72%', '48%', '30%'];

// Ranked horizontal bars, for "top groups":
//   <HBarChart
//     data={chart.bars}
//     format={(value) => numbers.amount(value)}
//     summary={t('insights.groupsSummary')}
//   />
//
// Every row writes its name and its value above its bar, so long names and
// numbers stay readable on a phone and nothing has to be touched to be read.
// A long name wraps and its row grows; it is never cut.
// The highest row is `chartPeak` and heavier; the others are `chartRest`.
//
// A ranking has no time axis, so it mirrors with the layout: in right-to-left
// languages the names start at the right and the bars grow from the right.
// Values below zero grow the other way from a shared zero line.
//
// Needs AppStateProvider above it (its text reads the app language).
export function HBarChart({
  data,
  format,
  summary,
  markLabel,
  emptyLabel,
  peakIndex,
  size = 'md',
  animate = true,
  loading = false,
  missing = UNKNOWN,
  style,
}: HBarChartProps) {
  const { colors } = useTheme();
  const { width, onLayout } = usePlotWidth();

  const count = data.length;
  const thick = THICKNESS[size];
  const values = data.map((datum) => datum.value);
  const known = values.filter(isKnown);

  if (loading) {
    const rows = count >= 2 ? Math.min(count, 6) : 4;
    return (
      <Skeleton style={[styles.root, style]}>
        {Array.from({ length: rows }, (_, at) => (
          <View key={at} style={styles.row}>
            <SkeletonText lines={1} variant="small" width={OUTLINE_NAMES[at % OUTLINE_NAMES.length]} />
            <SkeletonBlock height={thick} width={OUTLINE_BARS[Math.min(at, OUTLINE_BARS.length - 1)]} radius="pill" />
          </View>
        ))}
      </Skeleton>
    );
  }
  // One value has nothing to stand beside. Say so in words instead.
  if (known.length < 2) return <ChartEmpty label={emptyLabel} style={style} />;

  // Bars are read by their length, so the scale always holds zero.
  const span = withZero(extent(known) ?? [0, 0]);
  const x = linearScale(span[0] === span[1] ? [0, 1] : span, [0, width]);
  const zero = x(0);
  const mixed = span[0] < 0 && span[1] > 0;

  const sole = maxIndex(values, true);
  const peak =
    peakIndex === undefined
      ? sole
      : peakIndex !== null && peakIndex >= 0 && peakIndex < count && isKnown(values[peakIndex])
        ? peakIndex
        : -1;

  const speak = (index: number): string => {
    const datum = data[index];
    return markLabel?.(datum, index) ?? `${datum.label}, ${isKnown(datum.value) ? format(datum.value) : missing}`;
  };

  return (
    <View onLayout={onLayout} style={[styles.root, style]}>
      <ChartSummary label={summary} />
      {data.map((datum, index) => {
        const value = datum.value;
        const strong = index === peak;
        const back = isKnown(value) && value < 0;
        // The bar's room: from the zero line to the edge on its own side.
        const room = back ? zero : width - zero;
        const reach = isKnown(value) && value !== 0 ? Math.max(Math.abs(x(value) - zero), MARK_MIN) : 0;
        return (
          <View key={index} accessible accessibilityLabel={speak(index)} role={MARK_ROLE} style={styles.row}>
            <View style={styles.words}>
              <Txt
                variant="small"
                tone={strong ? 'ink' : 'soft'}
                weight={strong ? '600' : undefined}
                style={styles.grow}>
                {datum.label}
              </Txt>
              {isKnown(value) ? (
                <ChartValue text={format(value)} strong={strong} />
              ) : (
                <Txt variant="small" tone="soft" snug>
                  {missing}
                </Txt>
              )}
            </View>
            <View style={{ height: thick }}>
              {width > 0 && reach > 0 && room > 0 ? (
                <GrowBar
                  start={back ? 0 : zero}
                  top={0}
                  width={room}
                  height={thick}
                  grows={back ? 'back' : 'forward'}
                  fill={Math.min(1, reach / room)}
                  color={strong ? colors.chartPeak : colors.chartRest}
                  corner={Math.min(BAR_CORNER, thick / 2)}
                  delay={cascadeDelay(index, count, stagger, cascadeMax)}
                  animate={animate}
                />
              ) : null}
              {/* With values on both sides of zero, the line they share. */}
              {width > 0 && mixed ? (
                <View style={[styles.zero, { insetInlineStart: zero, backgroundColor: colors.line }]} />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  row: { gap: space.xs },
  // The name takes the room that is left and wraps; the value keeps to its
  // own words at the end of the row.
  words: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  grow: { flex: 1 },
  zero: { position: 'absolute', top: 0, bottom: 0, width: border.hairline },
});
