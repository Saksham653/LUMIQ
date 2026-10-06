// The main chart's values and x-axis labels built from the SAME
// rows, so labels always line up with what is plotted: the filtered
// rows, time-ordered when Forecast is on, with blank metric cells
// dropped from both arrays together (never charted as 0).

import { forecastTimeColumn } from "./insights.js";
import { isNumber, isBlank } from "../lib/stats.js";

export function chartSeries(ds, rows, metric, { timeOrdered = false } = {}) {
  if (!ds || !Array.isArray(rows) || !metric) return { values: [], labels: [] };

  let ordered = rows;
  if (timeOrdered) {
    const time = forecastTimeColumn(ds);
    if (time) {
      ordered = rows
        .filter((r) => !isBlank(r?.[time.column]))
        .sort((a, b) => time.keyOf(a[time.column]) - time.keyOf(b[time.column]));
    }
  }

  const labelCol = ds.columns[0];
  const values = [];
  const labels = [];
  for (const row of ordered) {
    const v = row?.[metric];
    if (!isNumber(v)) continue;
    values.push(v);
    labels.push(isBlank(row?.[labelCol]) ? "" : String(row[labelCol]));
  }
  return { values, labels };
}
