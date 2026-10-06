// The what-if calculator (F14): pick a measure, a percent change,
// and optionally one group ("only region North"). The engine
// recalculates before and after on ALL rows — per group and in
// total. No invented probabilities, no AI arithmetic; the AI may
// only word the finished table.

import { runPlan } from "./runPlan.js";
import { aggregationRule } from "../data/columnTypes.js";
import { sum, mean } from "../lib/stats.js";

export function computeWhatIf(ds, { measure, changePct, groupColumn, groupValue }) {
  const rule = aggregationRule(measure, ds.columnTypes?.[measure]);
  const factor = 1 + changePct / 100;
  const limited = groupColumn && groupValue != null && groupValue !== "";
  const affected = (row) => !limited || String(row?.[groupColumn] ?? "") === String(groupValue);

  // Rate-like columns are averaged, never summed (F9's rule).
  const agg = rule === "avg" ? mean : sum;

  const afterRows = ds.data.map((row) => {
    if (!affected(row)) return row;
    const v = row?.[measure];
    return typeof v === "number" ? { ...row, [measure]: v * factor } : row;
  });

  const total = {
    group: "Total",
    before: agg(ds.data.map((r) => r?.[measure])),
    after: agg(afterRows.map((r) => r?.[measure])),
  };

  let rows = [];
  if (groupColumn) {
    const plan = { groupBy: [groupColumn], measures: [{ op: rule === "avg" ? "avg" : "sum", column: measure, as: "v" }] };
    const before = runPlan(ds.data, ds.columns, plan).table;
    const after = runPlan(afterRows, ds.columns, plan).table;
    const afterByGroup = new Map(after.map((r) => [String(r[groupColumn]), r.v]));
    rows = before.map((r) => ({
      group: String(r[groupColumn]),
      before: r.v,
      after: afterByGroup.get(String(r[groupColumn])) ?? r.v,
    }));
  }

  const withDiff = (r) => ({ ...r, diff: (r.after ?? 0) - (r.before ?? 0) });
  return { rule, rows: rows.map(withDiff), total: withDiff(total) };
}

// "+10% revenue, only region North" in plain words.
export function describeWhatIf({ measure, changePct, groupColumn, groupValue }) {
  const sign = changePct >= 0 ? "+" : "";
  const scope = groupColumn && groupValue ? `, only ${groupColumn} ${groupValue}` : ", across all rows";
  return `${sign}${changePct}% ${measure}${scope}`;
}
