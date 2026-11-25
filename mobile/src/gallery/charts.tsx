import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useNumbers } from '@/state/app-state';
import { MAX_FONT_SCALE, figureFont, numeralLine, numeralSize, space, typeScale, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import {
  BarChart,
  Distribution,
  HBarChart,
  LineChart,
  Ring,
  Sparkline,
  chartScale,
  type BarDatum,
  type ChartSize,
  type HBarDatum,
  type LinePoint,
  type RingSize,
} from '@/ui/charts';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// The gallery's page for the charts group: BarChart, HBarChart, LineChart,
// Sparkline, Distribution and Ring, in every variant, size and state, to be
// touched.
//
// Developer-facing: the captions and the sample words are plain English (and
// some Hindi, to show long text) on purpose and are not in the app's
// translations. The numbers are written by the app's own formatter, so they
// follow the language and number style chosen in the app. Nothing here ships
// in a screen.

// --- Sample content ----------------------------------------------------------

// The sample file of the brand board: Revenue by month. Sum 4,680,000,
// highest 712,000, average 390,000.
const MONTHS: readonly string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REVENUE: readonly number[] = [
  310000, 285000, 330000, 352000, 341000, 318000, 366000, 389000, 402000, 448000, 427000, 712000,
];
const AVERAGE = 390000;
const YEAR: readonly BarDatum[] = MONTHS.map((label, at) => ({ label, value: REVENUE[at] }));

const QUARTERS: readonly BarDatum[] = [
  { label: 'Q1', value: 925000 },
  { label: 'Q2', value: 1011000 },
  { label: 'Q3', value: 1157000 },
  { label: 'Q4', value: 1587000 },
];

// A month of days: too many to name each one, too narrow to aim at.
const DAYS: readonly BarDatum[] = Array.from({ length: 31 }, (_, at) => ({
  label: String(at + 1),
  value: 12000 + ((at * 7919) % 9000) + (at % 7 === 5 ? 6000 : 0),
}));

// Profit goes below zero.
const PROFIT: readonly BarDatum[] = [
  { label: 'Jan', value: 42000 },
  { label: 'Feb', value: -18000 },
  { label: 'Mar', value: 27000 },
  { label: 'Apr', value: -6000 },
  { label: 'May', value: 51000 },
  { label: 'Jun', value: 12000 },
];

// March has no value in the file. April's is a real zero.
const WITH_GAPS: readonly BarDatum[] = [
  { label: 'Jan', value: 310000 },
  { label: 'Feb', value: 285000 },
  { label: 'Mar', value: null },
  { label: 'Apr', value: 0 },
  { label: 'May', value: 341000 },
  { label: 'Jun', value: 318000 },
];

// Two bars share the top.
const TIED: readonly BarDatum[] = [
  { label: 'North', value: 40 },
  { label: 'South', value: 55 },
  { label: 'East', value: 55 },
  { label: 'West', value: 30 },
];

const ONE_BAR: readonly BarDatum[] = [{ label: 'Dec', value: 712000 }];

const GROUPS: readonly HBarDatum[] = [
  { label: 'Grocery', value: 2390000 },
  { label: 'Clothing', value: 1100000 },
  { label: 'Electronics', value: 700000 },
  { label: 'Toys', value: 490000 },
];

const GROUP_PROFIT: readonly HBarDatum[] = [
  { label: 'Grocery', value: 184000 },
  { label: 'Clothing', value: 96000 },
  { label: 'Electronics', value: -42000 },
  { label: 'Toys', value: null },
  { label: 'Stationery', value: 0 },
];

// Long Hindi names: the longest thing a row or an axis has to hold.
const HINDI_GROUPS: readonly HBarDatum[] = [
  { label: 'किराना और रोज़मर्रा की ज़रूरत का सारा सामान', value: 2390000 },
  { label: 'बच्चों और बड़ों के कपड़े, जूते और चप्पल', value: 1100000 },
  { label: 'इलेक्ट्रॉनिक्स', value: 700000 },
  { label: 'खिलौने', value: 490000 },
];
const HINDI_MONTHS: readonly string[] = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितंबर',
  'अक्टूबर',
  'नवंबर',
  'दिसंबर',
];
const HINDI_YEAR: readonly BarDatum[] = HINDI_MONTHS.map((label, at) => ({ label, value: REVENUE[at] }));
const HINDI = {
  barSummary: 'बारह महीनों की बिक्री का चार्ट। दिसंबर की बिक्री सबसे ज़्यादा रही।',
  hint: 'किसी भी महीने की बिक्री पढ़ने के लिए उसके खंभे को छुएँ या चार्ट पर उँगली फिराएँ।',
  highest: 'सबसे ज़्यादा',
  average: 'औसत',
  groupsSummary: 'श्रेणी के हिसाब से बिक्री। किराना सबसे आगे है।',
  empty: 'इस कॉलम में चार्ट बनाने के लिए कम से कम दो संख्याएँ चाहिए। अभी इसमें सिर्फ़ एक संख्या है।',
  projected: 'अनुमान',
  lineSummary: 'पिछले बारह महीनों की बिक्री और अगले तीन महीनों का अनुमान।',
  lineHint: 'किसी भी महीने की बिक्री पढ़ने के लिए रेखा पर उँगली फिराएँ।',
  median: 'बीच का मान',
  spreadSummary: 'ऑर्डर कितने बड़े हैं, इसका फैलाव। ज़्यादातर ऑर्डर 30 से 50 के बीच हैं।',
} as const;

