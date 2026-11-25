import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { border, useTheme } from '@/theme';
import { ChartEmpty, MARK_MIN, usePlotWidth, type ChartPaper, type ChartSize } from '@/ui/charts/bar-chart';
import {
  bandLayout,
  bandStart,
  extent,
  isKnown,
  linePath,
  linearScale,
  maxIndex,
  pointLayout,
  pointX,
  withZero,
  type Domain,
} from '@/ui/charts/scale';

export type SparklineVariant = 'line' | 'bars';

export type SparklineProps = {
  // The values, in time order. null is "not known": a gap, never a zero.
  values: readonly (number | null)[];
  // A line (the default), or the small bars of the Home hero.
  variant?: SparklineVariant;
  // How tall it is: 24, 40 or 56. Default md. It is as wide as its parent
  // lays it out; in a row, give it `flex: 1` or a width.
  size?: ChartSize;
  // The one mark painted in the chart's blue: the highest value (if one
  // value is the highest alone), the latest value, or none. Default max.
  emphasis?: 'max' | 'last' | 'none';
  // Where a line's scale starts. `zero` (the default) keeps zero in the
  // picture, so a rise looks as big as it is; `fit` starts at the lowest
  // value. Bars always start at zero.
  baseline?: 'zero' | 'fit';
  // What it says to a screen reader. Without it the sparkline is decoration
  // and silent: use that when the words beside it already say the same.
  summary?: string;
  // Shown instead of the chart when fewer than two values are known. Without
  // it nothing is shown at all: one point has no shape to draw.
  emptyLabel?: string;
  // The paper it is drawn on, for the ring round the dot. Default surface.
  paper?: ChartPaper;
  // Layout only (flex, a width). Merged last.
  style?: StyleProp<ViewStyle>;
};

// The heights belong to this chart. md is the room the small chart takes in
// the hero on the brand board (48, less its 9 of padding).
const HEIGHT: Record<ChartSize, number> = { sm: 24, md: 40, lg: 56 };
// The dot on the emphasised point of a line, and the ring of paper round it.
const DOT = 3;
const DOT_REACH = DOT + border.control;
// The board's small bars: 3 apart, tops of radius 2.
const BAR_GAP = 3;
const BAR_CORNER = 2;

// A tiny chart for a card: the shape of a series beside the number that
// matters.
//   <Sparkline values={monthly} style={styles.grow} />
//   <Sparkline variant="bars" values={monthly} summary={t('home.sparkSummary')} />
//
// It is still: no touch, no movement, no axis and no labels. Marks are
// `chartRest`; one mark may be `chartPeak`. With fewer than two known values
// there is no shape to draw: it gives way to `emptyLabel`, or to nothing at
// all, never to an empty box.
//
// Like every plot it runs left to right in every language.
export function Sparkline({
  values,
  variant = 'line',
  size = 'md',
  emphasis = 'max',
  baseline = 'zero',
  summary,
  emptyLabel,
  paper = 'surface',
  style,
}: SparklineProps) {
  const { colors } = useTheme();
  const { width, onLayout } = usePlotWidth();

  const height = HEIGHT[size];
  const count = values.length;
  const known = values.filter(isKnown);
  if (known.length < 2) return <ChartEmpty label={emptyLabel} style={style} />;
  // Nothing is drawn in the one frame before it has been measured.
  const drawable = width > 0;

  let pointed = -1;
  if (emphasis === 'max') {
    pointed = maxIndex(values, true);
  } else if (emphasis === 'last') {
    for (let index = count - 1; index >= 0 && pointed < 0; index--) {
      if (isKnown(values[index])) pointed = index;
    }
  }

  const reach: Domain = extent(known) ?? [0, 0];

  let drawing: ReactNode = null;
  if (drawable && variant === 'bars') {
    // Bars are read by their length, so their scale always holds zero.
    const span = withZero(reach);
    const y = linearScale(span[0] === span[1] ? [0, 1] : span, [height, 0]);
    const zero = y(0);
    const bands = bandLayout(count, width, BAR_GAP, width);
    const corner = Math.min(BAR_CORNER, bands.band / 2);
    drawing = values.map((value, index) => {
      if (!isKnown(value) || value === 0) return null;
      const below = value < 0;
      const tall = Math.max(Math.abs(y(value) - zero), MARK_MIN);
      return (
        <View
          key={index}
          style={[
            styles.bar,
            below
              ? { borderBottomStartRadius: corner, borderBottomEndRadius: corner }
              : { borderTopStartRadius: corner, borderTopEndRadius: corner },
            {
              insetInlineStart: bandStart(bands, index),
              top: below ? zero : zero - tall,
              width: bands.band,
              height: tall,
              backgroundColor: index === pointed ? colors.chartPeak : colors.chartRest,
            },
          ]}
        />
      );
    });
  } else if (drawable) {
    const span = baseline === 'zero' ? withZero(reach) : reach;
    // Zero sits on the foot of the box, less half the line so the stroke is
    // whole. Any other floor leaves room for the dot.
    const foot = span[0] === 0 ? border.strong / 2 : DOT_REACH;
    const y = linearScale(span[0] === 0 && span[1] === 0 ? [0, 1] : span, [height - foot, DOT_REACH]);
    const points = pointLayout(count, width, DOT_REACH);
    const path = linePath(
      values.map((value, index) => (isKnown(value) ? { x: pointX(points, index), y: y(value) } : null)),
    );
    drawing = (
      <Svg width={width} height={height}>
        <Path
          d={path}
          stroke={colors.chartRest}
          strokeWidth={border.strong}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {pointed >= 0 ? (
          <Circle
            cx={pointX(points, pointed)}
            cy={y(values[pointed] as number)}
            r={DOT}
            fill={colors.chartPeak}
            stroke={colors[paper]}
            strokeWidth={border.control}
          />
        ) : null}
      </Svg>
    );
  }

  const box: StyleProp<ViewStyle> = [styles.root, { height, minWidth: height * 2 }, style];
  if (summary === undefined || summary === '') {
    return (
      <View aria-hidden onLayout={onLayout} style={box}>
        {drawing}
      </View>
    );
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} onLayout={onLayout} style={box}>
      {drawing}
    </View>
  );
}

const styles = StyleSheet.create({
  // A plot never mirrors: time runs left to right in every language. Inside
  // it, the inline start is the left edge.
  root: { direction: 'ltr', alignSelf: 'stretch' },
  bar: { position: 'absolute' },
});
