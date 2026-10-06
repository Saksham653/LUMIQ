// The upload preview (rest of F6): parse the file, detect types from
// all rows, surface plain warnings, and let the user override a
// column's type before anything is loaded. Overrides travel with the
// dataset (columnTypes), so every screen follows them.

import { parseCsvText } from "./csv.js";
import { detectColumnTypes, coerceRows, parseNumericString, NUMERIC_TYPES } from "./columnTypes.js";
import { isBlank } from "../lib/stats.js";

export const COLUMN_TYPE_CHOICES = Object.freeze(["number", "percent", "money", "date", "text"]);

export function buildUploadPreview(text, name) {
  const { columns, rows } = parseCsvText(text);
  if (columns.length === 0 || rows.length === 0) {
    throw new Error("No data rows found in this CSV.");
  }
  return { name, columns, rows, rowCount: rows.length, types: detectColumnTypes(rows, columns) };
}

// A type change keeps a detected currency symbol when money stays
// money; otherwise the override is just the chosen type.
export function overrideColumnType(types, column, newType) {
  const prev = types[column] || { type: "text" };
  if (prev.type === newType) return types;
  const next = newType === "money" && prev.symbol ? { type: "money", symbol: prev.symbol } : { type: newType };
  return { ...types, [column]: next };
}

// Plain warnings with honest counts: empty cells per column, and
// values a numeric-typed column cannot read as numbers.
export function previewWarnings(preview, types) {
  const warnings = [];
  for (const col of preview.columns) {
    const numeric = NUMERIC_TYPES.includes(types[col]?.type);
    let empty = 0;
    let unreadable = 0;
    for (const row of preview.rows) {
      const v = row?.[col];
      if (isBlank(v)) {
        empty++;
      } else if (numeric && !parseNumericString(v)) {
        unreadable++;
      }
    }
    if (empty > 0) {
      warnings.push({ column: col, text: `${empty} empty cell${empty === 1 ? "" : "s"} in ${col}` });
    }
    if (unreadable > 0) {
      const tail = unreadable === 1 ? "value in " + col + " could not be read as a number" : "values in " + col + " could not be read as numbers";
      warnings.push({ column: col, text: `${unreadable} ${tail}` });
    }
  }
  return warnings;
}

export function datasetFromPreview(preview, types) {
  const data = coerceRows(preview.rows, preview.columns, types);
  return {
    name: preview.name,
    icon: "📁",
    description: `${preview.rows.length} rows • ${preview.columns.length} columns`,
    columns: preview.columns,
    data,
    columnTypes: types,
  };
}