// Twelve real months and three projected ones, with the range the projection
// may fall in. December carries low = high = its value, so the range opens
// from the end of the line.
const TREND: readonly LinePoint[] = [
  ...MONTHS.map((label, at) =>
    at === 11
      ? { label: `${label} 2025`, value: REVENUE[at], low: REVENUE[at], high: REVENUE[at] }
      : { label: `${label} 2025`, value: REVENUE[at] },
  ),
  { label: 'Jan 2026', value: 540000, projected: true, low: 470000, high: 610000 },
  { label: 'Feb 2026', value: 560000, projected: true, low: 450000, high: 670000 },
  { label: 'Mar 2026', value: 585000, projected: true, low: 430000, high: 740000 },
];
const HINDI_TREND: readonly LinePoint[] = TREND.map((point, at) => ({
  ...point,
  label: `${HINDI_MONTHS[at % 12]} ${at < 12 ? '2025' : '2026'}`,
}));
const YEAR_LINE: readonly LinePoint[] = MONTHS.map((label, at) => ({ label, value: REVENUE[at] }));

// May and June were not recorded.
const BROKEN_LINE: readonly LinePoint[] = YEAR_LINE.map((point, at) =>
  at === 4 || at === 5 ? { ...point, value: null } : point,
);

// A price that never comes near zero.
const PRICE: readonly LinePoint[] = [1012, 1018, 1009, 1021, 1026, 1019, 1031, 1038].map((value, at) => ({
  label: `Week ${at + 1}`,
  value,
}));

// Profit crosses zero.
const PROFIT_LINE: readonly LinePoint[] = PROFIT.map((bar) => ({ label: bar.label, value: bar.value }));

// Ninety days: the points are closer together than a finger is wide.
const NINETY_DAYS: readonly LinePoint[] = Array.from({ length: 90 }, (_, at) => ({
  label: `Day ${at + 1}`,
  value: 8000 + at * 60 + ((at * 7919) % 2400),
}));

const ONE_POINT: readonly LinePoint[] = [{ label: 'Dec', value: 712000 }];

// The size of 28 orders. Their median, 41.5, is typed in here: in the app it
// comes from the engine, never from the chart.
const ORDER_SIZES: readonly number[] = [
  12, 15, 18, 22, 24, 27, 28, 31, 33, 35, 36, 38, 39, 41, 42, 42, 44, 45, 47, 48, 52, 55, 58, 63, 67, 71, 78, 88,
];
const ORDER_MEDIAN = 41.5;
const ORDER_BINS = chartScale.binValues(ORDER_SIZES, 8);
// Every order the same size: one bin, so nothing to draw.
const SAME_SIZE_BINS = chartScale.binValues([40, 40, 40, 40]);

const SIZES: readonly ChartSize[] = ['sm', 'md', 'lg'];
const PLOT_NOTE: Record<ChartSize, string> = { sm: 'sm, 64 high', md: 'md, 88 high', lg: 'lg, 132 high' };
const THICK_NOTE: Record<ChartSize, string> = { sm: 'sm, 8 thick', md: 'md, 12 thick', lg: 'lg, 16 thick' };
const SPARK_NOTE: Record<ChartSize, string> = { sm: 'sm, 24', md: 'md, 40', lg: 'lg, 56' };
const RING_SIZES: readonly RingSize[] = ['sm', 'md', 'lg'];
const RING_NOTE: Record<RingSize, string> = { sm: 'sm, 72', md: 'md, 120', lg: 'lg, 200' };

// --- Small pieces of the page ---------------------------------------------------

function Heading({ children }: { children: string }) {
  return (
    <Txt variant="heading" accessibilityRole="header">
      {children}
    </Txt>
  );
}

function Example({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <VStack gap="sm">
      <Txt variant="small" tone="soft">
        {caption}
      </Txt>
      {children}
    </VStack>
  );
}

