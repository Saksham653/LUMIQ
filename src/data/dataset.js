// One shared way to build a dataset: columns, canonical rows and a
// columnTypes map decided from all rows. Everything that used to ask
// `typeof ds.data[0][c] === "number"` asks numericColumns(ds) instead.

import { parseCsvText } from "./csv.js";
import { detectColumnTypes, coerceRows, NUMERIC_TYPES } from "./columnTypes.js";

export function buildDataset({ name, icon, description, columns, rows }) {
  const columnTypes = detectColumnTypes(rows, columns);
  const data = coerceRows(rows, columns, columnTypes);
  return { name, icon, description, columns, data, columnTypes };
}

export function datasetFromCsv(text, name) {
  const { columns, rows } = parseCsvText(text);
  if (columns.length === 0 || rows.length === 0) {
    throw new Error("No data rows found in this CSV.");
  }
  return buildDataset({
    name,
    icon: "📁",
    description: `${rows.length} rows • ${columns.length} columns`,
    columns,
    rows,
  });
}

// Columns whose cells are numbers for calculation purposes
// (number, percent and money types).
export function numericColumns(ds) {
  if (!ds || !Array.isArray(ds.columns)) return [];
  return ds.columns.filter((c) => NUMERIC_TYPES.includes(ds.columnTypes?.[c]?.type));
}
