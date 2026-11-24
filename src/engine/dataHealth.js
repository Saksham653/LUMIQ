// The Data health score (F15), rebuilt from four checks that can
// each be explained in one sentence. Start at 100 and deduct:
//  - empty cells: one point per percent of a column that is empty
//    ("−6: 6 of 100 cells in revenue are empty")
//  - repeated rows: half a point per percent of rows that are exact
//    repeats
//  - mixed types: a flat −5 per text column that mixes numbers and
//    words (10–90% of its values look numeric)
//  - unusual values: −2 per robust outlier (median/MAD, |z| > 3.5),
//    capped at −10
// Every lost point is listed in plain words. The old "many
// different values" scoring is gone.
// Each deduction also carries its check (`kind`) and the raw `facts`
// behind the words, with up to five example rows (1-based), so the
// phone app can word it in English or Hindi and show where it is.

import { NUMERIC_TYPES, parseNumericString } from "../data/columnTypes.js";
import { numericEntries, median, isBlank } from "../lib/stats.js";
import { numericColumns } from "../data/dataset.js";

const UNUSUAL_Z = 3.5;
const EXAMPLES = 5;

export function computeHealth(ds) {
  const deductions = [];
  const rows = ds.data.length;
  if (rows === 0) {
    return { score: 0, deductions: [{ points: 100, text: "The dataset has no rows.", kind: "noRows", facts: {} }] };
  }

  // 1. Empty cells, per column
  for (const col of ds.columns) {
    const emptyRows = [];
    ds.data.forEach((r, i) => { if (isBlank(r?.[col])) emptyRows.push(i + 1); });
    const empty = emptyRows.length;
    if (empty === 0) continue;
    const points = Math.max(1, Math.round((empty / rows) * 100));
    deductions.push({
      points,
      text: `${empty} of ${rows} cells in ${col} are empty`,
      kind: "empty",
      facts: { column: col, empty, rows, examples: emptyRows.slice(0, EXAMPLES) },
    });
  }

  // 2. Repeated rows
  const seen = new Set();
  const repeatRows = [];
  ds.data.forEach((r, i) => {
    const key = JSON.stringify(ds.columns.map((c) => r?.[c] ?? null));
    if (seen.has(key)) repeatRows.push(i + 1);
    else seen.add(key);
  });
  const repeats = repeatRows.length;
  if (repeats > 0) {
    const points = Math.max(1, Math.round((repeats / rows) * 50));
    deductions.push({
      points,
      text: `${repeats} of ${rows} rows are exact repeats`,
      kind: "repeats",
      facts: { repeats, rows, examples: repeatRows.slice(0, EXAMPLES) },
    });
  }

  // 3. Mixed types in text columns
  for (const col of ds.columns) {
    if (NUMERIC_TYPES.includes(ds.columnTypes?.[col]?.type)) continue;
    const nonBlank = ds.data.map((r) => r?.[col]).filter((v) => !isBlank(v));
    if (nonBlank.length === 0) continue;
    const numericish = nonBlank.filter((v) => parseNumericString(v)).length;
    const share = numericish / nonBlank.length;
    if (share >= 0.1 && share <= 0.9) {
      deductions.push({
        points: 5,
        text: `${col} mixes numbers and text (${numericish} of ${nonBlank.length} values look like numbers)`,
        kind: "mixed",
        facts: { column: col, numericish, total: nonBlank.length },
      });
    }
  }

  // 4. Unusual values (robust, median-based — one outlier cannot
  // hide itself by dragging the average)
  let unusualPoints = 0;
  for (const col of numericColumns(ds)) {
    const entries = numericEntries(ds.data, col);
    if (entries.length < 5) continue;
    const values = entries.map((e) => e.value);
    const med = median(values);
    const mad = median(values.map((v) => Math.abs(v - med)));
    if (!mad) continue;
    const unusual = entries.filter((e) => Math.abs((0.6745 * (e.value - med)) / mad) > UNUSUAL_Z);
    const outliers = unusual.length;
    if (outliers === 0) continue;
    const points = Math.min(2 * outliers, 10 - unusualPoints);
    if (points <= 0) break;
    unusualPoints += points;
    deductions.push({
      points,
      text: `${outliers} unusual value${outliers === 1 ? "" : "s"} in ${col}`,
      kind: "unusual",
      facts: {
        column: col,
        count: outliers,
        typical: med,
        examples: unusual.slice(0, EXAMPLES).map((e) => ({ row: e.index + 1, value: e.value })),
      },
    });
  }

  const lost = deductions.reduce((a, d) => a + d.points, 0);
  return { score: Math.max(0, 100 - lost), deductions };
}