// Which mark a finger last read: proof that the read-out reaches the screen
// around the chart too (onSelect).
function LastRead({ what }: { what: string | null }) {
  return (
    <Txt variant="small" tone="faint" aria-live="polite">
      {`Last mark read: ${what ?? 'none yet'}`}
    </Txt>
  );
}

// The app's own number formatting, as every chart is given it.
function useFormats() {
  const numbers = useNumbers();
  return {
    amount: (value: number): string => numbers.amount(value),
    count: (value: number): string => numbers.count(value),
  };
}

// The digits of a big number: beside a sparkline, or as a ring's own middle.
// The library's Numeral was not there yet when this page was written, so the
// digits are set here the way a numeral is set (the figures face, a step of
// the numeral ladder). Digits only: a unit goes beside it in the text face.
// Swap it for <Numeral /> when that lands.
function Score({ text, size }: { text: string; size: 'inline' | 'medium' | 'hero' }) {
  const { colors } = useTheme();
  const line = size === 'inline' ? typeScale.body.line : numeralLine[size];
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[figureFont('600'), { fontSize: numeralSize[size], lineHeight: line, color: colors.ink }]}>
      {text}
    </Text>
  );
}

// The number a sparkline stands beside: 712 in the figures face and its unit
// in the text face, as in the Home hero.
function HeroNumber() {
  const { count } = useFormats();
  return (
    <HStack gap="xs" align="baseline">
      <Score text={count(712)} size="medium" />
      <Txt variant="label" tone="soft" weight="500">
        K
      </Txt>
    </HStack>
  );
}

// --- BarChart ------------------------------------------------------------------

