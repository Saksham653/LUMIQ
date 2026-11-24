import { aggregationRule } from '@core/data/columnTypes.js';
import { detectTimeColumn } from '@core/engine/insights.js';
import { runPlan } from '@core/engine/runPlan.js';
import { isBlank, isNumber } from '@core/lib/stats.js';

import type { Dataset } from '@/data/types';

export type ChartBar = { label: string; value: number };
export type ChartData = { bars: ChartBar[]; groupColumn: string | null };

const MAX_BARS = 12;

type TimeColumn = { column: string; keyOf: (value: unknown) => number };

// Totals (or averages, for rate-like columns) of the metric per value of
// `column`, computed by the shared plan engine.
function groupTotals(dataset: Dataset, metric: string, column: string, op: 'sum' | 'avg'): ChartBar[] {
  const table = runPlan(dataset.data, dataset.columns, {
    groupBy: [column],
    measures: [{ op, column: metric, as: 'value' }],
  }).table as Record<string, unknown>[];
  return table
    .filter((row) => !isBlank(row[column]) && isNumber(row.value))
    .map((row) => ({ label: String(row[column]), value: row.value as number }));
}

// A chart that stays readable on a phone, at most 12 bars:
// 1. a time column (months, quarters, weeks, dates) with 3+ points: one bar
//    per period, in time order;
// 2. otherwise a text column with 2-12 groups: one bar per group, biggest first;
// 3. otherwise, for a small file, one bar per row.
// Larger files with neither get no chart rather than an unreadable one.
export function buildChart(dataset: Dataset, metric: string): ChartData | null {
  const op = aggregationRule(metric, dataset.columnTypes?.[metric]) === 'avg' ? 'avg' : 'sum';

  const time = detectTimeColumn(dataset) as TimeColumn | null;
  if (time) {
    const bars = groupTotals(dataset, metric, time.column, op).sort((a, b) => time.keyOf(a.label) - time.keyOf(b.label));
    if (bars.length >= 3) return { bars: bars.slice(-MAX_BARS), groupColumn: time.column };
  }

  const category = dataset.columns.find((column) => {
    if (column === metric || (dataset.columnTypes?.[column]?.type ?? 'text') !== 'text') return false;
    const groups = new Set(dataset.data.map((row) => row[column]).filter((value) => !isBlank(value))).size;
    return groups >= 2 && groups <= MAX_BARS && !(groups === dataset.data.length && dataset.data.length > 6);
  });
  if (category) {
    return { bars: groupTotals(dataset, metric, category, op).sort((a, b) => b.value - a.value), groupColumn: category };
  }

  if (dataset.data.length <= MAX_BARS) {
    const labelColumn = dataset.columns[0];
    const bars = dataset.data
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => isNumber(row[metric]))
      .map(({ row, index }) => ({
        label: isBlank(row[labelColumn]) || labelColumn === metric ? `#${index + 1}` : String(row[labelColumn]),
        value: row[metric] as number,
      }));
    return bars.length > 0 ? { bars, groupColumn: null } : null;
  }

  return null;
}
