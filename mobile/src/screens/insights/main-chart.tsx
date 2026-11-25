import { StyleSheet, View } from 'react-native';

import { inSentence } from '@/i18n';
import { useLocalT } from '@/i18n/local';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { space } from '@/theme';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { BarChart } from '@/ui/charts/bar-chart';
import { Txt } from '@/ui/text';
import { prettyColumn } from '@/utils/format';

import type { ColumnFacts } from './compute';
import { INSIGHTS_STRINGS } from './strings';

export type MainChartProps = {
  metric: string;
  facts: ColumnFacts;
  // The app's own formatting for this column: numbers.amount with its type.
  amount: (value: number | null | undefined) => string;
  // Opens Ask.
  onAsk: () => void;
};

// The chart that answers "how is it spread?": its title is the question it
// answers ("Revenue by month"), with "Ask about this" beside it. One series,
// so one blue: the bar that is the highest alone is the action blue with its
// value written above it, the others rest in grey, and the dashed line is the
// average of the bars. Tap a bar, rest a finger on it or drag across, and the
// line above the plot reads that bar; a screen reader steps through them.
export function MainChart({ metric, facts, amount, onAsk }: MainChartProps) {
  const t = useT();
  const tl = useLocalT(INSIGHTS_STRINGS);
  const numbers = useNumbers();
  const { language } = useAppState();
  const { chart, barAverage, peak, lowest } = facts;

  const title = chart?.groupColumn
    ? t('insights.chartBy', {
        metric: prettyColumn(metric),
        group: inSentence(prettyColumn(chart.groupColumn), language),
      })
    : t('insights.chartRows', { metric: prettyColumn(metric) });

  const bars = chart?.bars ?? [];
  const summary = [
    tl('summaryBars', { title, count: numbers.count(bars.length) }),
    peak >= 0 ? tl('summaryHighest', { label: bars[peak].label, value: amount(bars[peak].value) }) : null,
    lowest >= 0 ? tl('summaryLowest', { label: bars[lowest].label, value: amount(bars[lowest].value) }) : null,
    tl('summaryAverage', { value: amount(barAverage) }),
  ]
    .filter((part) => part !== null)
    .join(' ');

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Txt variant="heading" accessibilityRole="header" style={styles.title}>
          {title}
        </Txt>
        <Button variant="plain" size="sm" icon="ask" label={tl('askAbout')} onPress={onAsk} />
      </View>
      {chart ? (
        <BarChart
          // A new column grows its bars again; coming back to the screen does not.
          key={metric}
          data={bars}
          format={amount}
          summary={summary}
          detail={(datum, index) => (index === peak ? tl('theHighest', { value: amount(datum.value) }) : amount(datum.value))}
          hint={tl('chartHint')}
          emptyLabel={t('insights.noChart')}
          average={barAverage}
          averageLabel={tl('averageLine', { value: amount(barAverage) })}
          peakIndex={peak >= 0 ? peak : null}
          previousLabel={tl('previousBar')}
          nextLabel={tl('nextBar')}
          size="lg"
        />
      ) : (
        <Txt tone="soft">{t('insights.noChart')}</Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  // The title and its button share a line while both fit; at large text
  // sizes the button moves under the title.
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm },
  title: { flex: 1, minWidth: '55%' },
});