function Bars() {
  const { amount } = useFormats();
  const [read, setRead] = useState<string | null>(null);

  const yearSummary = `Revenue for twelve months. December is the highest at ${amount(712000)}. The average is ${amount(AVERAGE)}.`;
  const averageLabel = `Average ${amount(AVERAGE)}`;
  const letter = (datum: BarDatum): string => datum.label.charAt(0);

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>BarChart</Heading>
        <Txt tone="soft">
          One series, so one blue: the highest bar, with its value written above it. Tap a bar, rest a finger on it,
          or drag across the plot: the line above says which bar the finger is on, a ring of ink marks it, and each
          new bar gives one selection tap in the hand. Each bar answers across the full height of the plot. Drag up or
          down and the page scrolls as usual. To a screen reader the plot is one adjustable element: it says the
          summary, then the bar being read, and a swipe up or down moves one bar. With a keyboard, focus the plot and
          use the arrow keys, Home and End.
        </Txt>
        <LastRead what={read} />
      </VStack>

      <Example caption="md, 88 high: the plot on the brand board. Twelve bars grow from the baseline one after another. The dashed line is the average, with its words on a patch of paper. Initials stand under the bars; the read-out gives the whole name.">
        <Card>
          <BarChart
            data={YEAR}
            format={amount}
            summary={yearSummary}
            hint="Touch a bar to read it."
            detail={(datum, index) => (index === 11 ? `${amount(datum.value)}, the highest` : amount(datum.value))}
            average={AVERAGE}
            averageLabel={averageLabel}
            axisLabel={letter}
            onSelect={(index) => setRead(YEAR[index].label)}
          />
        </Card>
      </Example>

      {SIZES.filter((size) => size !== 'md').map((size) => (
        <Example key={size} caption={`${PLOT_NOTE[size]}. Whole month names: the ones that do not fit are thinned out, and the peak keeps its name.`}>
          <Card>
            <BarChart
              size={size}
              data={YEAR}
              format={amount}
              summary={yearSummary}
              hint="Touch a bar to read it."
              average={AVERAGE}
              averageLabel={averageLabel}
              onSelect={(index) => setRead(YEAR[index].label)}
            />
          </Card>
        </Example>
      ))}

      <Example caption="Four bars: every touch column is far wider than 48, and no bar is drawn wider than 48.">
        <Card>
          <BarChart
            data={QUARTERS}
            format={amount}
            summary={`Revenue for four quarters. The fourth is the highest at ${amount(1587000)}.`}
            hint="Touch a bar to read it."
            onSelect={(index) => setRead(QUARTERS[index].label)}
          />
        </Card>
      </Example>

      <Example caption="Thirty-one bars: each is narrower than a finger, so the finger is read by where it is. Drag slowly across: the ring steps from day to day, and the hand stays quiet (a tap for every bar would be a buzz); a finger that lands on a bar is still felt. The columns are narrower than 24, so the read-out carries a previous and a next button, 48 each, named by the app here. Step to day 1 or day 31: the button with nowhere to go is disabled. Only some of the days are named: names that do not fit are thinned out, never squeezed.">
        <Card>
          <BarChart
            data={DAYS}
            format={amount}
            summary="Sales for the thirty-one days of December."
            hint="Drag across to read a day."
            previousLabel="Previous day"
            nextLabel="Next day"
            onSelect={(index) => setRead(`day ${DAYS[index].label}`)}
          />
        </Card>
      </Example>

      <Example caption="Values below zero hang from a shared zero line. The scale always holds zero, so no bar is cut short.">
        <Card>
          <BarChart
            size="lg"
            data={PROFIT}
            format={amount}
            summary={`Profit for six months. May is the highest at ${amount(51000)}. February and April made a loss.`}
            hint="Touch a bar to read it."
            onSelect={(index) => setRead(PROFIT[index].label)}
          />
        </Card>
      </Example>

      <Example caption="March has no value: a short dash on the baseline and a dash in the read-out, never a zero. April is a real zero: no bar, and the read-out says 0. Touch both.">
        <Card>
          <BarChart
            data={WITH_GAPS}
            format={amount}
            summary="Revenue for six months. March has no value."
            hint="Touch a bar to read it."
            onSelect={(index) => setRead(WITH_GAPS[index].label)}
          />
        </Card>
      </Example>

      <Example caption="Two bars share the top, so none is painted as the peak: a tie has no single highest bar.">
        <Card>
          <BarChart
            data={TIED}
            format={amount}
            summary="Orders in four regions. South and East are level at the top."
            hint="Touch a bar to read it."
            onSelect={(index) => setRead(TIED[index].label)}
          />
        </Card>
      </Example>

      <Example caption="The peak chosen by the app (peakIndex 2), and no peak at all (peakIndex null).">
        <Card style={styles.stack}>
          <BarChart data={QUARTERS} format={amount} summary="Revenue for four quarters, the third pointed at." peakIndex={2} />
          <BarChart data={QUARTERS} format={amount} summary="Revenue for four quarters." peakIndex={null} />
        </Card>
      </Example>

      <Example caption="A still picture (interactive false): no read-out and nothing to touch. This is the chart's quiet state; a chart has no disabled one. A screen reader, or a keyboard, can still step through the bars: the bar being read is ringed.">
        <Card>
          <BarChart
            interactive={false}
            data={YEAR}
            format={amount}
            summary={yearSummary}
            average={AVERAGE}
            averageLabel={averageLabel}
            axisLabel={letter}
          />
        </Card>
      </Example>

      <Example caption="Straight on the ground (paper ground): the patch behind the average label takes the ground's colour.">
        <BarChart
          paper="ground"
          data={YEAR}
          format={amount}
          summary={yearSummary}
          hint="Touch a bar to read it."
          average={AVERAGE}
          averageLabel={averageLabel}
          axisLabel={letter}
          onSelect={(index) => setRead(YEAR[index].label)}
        />
      </Example>

      <Example caption="Hindi, with long month names and a long hint. The read-out wraps and then keeps its height, so the plot never jumps under a finger.">
        <Card>
          <BarChart
            data={HINDI_YEAR}
            format={amount}
            summary={HINDI.barSummary}
            hint={HINDI.hint}
            detail={(datum, index) => (index === 11 ? `${amount(datum.value)}, ${HINDI.highest}` : amount(datum.value))}
            average={AVERAGE}
            averageLabel={`${HINDI.average} ${amount(AVERAGE)}`}
            onSelect={(index) => setRead(HINDI_YEAR[index].label)}
          />
        </Card>
      </Example>

      <Example caption="Loading: the outline of the chart, the same size, breathing. It waits a moment before it shows, so a quick load never flashes it.">
        <Card>
          <BarChart loading data={YEAR} format={amount} summary={yearSummary} />
        </Card>
      </Example>

      <Example caption="Nothing to draw: one value has nothing to stand beside, so the chart gives way to a line of words that says what happened and what is needed. (Without emptyLabel it shows nothing at all.)">
        <Card style={styles.stack}>
          <BarChart
            data={ONE_BAR}
            format={amount}
            summary="Revenue for one month."
            emptyLabel="This column has one value so far. A chart needs at least two."
          />
          <BarChart data={[]} format={amount} summary="No values." emptyLabel={HINDI.empty} />
        </Card>
      </Example>
    </VStack>
  );
}

// --- HBarChart -----------------------------------------------------------------

