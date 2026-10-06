// The only dataset context the AI ever sees: column names, types,
// row count and per-column summaries (min/max/average for numbers,
// top values for text), all computed on ALL rows in the browser.
// No raw rows are ever included.

import { NUMERIC_TYPES } from "../data/columnTypes.js";
import { mean, min, max, isBlank } from "../lib/stats.js";

const round2 = (x) => (x === null || x === undefined ? null : Math.round(x * 100) / 100);

export function buildSchemaSummary(ds) {
  const rowCount = ds.data.length;
  const columns = ds.columns.map((col) => {
    const info = ds.columnTypes?.[col] || { type: "text" };
    const values = ds.data.map((r) => r?.[col]);
    const blanks = values.filter(isBlank).length;
    const entry = { name: col, type: info.type, blanks };
    if (NUMERIC_TYPES.includes(info.type)) {
      entry.min = round2(min(values));
      entry.max = round2(max(values));
      entry.avg = round2(mean(values));
    } else {
      const freq = new Map();
      for (const v of values) {
        if (isBlank(v)) continue;
        const key = String(v);
        freq.set(key, (freq.get(key) || 0) + 1);
      }
      entry.unique = freq.size;
      entry.top = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
    }
    return entry;
  });
  return { name: ds.name, rowCount, columns };
}

const fmt = (v) => (v === null || v === undefined ? "—" : String(v));

// Renders the summary as the plain text block that goes into prompts
// (and that "What was sent" shows the user).
export function renderSchemaSummary(summary) {
  const lines = [`Dataset: ${summary.name} (${summary.rowCount} rows)`, "Columns:"];
  for (const c of summary.columns) {
    const blanks = c.blanks ? `, ${c.blanks} blank` : "";
    if (c.top) {
      const top = c.top.map((t) => `${t.value} (${t.count}×)`).join(", ");
      lines.push(`- ${c.name} (${c.type}): ${c.unique} unique values${blanks}; most common: ${top}`);
    } else {
      lines.push(`- ${c.name} (${c.type}): min ${fmt(c.min)}, max ${fmt(c.max)}, average ${fmt(c.avg)}${blanks}`);
    }
  }
  return lines.join("\n");
}

// Numbers a describe-style answer may legitimately quote.
export function schemaNumberCandidates(summary) {
  const out = [summary.rowCount, summary.columns.length];
  for (const c of summary.columns) {
    for (const key of ["min", "max", "avg"]) {
      if (typeof c[key] === "number") out.push(c[key]);
    }
    if (typeof c.unique === "number") out.push(c.unique);
    if (typeof c.blanks === "number") out.push(c.blanks);
    for (const t of c.top || []) out.push(t.count);
  }
  return out;
}
