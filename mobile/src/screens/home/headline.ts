import { numericColumns } from '@core/data/dataset.js';
import { computeInsights } from '@core/engine/insights.js';
import { runPlan } from '@core/engine/runPlan.js';
import { isBlank, isNumber } from '@core/lib/stats.js';

import type { Dataset } from '@/data/types';
import type { StringKey } from '@/i18n';
import { buildChart } from '@/utils/chart';
import { prettyColumn, type Numbers } from '@/utils/format';
import type { InsightView } from '@/utils/insight-text';
import { computeKpis } from '@/utils/kpis';
import { mainNumberColumn } from '@/utils/story';

import type { HomeStringKey } from './strings';

// The one finding Home leads with. Nothing here is a new calculation: it picks
// from what the app already works out on the phone.
//   1. The first thing LUMIQ noticed in the file (the same list, in the same
//      order, as Insights shows under "What LUMIQ noticed").
//   2. With nothing noticed: the total of the file's main number column, or
//      its average when the column is a rate (the first tile of Insights for
//      that column).
//   3. With no number column at all: how many rows the file has.

type RawInsight = {
  type: 'top' | 'trend_up' | 'trend_down' | 'unusual';
  facts?: Record<string, unknown>;
};

// The small strip of bars beside the number, and the bar the number is about
// (-1 when no single bar is).
type Strip = { bars: number[]; marked: number };

export type HeroFinding =
  | ({ kind: 'insight'; unusual: boolean; id: string; column: string; value: number | null } & Strip)
  | ({ kind: 'total'; rule: 'sum' | 'avg'; column: string; value: number | null } & Strip)
  | { kind: 'rows'; value: number };

const NO_STRIP: Strip = { bars: [], marked: -1 };

function numberOrNull(value: unknown): number | null {
  return isNumber(value) ? (value as number) : null;
}

function highest(bars: number[]): number {
  let at = -1;
  bars.forEach((value, index) => {
    if (at === -1 || value > bars[at]) at = index;
  });
  return at;
}

// The total of `metric` for each value of `column`, biggest first, by the
// shared plan engine: the same call the chart of Insights makes, for the
// column the finding itself is about.
function groupTotals(dataset: Dataset, metric: string, column: string): { label: string; value: number }[] {
  const table = runPlan(dataset.data, dataset.columns, {
    groupBy: [column],
    measures: [{ op: 'sum', column: metric, as: 'value' }],
  }).table as Record<string, unknown>[];
  return table
    .filter((row) => !isBlank(row[column]) && isNumber(row.value))
    .map((row) => ({ label: String(row[column]), value: row.value as number }))
    .sort((a, b) => b.value - a.value);
}

function find(dataset: Dataset): HeroFinding {
  const insights = computeInsights(dataset, dataset.data) as RawInsight[];
  // The first finding describeInsights can word: it has its facts and is one
  // of the kinds below.
  const index = insights.findIndex(
    (insight) =>
      Boolean(insight.facts) &&
      (insight.type === 'top' ||
        insight.type === 'trend_up' ||
        insight.type === 'trend_down' ||
        insight.type === 'unusual'),
  );

  if (index !== -1) {
    const insight = insights[index];
    const facts = insight.facts ?? {};
    // The same id describeInsights gives this finding.
    const id = `${insight.type}-${index}`;

    if (insight.type === 'top') {
      // One group has the biggest share: its total, with every group as a bar
      // and its own bar marked.
      const column = String(facts.metric);
      const groups = groupTotals(dataset, column, String(facts.groupColumn));
      const bars = groups.map((group) => group.value);
      const own = groups.findIndex((group) => group.label === String(facts.group));
      return {
        kind: 'insight',
        unusual: false,
        id,
        column,
        value: numberOrNull(facts.total),
        bars,
        marked: own === -1 ? highest(bars) : own,
      };
    }

    if (insight.type === 'trend_up' || insight.type === 'trend_down') {
      // A change over time: the latest value, with the periods as bars and the
      // latest one marked.
      const column = String(facts.metric);
      const chart = buildChart(dataset, column);
      const bars = chart !== null && chart.groupColumn === facts.timeColumn ? chart.bars.map((bar) => bar.value) : [];
      return {
        kind: 'insight',
        unusual: false,
        id,
        column,
        value: numberOrNull(facts.to),
        bars,
        marked: bars.length - 1,
      };
    }

    // One value far from the rest: the value itself. No strip: no bar of a
    // chart would be this one cell.
    return {
      kind: 'insight',
      unusual: true,
      id,
      column: String(facts.column),
      value: numberOrNull(facts.value),
      ...NO_STRIP,
    };
  }

  // The column the Story also calls the file's main number (an amount, never
  // a serial number or a year); failing that, the column Insights opens on.
  const metric: string | undefined = mainNumberColumn(dataset) ?? (numericColumns(dataset) as string[])[0];
  if (metric !== undefined) {
    const kpis = computeKpis(dataset, metric);
    const chart = buildChart(dataset, metric);
    const bars = chart === null ? [] : chart.bars.map((bar) => bar.value);
    return { kind: 'total', rule: kpis.rule, column: metric, value: kpis.headline, bars, marked: highest(bars) };
  }

  return { kind: 'rows', value: dataset.data.length };
}

