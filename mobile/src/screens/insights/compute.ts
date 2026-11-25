import { aggregationRule } from '@core/data/columnTypes.js';
import { FORECAST_MIN_POINTS, buildForecast } from '@core/engine/forecast.js';
import { detectTimeColumn } from '@core/engine/insights.js';
import { runPlan } from '@core/engine/runPlan.js';
import { isBlank, isNumber } from '@core/lib/stats.js';

import type { Dataset } from '@/data/types';
import { buildChart, type ChartData } from '@/utils/chart';
import { computeKpis, type Kpis } from '@/utils/kpis';

// Everything Insights shows for one number column, worked out once when the
// column is chosen and kept as plain numbers. Words and formatting are added
// on screen, so a change of language or number style needs no new work.

// How many real points the forecast's line shows before its projection: the
// same twelve the main chart shows at most.
const HISTORY = 12;

// A file up to this many rows is worked out in place, in the same frame: the
// work takes a few milliseconds and an outline would only flash. A bigger
// file shows the screen's outline first and is worked out just after.
export const SMALL_FILE_ROWS = 2000;

// Runs `job` once the frame being drawn now is on screen, so an outline drawn
// first is seen before the phone gets busy. Returns a cancel, for an effect's
// clean-up.
export function afterPaint(job: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(job, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    if (timer !== undefined) clearTimeout(timer);
  };
}

// What one step of a time column is called.
export type TimeUnit = 'month' | 'quarter' | 'week' | 'date';

export type SeriesPoint = { label: string; value: number };

// The forecast, or why there is none. The engine (buildForecast) decides;
// this only keeps what the screen needs to say it.
export type ForecastOutcome =
  | {
      kind: 'projection';
      // The last real points, in time order.
      history: SeriesPoint[];
      // The projected values and the range round each, in step order.
      forecast: number[];
      low: number[];
      high: number[];
      // How far off the self-test was, in percent, and on how many points.
      errorPct: number;
      tested: number;
      unit: TimeUnit;
    }
  | { kind: 'too-few'; have: number; need: number; unit: TimeUnit }
  | { kind: 'too-irregular'; errorPct: number; tested: number; unit: TimeUnit }
  | { kind: 'below-zero'; unit: TimeUnit }
  | { kind: 'no-trend'; unit: TimeUnit };

export type ColumnFacts = {
  kpis: Kpis;
  chart: ChartData | null;
  // The average of the bars drawn (not of the rows): the dashed line.
  barAverage: number | null;
  // The bar that is the highest alone, and the lowest; -1 when there is no
  // single one.
  peak: number;
  lowest: number;
  // null when the chart is not a line through time.
  forecast: ForecastOutcome | null;
};

type TimeColumn = { column: string; keyOf: (value: unknown) => number };

// What buildForecast gives back. Its JavaScript return type is too loose for
// TypeScript to tell the two shapes apart, so it is written out here.
type ForecastResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      tooIrregular: boolean;
      errorPct: number;
      holdoutPoints: number;
      forecast: number[];
      confidence: number[];
    };

const QUARTER = /^\d{4}-?q[1-4]$/i;
const WEEK = /^w\d+$/i;

function unitOf(dataset: Dataset, column: string, labels: readonly string[]): TimeUnit {
  if (dataset.columnTypes?.[column]?.type === 'date') return 'date';
  if (labels.length > 0 && labels.every((label) => QUARTER.test(label.trim()))) return 'quarter';
  if (labels.length > 0 && labels.every((label) => WEEK.test(label.trim()))) return 'week';
  // The engine knows one more kind of time column: month names.
  return 'month';
}

// The metric per step of the time column, every step, in time order. The
// same plan and the same rule (sum, or average for rates) as the chart.
function periodSeries(dataset: Dataset, metric: string, time: TimeColumn): SeriesPoint[] {
  const op = aggregationRule(metric, dataset.columnTypes?.[metric]) === 'avg' ? 'avg' : 'sum';
  const table = runPlan(dataset.data, dataset.columns, {
    groupBy: [time.column],
    measures: [{ op, column: metric, as: 'value' }],
  }).table as Record<string, unknown>[];
  return table
    .filter((row) => !isBlank(row[time.column]) && isNumber(row.value))
    .map((row) => ({ label: String(row[time.column]), value: row.value as number }))
    .sort((a, b) => time.keyOf(a.label) - time.keyOf(b.label));
}

function forecastFor(series: SeriesPoint[], unit: TimeUnit): ForecastOutcome {
  const values = series.map((point) => point.value);
  const result = buildForecast(values) as unknown as ForecastResult;
  if (!result.ok) return { kind: 'too-few', have: values.length, need: FORECAST_MIN_POINTS, unit };
  if (result.tooIrregular) {
    return { kind: 'too-irregular', errorPct: result.errorPct, tested: result.holdoutPoints, unit };
  }
  const finite = (list: number[]) => list.every((value) => Number.isFinite(value));
  if (!Number.isFinite(result.errorPct) || !finite(result.forecast) || !finite(result.confidence)) {
    return { kind: 'no-trend', unit };
  }
  // A line that runs below zero for numbers that never go there is not a
  // forecast anyone should read.
  const neverNegative = values.every((value) => value >= 0);
  if (neverNegative && result.forecast.some((value) => value < 0)) return { kind: 'below-zero', unit };
  return {
    kind: 'projection',
    history: series.slice(-HISTORY),
    forecast: result.forecast,
    low: result.forecast.map((value, step) => {
      const low = value - result.confidence[step];
      return neverNegative ? Math.max(0, low) : low;
    }),
    high: result.forecast.map((value, step) => value + result.confidence[step]),
    errorPct: result.errorPct,
    tested: result.holdoutPoints,
    unit,
  };
}

// The index of the one highest (or lowest) value, or -1 when two or more
// share it or there are none.
function soleIndex(values: readonly number[], better: (a: number, b: number) => boolean): number {
  let best = -1;
  let shared = false;
  for (let index = 0; index < values.length; index++) {
    if (best < 0 || better(values[index], values[best])) {
      best = index;
      shared = false;
    } else if (values[index] === values[best]) {
      shared = true;
    }
  }
  return shared ? -1 : best;
}

export function computeColumnFacts(dataset: Dataset, metric: string): ColumnFacts {
  const kpis = computeKpis(dataset, metric);
  const chart = buildChart(dataset, metric);
  const values = chart ? chart.bars.map((bar) => bar.value) : [];
  const barAverage = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const peak = values.length >= 2 ? soleIndex(values, (a, b) => a > b) : -1;
  const lowest = values.length >= 2 ? soleIndex(values, (a, b) => a < b) : -1;

  // A forecast only for a chart through time: the chart's groups are the
  // steps of the file's time column.
  let forecast: ForecastOutcome | null = null;
  const time = detectTimeColumn(dataset) as TimeColumn | null;
  if (chart && time && chart.groupColumn === time.column) {
    const series = periodSeries(dataset, metric, time);
    forecast = forecastFor(
      series,
      unitOf(
        dataset,
        time.column,
        series.map((point) => point.label),
      ),
    );
  }

  return { kpis, chart, barAverage, peak, lowest, forecast };
}