function RankedBars() {
  const { amount } = useFormats();
  const summary = `Revenue by category. Grocery has the most, ${amount(2390000)}.`;

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>HBarChart</Heading>
        <Txt tone="soft">
          Ranked rows for top groups. Every row writes its name and its value above its bar, so nothing has to be
          touched to be read. The bars grow from the reading edge one after another. In Hebrew the whole chart mirrors:
          a ranking has no time axis.
        </Txt>
      </VStack>

      {SIZES.map((size) => (
        <Example key={size} caption={`${THICK_NOTE[size]}${size === 'md' ? ' (the default)' : ''}. The highest row is the blue one, in heavier ink.`}>
          <Card>
            <HBarChart size={size} data={GROUPS} format={amount} summary={summary} />
          </Card>
        </Example>
      ))}

      <Example caption="Below zero, not known, and zero. A loss grows the other way from a shared zero line. Toys has no value: a dash and no bar. Stationery is a real zero: 0 and no bar.">
        <Card>
          <HBarChart
            data={GROUP_PROFIT}
            format={amount}
            summary={`Profit by category. Grocery has the most, ${amount(184000)}. Electronics made a loss.`}
          />
        </Card>
      </Example>

      <Example caption="Long Hindi names wrap onto a second line and the row grows. The value keeps to its own words at the end of the row.">
        <Card>
          <HBarChart data={HINDI_GROUPS} format={amount} summary={HINDI.groupsSummary} />
        </Card>
      </Example>

      <Example caption="No peak (peakIndex null), and without the arrival (animate false).">
        <Card>
          <HBarChart animate={false} peakIndex={null} data={GROUPS} format={amount} summary={summary} />
        </Card>
      </Example>

      <Example caption="Loading: rows in outline, the same size.">
        <Card>
          <HBarChart loading data={GROUPS} format={amount} summary={summary} />
        </Card>
      </Example>

      <Example caption="Nothing to draw: one group, so a line of words instead of one lonely bar.">
        <Card>
          <HBarChart
            data={GROUPS.slice(0, 1)}
            format={amount}
            summary="Revenue by category."
            emptyLabel={`All of the Revenue is in one category: Grocery, ${amount(2390000)}.`}
          />
        </Card>
      </Example>
    </VStack>
  );
}

// --- LineChart -----------------------------------------------------------------

function Lines() {
  const { amount } = useFormats();
  const [read, setRead] = useState<string | null>(null);

  const trendSummary = `Revenue for twelve months, from ${amount(285000)} to ${amount(712000)}, and the next three months as projected.`;
  const yearSummary = `Revenue for twelve months, from ${amount(285000)} to ${amount(712000)}.`;

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>LineChart</Heading>
        <Txt tone="soft">
          A line through time, in straight segments. Four points are labelled without a touch: the highest real point
          is the blue dot with its value above the plot, the lowest carries its value under it, and the first and the
          last stand at the two ends of the axis with their names and values (an end that is already the highest or
          the lowest is not written twice). Tap the plot, rest a finger on it or drag along it: a faint line and a ring
          of ink follow the finger from point to point, and the line above says what it is on. A screen reader and a
          keyboard step through the points as they do through bars.
        </Txt>
        <LastRead what={read} />
      </VStack>

      <Example caption="md, with three projected months in dashes and the range they may fall in as the band behind them. The dashed line across is the average. The last point is a projection, and the value under its name says so. Drag onto a dashed point: the read-out says it is projected. On a narrow phone the fifteen points are closer than 24, so the previous and next buttons join the read-out.">
        <Card>
          <LineChart
            data={TREND}
            format={amount}
            summary={trendSummary}
            projectedLabel="projected"
            hint="Drag along the line to read it."
            average={AVERAGE}
            averageLabel={`Average ${amount(AVERAGE)}`}
            previousLabel="Previous month"
            nextLabel="Next month"
            onSelect={(index) => setRead(TREND[index].label)}
          />
        </Card>
      </Example>

      {SIZES.filter((size) => size !== 'md').map((size) => (
        <Example key={size} caption={`${PLOT_NOTE[size]}.`}>
          <Card>
            <LineChart
              size={size}
              data={TREND}
              format={amount}
              summary={trendSummary}
              projectedLabel="projected"
              hint="Drag along the line to read it."
              onSelect={(index) => setRead(TREND[index].label)}
            />
          </Card>
        </Example>
      ))}

      <Example caption="A gap: May and June were not recorded. The line breaks; it never dips to zero. Drag onto the gap: the cursor line shows where the finger is, the ring is gone and the read-out shows a dash.">
        <Card>
          <LineChart
            data={BROKEN_LINE}
            format={amount}
            summary="Revenue for twelve months. May and June have no value."
            hint="Drag along the line to read it."
            onSelect={(index) => setRead(BROKEN_LINE[index].label)}
          />
        </Card>
      </Example>

      <Example caption="The same price twice. First with zero in the picture (the default): the rise looks as small as it is. Then baseline fit: the scale starts at the lowest value, and the two labelled ends say so.">
        <Card style={styles.stack}>
          <LineChart
            data={PRICE}
            format={amount}
            summary="Price for eight weeks, drawn from zero."
            hint="Drag along the line to read it."
            onSelect={(index) => setRead(PRICE[index].label)}
          />
          <LineChart
            baseline="fit"
            data={PRICE}
            format={amount}
            summary="Price for eight weeks, drawn from its lowest value."
            hint="Drag along the line to read it."
            onSelect={(index) => setRead(PRICE[index].label)}
          />
        </Card>
      </Example>

      <Example caption="Below zero: a hairline marks zero inside the plot.">
        <Card>
          <LineChart
            size="lg"
            data={PROFIT_LINE}
            format={amount}
            summary="Profit for six months. February and April made a loss."
            hint="Drag along the line to read it."
            onSelect={(index) => setRead(PROFIT_LINE[index].label)}
          />
        </Card>
      </Example>

      <Example caption="Ninety points, closer together than a finger is wide. The cursor still steps from day to day under a drag, but the hand stays quiet: a tap for every point would be a buzz. The previous and next buttons are not named by the app here, so each is named after the point it goes to.">
        <Card>
          <LineChart
            data={NINETY_DAYS}
            format={amount}
            summary="Sales for ninety days, rising."
            hint="Drag along the line to read a day."
            onSelect={(index) => setRead(NINETY_DAYS[index].label)}
          />
        </Card>
      </Example>

      <Example caption="A still picture (interactive false), straight on the ground (paper ground): the dots take the ground's colour round them. Then the same without the values at the two ends (endValues false).">
        <LineChart interactive={false} paper="ground" data={YEAR_LINE} format={amount} summary={yearSummary} />
        <LineChart
          interactive={false}
          endValues={false}
          paper="ground"
          data={YEAR_LINE}
          format={amount}
          summary={yearSummary}
        />
      </Example>

      <Example caption="Hindi, with long month names and a long hint.">
        <Card>
          <LineChart
            data={HINDI_TREND}
            format={amount}
            summary={HINDI.lineSummary}
            projectedLabel={HINDI.projected}
            hint={HINDI.lineHint}
            average={AVERAGE}
            averageLabel={`${HINDI.average} ${amount(AVERAGE)}`}
            onSelect={(index) => setRead(HINDI_TREND[index].label)}
          />
        </Card>
      </Example>

      <Example caption="Loading: a block the size of the plot, with a line for the read-out and one for the axis.">
        <Card>
          <LineChart loading data={TREND} format={amount} summary={trendSummary} />
        </Card>
      </Example>

      <Example caption="Nothing to draw: one point is not a line.">
        <Card>
          <LineChart
            data={ONE_POINT}
            format={amount}
            summary="Revenue for one month."
            emptyLabel="Only one month has a value. A line needs at least two."
          />
        </Card>
      </Example>
    </VStack>
  );
}

