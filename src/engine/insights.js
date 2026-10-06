// Auto Insights, rebuilt on the engine and blank-aware stats. They
// run on the rows they are given (so active filters apply), and an
// insight only appears when it is meaningful:
// - top contributor: largest share of a summed metric, ≥2 groups and
//   noticeably above an even split;
// - change over time: only with a date/month-like column holding ≥6
//   time points, compared in time order, never by row position;
// - unusual values: a robust median-based check (MAD), so it works
//   on small files without the average being dragged by the outlier.

import { runPlan } from "./runPlan.js";
import { FORECAST_MIN_POINTS } from "./forecast.js";
import { numericColumns } from "../data/dataset.js";
import { aggregationRule, formatCell } from "../data/columnTypes.js";
import { sum, mean, median, numericEntries, numericValues, isBlank } from "../lib/stats.js";

const MAX_INSIGHTS = 4;
const TREND_MIN_POINTS = 6;
const TREND_MIN_CHANGE = 20; // percent
const UNUSUAL_MIN_VALUES = 5;
const UNUSUAL_Z = 3.5; // Iglewicz–Hoaglin robust z-score cut-off

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthIndex(value) {
  if (typeof value !== "string") return null;
  const i = MONTHS.indexOf(value.trim().slice(0, 3).toLowerCase());
  return i === -1 ? null : i;
}

// Finds a column whose values carry a time order: a date-typed
// column, month names, "2024-Q1" quarters or "W1" weeks. Returns
// { column, keyOf } where keyOf maps a value to a sortable number.
export function detectTimeColumn(ds) {
  const candidates = [];
  for (const col of ds.columns) {
    const type = ds.columnTypes?.[col]?.type || "text";
    if (type !== "date" && type !== "text") continue;
    const values = [];
    for (const row of ds.data) {
      const v = row?.[col];
      if (!isBlank(v)) values.push(v);
    }
    if (values.length === 0) continue;
    const keyOf =
      type === "date" && values.every((v) => !Number.isNaN(Date.parse(v)))
        ? (v) => Date.parse(v)
        : values.every((v) => monthIndex(v) !== null)
          ? (v) => monthIndex(v)
          : values.every((v) => /^\d{4}-?q[1-4]$/i.test(String(v).trim()))
            ? (v) => {
              const m = String(v).trim().match(/^(\d{4})-?q([1-4])$/i);
              return Number(m[1]) * 4 + Number(m[2]);
            }
            : values.every((v) => /^w\d+$/i.test(String(v).trim()))
              ? (v) => Number(String(v).trim().slice(1))
              : null;
    if (keyOf) candidates.push({ column: col, keyOf });
  }
  return candidates[0] || null;
}


// Forecast eligibility shares the insights' time detection: the
// dataset needs a time column holding at least 6 distinct points.
export function forecastTimeColumn(ds, minPoints = FORECAST_MIN_POINTS) {
  if (!ds) return null;
  const time = detectTimeColumn(ds);
  if (!time) return null;
  const distinct = new Set(
    ds.data
      .map((r) => r?.[time.column])
      .filter((v) => !isBlank(v))
      .map((v) => time.keyOf(v))
  );
  return distinct.size >= minPoints ? time : null;
}

// The metric values ordered by the time column — never by table
// order or the current sort. Rows with a blank time cell are left
// out; blanks in the metric are skipped as everywhere else.
export function forecastSeries(ds, rows, metric) {
  const time = forecastTimeColumn(ds);
  if (!time || !metric || !Array.isArray(rows)) return null;
  return numericValues(
    rows
      .filter((r) => !isBlank(r?.[time.column]))
      .sort((a, b) => time.keyOf(a[time.column]) - time.keyOf(b[time.column]))
      .map((r) => r[metric])
  );
}

const pct1 = (x) => Math.round(x * 10) / 10;

