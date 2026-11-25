import { StyleSheet } from 'react-native';

import { useLocalT } from '@/i18n/local';
import { useNumbers } from '@/state/app-state';
import { space, useTheme } from '@/theme';
import { Card } from '@/ui/card';
import { LineChart, type LinePoint } from '@/ui/charts/line-chart';
import { Icon } from '@/ui/icon';
import { HStack } from '@/ui/stack';
import { Txt } from '@/ui/text';
import { prettyColumn } from '@/utils/format';

import type { ForecastOutcome, TimeUnit } from './compute';
import { INSIGHTS_STRINGS, type InsightsStringKey } from './strings';

const UNIT_WORDS: Record<TimeUnit, { one: InsightsStringKey; many: InsightsStringKey }> = {
  month: { one: 'monthOne', many: 'monthMany' },
  quarter: { one: 'quarterOne', many: 'quarterMany' },
  week: { one: 'weekOne', many: 'weekMany' },
  date: { one: 'dateOne', many: 'dateMany' },
};

export type ForecastCardProps = {
  metric: string;
  outcome: ForecastOutcome;
  // The app's own formatting for this column.
  amount: (value: number | null | undefined) => string;
};

// The honest forecast, under the main chart when the chart runs through time.
// The engine first hides the last few real points, predicts them from the
// rest and measures how far off it was; only then does it project. The card
// says that result in one sentence, draws the projection dashed with its
// range as a band, and calls it a guess. When the engine will not guess (too
// few points, or too far off on its own test) the card says why instead.
// Nothing here is ever shown as a checked number: no band of light, no stamp.
export function ForecastCard({ metric, outcome, amount }: ForecastCardProps) {
  const { colors } = useTheme();
  const tl = useLocalT(INSIGHTS_STRINGS);
  const numbers = useNumbers();
  const words = UNIT_WORDS[outcome.unit];
  const units = (count: number) => tl(count === 1 ? words.one : words.many);

  const title = (
    <Txt variant="heading" accessibilityRole="header">
      {tl('forecastTitle')}
    </Txt>
  );

  if (outcome.kind !== 'projection') {
    let why: string;
    if (outcome.kind === 'too-few') {
      why = tl('forecastTooFew', {
        need: numbers.count(outcome.need),
        units: units(outcome.need),
        have: numbers.count(outcome.have),
      });
    } else if (outcome.kind === 'too-irregular') {
      why = tl('forecastIrregular', {
        n: numbers.count(outcome.tested),
        units: units(outcome.tested),
        error: numbers.percent(outcome.errorPct, 1),
      });
    } else if (outcome.kind === 'below-zero') {
      why = tl('forecastBelowZero', { metric: prettyColumn(metric) });
    } else {
      why = tl('forecastNoTrend');
    }
    return (
      <Card style={styles.card}>
        {title}
        <HStack gap="sm" align="start" accessible accessibilityLabel={why}>
          <Icon name="info" color={colors.inkSoft} />
          <Txt tone="soft" style={styles.grow}>
            {why}
          </Txt>
        </HStack>
      </Card>
    );
  }

  const { history, forecast, low, high, errorPct, tested, unit } = outcome;
  // The names of the projected steps: "+1 month", "+2 months". Dates have no
  // step name the app could be sure of, so they are only counted.
  const ahead = (step: number): string =>
    unit === 'date'
      ? tl('aheadBare', { n: numbers.count(step) })
      : tl('ahead', { n: numbers.count(step), unit: units(step) });

  const last = history.length - 1;
  const data: LinePoint[] = [
    // The band opens from the last real point.
    ...history.map((point, index) =>
      index === last
        ? { label: point.label, value: point.value, low: point.value, high: point.value }
        : { label: point.label, value: point.value },
    ),
    ...forecast.map((value, step) => ({
      label: ahead(step + 1),
      value,
      projected: true,
      low: low[step],
      high: high[step],
    })),
  ];

  const summary = tl('forecastSummary', {
    metric: prettyColumn(metric),
    count: numbers.count(history.length),
    units: units(history.length),
    steps: numbers.count(forecast.length),
    next: amount(forecast[0]),
    low: amount(low[0]),
    high: amount(high[0]),
  });

  return (
    <Card style={styles.card}>
      {title}
      <Txt variant="small" tone="soft">
        {tl('forecastNote')}
      </Txt>
      <LineChart
        // A new column draws its line again; coming back to the screen does not.
        key={metric}
        data={data}
        format={amount}
        summary={summary}
        detail={(point) =>
          point.projected
            ? tl('projectedDetail', { value: amount(point.value), low: amount(point.low), high: amount(point.high) })
            : amount(point.value)
        }
        projectedLabel={tl('projected')}
        hint={tl('forecastHint')}
        previousLabel={tl('previousPoint')}
        nextLabel={tl('nextPoint')}
      />
      <Txt variant="small">
        {tl('forecastTried', {
          n: numbers.count(tested),
          units: units(tested),
          error: numbers.percent(errorPct, 1),
        })}
      </Txt>
      <Txt variant="small" tone="soft">
        {tl('forecastBand')}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  grow: { flex: 1 },
});
