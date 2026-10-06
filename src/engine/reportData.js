// The Report's headline numbers (F17), every one computed by the
// engine with a footnote saying exactly how: "Sum of revenue across
// all 12 rows (blank cells skipped)." Rate-like columns are
// averaged per the F9 rule.

import { numericColumns } from "../data/dataset.js";
import { aggregationRule } from "../data/columnTypes.js";
import { sum, mean } from "../lib/stats.js";

export function buildReportData(ds) {
  const rowCount = ds.data.length;
  const items = [];

  items.push({
    label: "Rows",
    value: rowCount,
    typeInfo: { type: "number" },
    footnote: `Count of rows in ${ds.name}.`,
  });

  for (const col of numericColumns(ds)) {
    const rule = aggregationRule(col, ds.columnTypes?.[col]);
    const values = ds.data.map((r) => r?.[col]);
    if (rule === "avg") {
      items.push({
        label: `Average ${col}`,
        value: mean(values),
        typeInfo: ds.columnTypes?.[col],
        footnote: `Average of ${col} across all ${rowCount} rows (blank cells skipped).`,
      });
    } else {
      items.push({
        label: `Total ${col}`,
        value: sum(values),
        typeInfo: ds.columnTypes?.[col],
        footnote: `Sum of ${col} across all ${rowCount} rows (blank cells skipped).`,
      });
    }
  }

  return { rowCount, items };
}

// The numbers an AI summary may quote.
export function reportCandidates(report) {
  return report.items.map((i) => i.value).filter((v) => typeof v === "number");
}