// A file's rows never change once it is open, so its finding is worked out
// once and kept for as long as the file itself is kept.
const found = new WeakMap<Dataset, HeroFinding>();

export function heroFinding(dataset: Dataset): HeroFinding {
  let finding = found.get(dataset);
  if (finding === undefined) {
    finding = find(dataset);
    found.set(dataset, finding);
  }
  return finding;
}

// --- The words ---------------------------------------------------------------

type Translate = (key: StringKey, params?: Record<string, string | number>) => string;
type LocalTranslate = (key: HomeStringKey, params?: Record<string, string | number>) => string;

export type NumeralParts = { prefix: string; number: string; suffix: string; rtl: boolean };

export type Headline = {
  // The finding, as one short sentence.
  title: string;
  // The big number, split so its unit can be drawn smaller.
  parts: NumeralParts;
  // The same number as one string, for a screen reader.
  spoken: string;
  // One quiet line under the number: what it is and how it was worked out.
  // Empty when that is not known.
  how: string;
  // true when that line asks the person to look again (an unusual value)
  // and is not a line of proof.
  caution: boolean;
  bars: number[];
  marked: number;
};

// Column names that already say what they are ("Avg order value", "Total
// sales") are the headline as they are, as on the Report.
const SAYS_AVERAGE = /^(avg|average|mean)\b/i;
const SAYS_TOTAL = /^(total|sum)\b/i;

// The finding in the app's language, with its number in the app's number
// style. `noticed` is describeInsights for the same file.
export function wordHeadline(
  finding: HeroFinding,
  dataset: Dataset,
  name: string,
  noticed: InsightView[],
  t: Translate,
  tl: LocalTranslate,
  numbers: Numbers,
): Headline {
  if (finding.kind === 'rows') {
    const count = numbers.count(finding.value);
    const unit = t('home.rowsLabel');
    return {
      title: tl('noNumbers'),
      parts: { prefix: '', number: count, suffix: unit, rtl: false },
      spoken: `${count} ${unit}`,
      how: t('report.footRows', { name }),
      caution: false,
      bars: [],
      marked: -1,
    };
  }

  const typeInfo = dataset.columnTypes?.[finding.column];
  const parts = numbers.amountParts(finding.value, typeInfo, finding.column);
  const spoken = numbers.amount(finding.value, typeInfo, finding.column);

  if (finding.kind === 'insight') {
    const id = finding.id;
    const view = noticed.find((item) => item.id === id);
    return {
      // The sentence is always there for a finding; the column's name stands
      // in so the number is never shown without saying what it is.
      title: view?.title ?? prettyColumn(finding.column),
      parts,
      spoken,
      how: view?.body ?? '',
      caution: finding.unusual,
      bars: finding.bars,
      marked: finding.marked,
    };
  }

  const average = finding.rule === 'avg';
  const column = prettyColumn(finding.column);
  const saysItself = (average ? SAYS_AVERAGE : SAYS_TOTAL).test(column);
  return {
    title: saysItself ? column : t(average ? 'report.average' : 'report.total', { column }),
    parts,
    spoken,
    how: t(average ? 'report.footAvg' : 'report.footSum', { column, rows: numbers.count(dataset.data.length) }),
    caution: false,
    bars: finding.bars,
    marked: finding.marked,
  };
}