// --- Sparkline ------------------------------------------------------------------

function Sparklines() {
  const { amount } = useFormats();

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Sparkline</Heading>
        <Txt tone="soft">
          The shape of a series beside the number that matters. It is still: no touch, no movement, no labels. Without
          a summary it is silent to a screen reader, for when the words beside it already say the same.
        </Txt>
      </VStack>

      <Example caption="In a card beside its number, as in the Home hero: the small bars of the brand board, then the line. The best month is the blue one.">
        <Card>
          <HStack gap="lg" align="end">
            <HeroNumber />
            <Sparkline variant="bars" values={REVENUE} style={styles.grow} />
          </HStack>
        </Card>
        <Card>
          <HStack gap="lg" align="end">
            <HeroNumber />
            <Sparkline values={REVENUE} style={styles.grow} />
          </HStack>
        </Card>
      </Example>

      {SIZES.map((size) => (
        <Example key={size} caption={`${SPARK_NOTE[size]}: line and bars.`}>
          <Card>
            <HStack gap="lg">
              <Sparkline size={size} values={REVENUE} style={styles.grow} />
              <Sparkline size={size} variant="bars" values={REVENUE} style={styles.grow} />
            </HStack>
          </Card>
        </Example>
      ))}

      <Example caption="What is pointed at: the highest value (the default), the latest value, nothing.">
        <Card>
          <HStack gap="lg">
            <Sparkline values={PRICE.map((point) => point.value)} baseline="fit" style={styles.grow} />
            <Sparkline values={PRICE.map((point) => point.value)} baseline="fit" emphasis="last" style={styles.grow} />
            <Sparkline values={PRICE.map((point) => point.value)} baseline="fit" emphasis="none" style={styles.grow} />
          </HStack>
        </Card>
      </Example>

      <Example caption="A gap in a line, values below zero as bars, and a spoken one (summary given: a screen reader lands on it).">
        <Card>
          <HStack gap="lg">
            <Sparkline values={BROKEN_LINE.map((point) => point.value)} style={styles.grow} />
            <Sparkline variant="bars" values={PROFIT.map((bar) => bar.value)} style={styles.grow} />
            <Sparkline
              values={REVENUE}
              summary={`Revenue rose through the year and ended at its highest, ${amount(712000)}.`}
              style={styles.grow}
            />
          </HStack>
        </Card>
      </Example>

      <Example caption="By itself in a column it takes the whole width; in a row with no flex it is twice as wide as it is tall.">
        <Card style={styles.stack}>
          <Sparkline values={REVENUE} />
          <HStack gap="md">
            <Sparkline values={REVENUE} />
            <Txt variant="small" tone="soft">
              No flex
            </Txt>
          </HStack>
        </Card>
      </Example>

      <Example caption="Fewer than two values: one point has no shape, so the sparkline gives way to a line of words (emptyLabel) or, without one, to nothing at all. This card holds one of each: you see one line of words and no empty box.">
        <Card style={styles.stack}>
          <Sparkline values={[712000]} emptyLabel="One month so far. A trend needs at least two." />
          <Sparkline values={[712000]} />
        </Card>
      </Example>
    </VStack>
  );
}

