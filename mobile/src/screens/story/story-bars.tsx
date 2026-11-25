import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

// The drawing's own grid. The picture takes the card's width and keeps this
// shape, so the bars scale evenly and their round tops stay round.
const WIDTH = 320;
const HEIGHT = 72;
// Bar tops have radius 4 (brand spec, section 6, charts).
const BAR_TOP = 4;
// A few bars do not grow into slabs.
const BAR_MAX = 40;
// A value of zero still leaves a mark.
const BAR_MIN_HEIGHT = 3;

// The picture never speaks: the sentence above it says what it shows.
const SILENT =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

const round = (value: number) => Math.round(value * 100) / 100;

// One bar standing on the floor of the plot, with a round top.
function barPath(x: number, width: number, height: number): string {
  const top = HEIGHT - height;
  const corner = Math.min(BAR_TOP, width / 2, height);
  const end = x + width;
  return [
    `M${round(x)} ${HEIGHT}`,
    `L${round(x)} ${round(top + corner)}`,
    `Q${round(x)} ${round(top)} ${round(x + corner)} ${round(top)}`,
    `L${round(end - corner)} ${round(top)}`,
    `Q${round(end)} ${round(top)} ${round(end)} ${round(top + corner)}`,
    `L${round(end)} ${HEIGHT}`,
    'Z',
  ].join(' ');
}

// The small picture of a story card: plain bars from zero, every bar in the
// resting chart colour and the one the sentence names in the chart's blue.
// The order of the bars is the order of the data and never flips: a chart's
// time axis runs the same way in every language.
export function StoryBars({ series, peakIndex }: { series: number[]; peakIndex?: number }) {
  const { colors } = useTheme();
  const count = series.length;
  const highest = series.reduce((best, value) => (value > best ? value : best), 0);
  if (count === 0 || highest <= 0) return null;

  const gap = count > 16 ? 2 : count > 8 ? 4 : 8;
  const width = Math.min(BAR_MAX, (WIDTH - gap * (count - 1)) / count);
  // Bars that do not fill the width sit in the middle of it.
  const start = (WIDTH - (width * count + gap * (count - 1))) / 2;

  return (
    <View style={styles.plot}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} {...SILENT}>
        {series.map((value, index) => {
          const height = Math.max(BAR_MIN_HEIGHT, (Math.max(value, 0) / highest) * HEIGHT);
          return (
            <Path
              key={index}
              d={barPath(start + index * (width + gap), width, height)}
              fill={index === peakIndex ? colors.chartPeak : colors.chartRest}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { width: '100%', aspectRatio: WIDTH / HEIGHT },
});
