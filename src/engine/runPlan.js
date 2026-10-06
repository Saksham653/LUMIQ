// The one calculation engine: pure, no React, runs a validated plan
// on every row. Blank cells are skipped (never counted as 0), and the
// steps list says in plain English exactly what was done.

import { applyFilterPlan, describeFilterPlan } from "../lib/filterPlan.js";
import { numericValues, sum, mean, min, max, isBlank } from "../lib/stats.js";

function median(values) {
  const nums = numericValues(values).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

const round2 = (x) => Math.round(x * 100) / 100;

function computeMeasure(measure, rows, grandTotals) {
  const vals = measure.column ? rows.map((r) => r?.[measure.column]) : null;
  switch (measure.op) {
    case "sum":
      return sum(vals);
    case "avg":
      return mean(vals);
    case "min":
      return min(vals);
    case "max":
      return max(vals);
    case "median":
      return median(vals);
    case "count":
      return measure.column ? vals.filter((v) => !isBlank(v)).length : rows.length;
    case "share": {
      const grand = grandTotals[measure.column];
      const part = sum(vals);
      if (!grand || part === null) return null;
      return round2((part / grand) * 100);
    }
    default:
      return null;
  }
}

function measureStep(measure) {
  switch (measure.op) {
    case "sum":
      return `Added up ${measure.column}`;
    case "avg":
      return `Averaged ${measure.column}`;
    case "min":
      return `Found the lowest ${measure.column}`;
    case "max":
      return `Found the highest ${measure.column}`;
    case "median":
      return `Found the middle value of ${measure.column}`;
    case "count":
      return measure.column ? `Counted filled-in ${measure.column} values` : "Counted rows";
    case "share":
      return `Calculated each group's share of total ${measure.column}`;
    default:
      return "";
  }
}

function compareCells(a, b) {
  const aBlank = a === null || a === undefined;
  const bBlank = b === null || b === undefined;
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1; // blanks sort last either direction
  if (bBlank) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

// Runs a validated plan. Returns { table, rowsUsed, totalRows, steps }:
// table rows carry the groupBy columns plus one field per measure
// alias; rowsUsed is the row count after the filter; steps is the
// plain-English account of the calculation.
export function runPlan(rows, columns, plan) {
  const steps = [];
  const totalRows = Array.isArray(rows) ? rows.length : 0;
  let working = Array.isArray(rows) ? rows : [];

  if (plan.filter && plan.filter.conditions?.length) {
    working = applyFilterPlan(working, plan.filter);
    steps.push(`Kept rows where ${describeFilterPlan(plan.filter)} (${working.length} of ${totalRows} rows)`);
  }
  const rowsUsed = working.length;

  const groupBy = plan.groupBy || [];
  let groups;
  if (groupBy.length) {
    const map = new Map();
    for (const row of working) {
      const key = JSON.stringify(groupBy.map((c) => (isBlank(row?.[c]) ? null : row[c])));
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    groups = [...map.entries()].map(([key, groupRows]) => ({ keys: JSON.parse(key), rows: groupRows }));
    steps.push(`Grouped by ${groupBy.join(", ")} (${groups.length} group${groups.length === 1 ? "" : "s"})`);
  } else {
    groups = [{ keys: [], rows: working }];
  }

  // share compares each group against the total over all kept rows
  const grandTotals = {};
  for (const m of plan.measures) {
    if (m.op === "share") grandTotals[m.column] = sum(working.map((r) => r?.[m.column]));
  }

  let table = groups.map((g) => {
    const out = {};
    groupBy.forEach((c, i) => {
      out[c] = g.keys[i];
    });
    for (const m of plan.measures) {
      out[m.as] = computeMeasure(m, g.rows, grandTotals);
    }
    return out;
  });

  for (const m of plan.measures) steps.push(measureStep(m));

  if (plan.sort) {
    const { by, dir } = plan.sort;
    table = [...table].sort((a, b) => {
      const cmp = compareCells(a[by], b[by]);
      return dir === "asc" ? cmp : -cmp;
    });
    steps.push(`Sorted by ${by}, ${dir === "asc" ? "lowest" : "highest"} first`);
  }

  if (plan.limit && table.length > plan.limit) {
    table = table.slice(0, plan.limit);
    steps.push(`Kept the top ${plan.limit} of ${groups.length} rows`);
  }

  return { table, rowsUsed, totalRows, steps };
}