// --- Distribution ---------------------------------------------------------------

function Distributions() {
  const { amount, count } = useFormats();
  const summary = `How the sizes of 28 orders are spread. Most are between ${amount(30)} and ${amount(50)}. The median is ${amount(ORDER_MEDIAN)}.`;
  const says = (bin: { from: number; to: number; count: number }): string =>
    `${amount(bin.from)} to ${amount(bin.to)}: ${count(bin.count)} orders`;

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Distribution</Heading>
        <Txt tone="soft">
          How a set of values is spread: a histogram. The median is the dashed line down the plot with its words above
          it, and the bar it falls in is the blue one. The two ends of the axis carry the lowest and highest edge. The
          bins here are made by binValues() from the scale helpers; the median comes from the app. It is a still
          picture to a finger; a screen reader or a keyboard steps through the bars, each says its range and its
          count, and the bar being read is ringed.
        </Txt>
      </VStack>

      {SIZES.map((size) => (
        <Example key={size} caption={`${PLOT_NOTE[size]}${size === 'md' ? ' (the default)' : ''}.`}>
          <Card>
            <Distribution
              size={size}
              bins={ORDER_BINS}
              median={ORDER_MEDIAN}
              medianLabel={`Median ${amount(ORDER_MEDIAN)}`}
              format={amount}
              formatCount={count}
              summary={summary}
              markLabel={says}
            />
          </Card>
        </Example>
      ))}

      <Example caption="Without a median, and without the arrival (animate false): every bar rests.">
        <Card>
          <Distribution animate={false} bins={ORDER_BINS} format={amount} formatCount={count} summary={summary} markLabel={says} />
        </Card>
      </Example>

      <Example caption="Hindi words on the median.">
        <Card>
          <Distribution
            bins={ORDER_BINS}
            median={ORDER_MEDIAN}
            medianLabel={`${HINDI.median} ${amount(ORDER_MEDIAN)}`}
            format={amount}
            formatCount={count}
            summary={HINDI.spreadSummary}
          />
        </Card>
      </Example>

      <Example caption="Loading: the outline of the chart, the same size.">
        <Card>
          <Distribution loading bins={ORDER_BINS} format={amount} formatCount={count} summary={summary} />
        </Card>
      </Example>

      <Example caption="Nothing to draw: every order is the same size, so there is no spread.">
        <Card>
          <Distribution
            bins={SAME_SIZE_BINS}
            format={amount}
            formatCount={count}
            summary="Order sizes."
            emptyLabel={`All 4 orders are the same size: ${amount(40)}.`}
          />
        </Card>
      </Example>
    </VStack>
  );
}

// --- Ring -----------------------------------------------------------------------