function topContributorInsight(ds, rows, numeric) {
  const metric = numeric.find((c) => aggregationRule(c, ds.columnTypes?.[c]) === "sum");
  if (!metric) return null;

  // Candidate group columns: text, 2-12 groups, and not ID-like (one
  // group per row only passes on small files). Fewest groups first —
  // the coarsest split tells the clearest story — and the first one
  // whose leader is noticeably above an even split wins.
  const candidates = ds.columns
    .map((c) => {
      if ((ds.columnTypes?.[c]?.type || "text") !== "text") return null;
      const uniques = new Set(rows.map((r) => r?.[c]).filter((v) => !isBlank(v))).size;
      if (uniques < 2 || uniques > 12) return null;
      if (uniques === rows.length && rows.length > 6) return null;
      return { column: c, uniques };
    })
    .filter(Boolean)
    .sort((a, b) => a.uniques - b.uniques);

  for (const { column: groupCol } of candidates) {
    const { table } = runPlan(rows, ds.columns, {
      groupBy: [groupCol],
      measures: [
        { op: "share", column: metric, as: "share" },
        { op: "sum", column: metric, as: "total" },
      ],
      sort: { by: "share", dir: "desc" },
    });
    const top = table.find((r) => !isBlank(r[groupCol]) && typeof r.share === "number");
    if (!top || table.length < 2) continue;
    // Meaningful only when noticeably above an even split
    const evenShare = 100 / table.length;
    if (top.share < evenShare * 1.1) continue;

    const typeInfo = ds.columnTypes?.[metric];
    return {
      type: "top",
      title: `${top[groupCol]} leads ${metric}`,
      description: `${top[groupCol]} accounts for ${pct1(top.share)}% of total ${metric} (${formatCell(top.total, typeInfo)} across ${table.length} ${groupCol} groups).`,
      severity: top.share >= evenShare * 1.5 ? "high" : "medium",
    };
  }
  return null;
}

function changeOverTimeInsight(ds, rows, numeric) {
  const time = detectTimeColumn(ds);
  if (!time || numeric.length === 0) return null;
  const metric = numeric[0];
  const rule = aggregationRule(metric, ds.columnTypes?.[metric]);

  const { table } = runPlan(rows, ds.columns, {
    groupBy: [time.column],
    measures: [{ op: rule === "avg" ? "avg" : "sum", column: metric, as: "v" }],
  });
  const points = table
    .filter((r) => !isBlank(r[time.column]) && typeof r.v === "number")
    .sort((a, b) => time.keyOf(a[time.column]) - time.keyOf(b[time.column]));
  if (points.length < TREND_MIN_POINTS) return null;

  const first = points[0];
  const last = points[points.length - 1];
  if (first.v === 0) return null;
  const change = ((last.v - first.v) / Math.abs(first.v)) * 100;
  if (Math.abs(change) < TREND_MIN_CHANGE) return null;

  const typeInfo = ds.columnTypes?.[metric];
  const up = change > 0;
  return {
    type: up ? "trend_up" : "trend_down",
    title: `${metric} ${up ? "rose" : "fell"} ${pct1(Math.abs(change))}% over time`,
    description: `In ${time.column} order, ${metric} went from ${formatCell(first.v, typeInfo)} (${first[time.column]}) to ${formatCell(last.v, typeInfo)} (${last[time.column]}).`,
    severity: Math.abs(change) > 50 ? "high" : "medium",
  };
}

function unusualValueInsights(ds, rows, numeric, limit) {
  const out = [];
  for (const col of numeric) {
    if (out.length >= limit) break;
    const entries = numericEntries(rows, col);
    if (entries.length < UNUSUAL_MIN_VALUES) continue;
    const values = entries.map((e) => e.value);
    const med = median(values);
    const mad = median(values.map((v) => Math.abs(v - med)));
    if (!mad) continue; // no spread — nothing can stand out
    let extreme = null;
    for (const e of entries) {
      const z = (0.6745 * (e.value - med)) / mad;
      if (Math.abs(z) > UNUSUAL_Z && (!extreme || Math.abs(z) > Math.abs(extreme.z))) {
        extreme = { value: e.value, z };
      }
    }
    if (!extreme) continue;
    const typeInfo = ds.columnTypes?.[col];
    out.push({
      type: "unusual",
      title: `Unusual value in ${col}`,
      description: `${formatCell(extreme.value, typeInfo)} is far ${extreme.z > 0 ? "above" : "below"} the typical ${col} of ${formatCell(med, typeInfo)} (based on the middle value, so one outlier cannot hide itself).`,
      severity: "high",
    });
  }
  return out;
}

// rows = the filtered rows on screen; ds supplies columns and types.
export function computeInsights(ds, rows) {
  if (!ds || !Array.isArray(rows) || rows.length === 0) return [];
  const numeric = numericColumns(ds);
  if (numeric.length === 0) return [];

  const insights = [];
  const top = topContributorInsight(ds, rows, numeric);
  if (top) insights.push(top);
  const trend = changeOverTimeInsight(ds, rows, numeric);
  if (trend) insights.push(trend);
  insights.push(...unusualValueInsights(ds, rows, numeric, MAX_INSIGHTS - insights.length));
  return insights.slice(0, MAX_INSIGHTS);
}