function Rings() {
  const { count } = useFormats();
  const [score, setScore] = useState(82);

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Ring</Heading>
        <Txt tone="soft">
          A score as a ring, with the number in the middle. The arc starts at twelve o&apos;clock and runs clockwise in
          every language. It draws once on arrival, on the spring a numeral&apos;s digits roll on. Given the
          app&apos;s formatter, the ring writes the score itself, as the numeral that fits its size. A screen reader
          hears one sentence for the whole ring.
        </Txt>
      </VStack>

      <Example caption="Sizes, each writing its own numeral: sm 72 with the inline one, md 120 with the medium one, lg 200 with the hero one and a line under it (the ring's children).">
        <Card>
          <HStack gap="lg" wrap align="end">
            {RING_SIZES.map((size) => (
              <VStack key={size} gap="xs" align="center">
                <Ring size={size} value={82} format={count} summary={`File check: ${count(82)} out of ${count(100)}.`}>
                  {size === 'lg' ? (
                    <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
                      {`out of ${count(100)}`}
                    </Txt>
                  ) : null}
                </Ring>
                <Txt variant="small" tone="faint">
                  {RING_NOTE[size]}
                </Txt>
              </VStack>
            ))}
          </HStack>
        </Card>
      </Example>

      <Example caption={`A new score moves the arc from where it is, also down to zero. Now: ${score}.`}>
        <Card style={styles.stack}>
          <Ring value={score} format={count} summary={`File check: ${count(score)} out of ${count(100)}.`} />
          <HStack gap="sm" wrap>
            <Button variant="quiet" size="sm" label="0" onPress={() => setScore(0)} />
            <Button variant="quiet" size="sm" label="35" onPress={() => setScore(35)} />
            <Button variant="quiet" size="sm" label="82" onPress={() => setScore(82)} />
            <Button variant="quiet" size="sm" label="100" onPress={() => setScore(100)} />
          </HStack>
        </Card>
      </Example>

      <Example caption="Zero is the track with no arc and a 0 in the middle. Not known is the track with a dash: never a zero. Full is a closed ring. Then out of another total (max 10), and without the arrival (animate false).">
        <Card>
          <HStack gap="lg" wrap>
            <Ring value={0} format={count} summary={`File check: ${count(0)} out of ${count(100)}.`} />
            <Ring value={null} format={count} summary="File check: not worked out yet." />
            <Ring value={100} format={count} summary={`File check: ${count(100)} out of ${count(100)}.`} />
            <Ring value={7} max={10} format={count} summary={`${count(7)} of ${count(10)} columns have no empty cells.`} />
            <Ring animate={false} value={64} format={count} summary={`File check: ${count(64)} out of ${count(100)}.`} />
          </HStack>
        </Card>
      </Example>

      <Example caption="A percentage: the sign is part of the number and is set with its digits. Then a middle of your own (no format, children only): this is where the library's Numeral goes once it lands; here the digits are set by this page. Then no middle at all, for a ring beside words that already give the score.">
        <Card>
          <HStack gap="lg" wrap>
            <Ring value={82} format={(value) => `${count(value)}%`} summary={`${count(82)} percent of rows are complete.`} />
            <Ring value={64} summary={`File check: ${count(64)} out of ${count(100)}.`}>
              <Score text={count(64)} size="medium" />
            </Ring>
            <Ring size="sm" value={64} summary={`File check: ${count(64)} out of ${count(100)}.`} />
          </HStack>
        </Card>
      </Example>

      <Example caption="Loading: a disc of the same size.">
        <Card>
          <HStack gap="lg" wrap>
            <Ring loading size="sm" value={null} summary="File check." />
            <Ring loading value={null} summary="File check." />
          </HStack>
        </Card>
      </Example>
    </VStack>
  );
}

// --- The section ---------------------------------------------------------------

export type ChartsGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the charts group:
//   <ChartsGallery />
// It needs AppStateProvider above it (its text and its numbers read the app
// language) and sets no outer margin: the gallery page spaces it.
//
// It is its own gesture root, so the charts can be touched here whether or
// not the app has a GestureHandlerRootView yet. A gesture root inside another
// one does nothing by itself.
export function ChartsGallery({ style }: ChartsGalleryProps) {
  // Each press mounts every chart again, so the arrivals play again.
  const [run, setRun] = useState(0);

  return (
    <GestureHandlerRootView style={[styles.root, style]}>
      <VStack gap="xxxl">
        <VStack gap="sm">
          <Txt variant="title" accessibilityRole="header">
            Charts
          </Txt>
          <Txt tone="soft">
            Six charts drawn from plain arrays. The numbers are the app&apos;s: every figure here is written by the
            app&apos;s own formatter. Resting marks are grey and the one mark being pointed at is blue, with its value
            in words beside it; the yellow never appears in a chart. A plot runs left to right in every language. A
            chart is not a control, so it has no disabled state: interactive false is the still picture. Its error
            state is the honest line it shows when there is nothing to draw. To a screen reader every plot is one
            adjustable element: the summary, then the mark being read, and a swipe up or down for the next one.
          </Txt>
          <HStack gap="sm" wrap>
            <Button variant="quiet" size="sm" icon="retry" label="Play the arrivals again" onPress={() => setRun((now) => now + 1)} />
          </HStack>
        </VStack>
        <VStack key={run} gap="xxxl">
          <Bars />
          <RankedBars />
          <Lines />
          <Sparklines />
          <Distributions />
          <Rings />
        </VStack>
      </VStack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // A gesture root is a view; without a style of its own it would try to
  // fill the screen.
  root: { alignSelf: 'stretch' },
  // Two examples in one card.
  stack: { gap: space.xxl },
  // Takes the room that is left in a row.
  grow: { flex: 1 },
  // Centred text takes its width from its parent.
  stretch: { alignSelf: 'stretch' },
});
