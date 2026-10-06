// CSV export of the rows on screen (F17). papaparse's unparse
// handles quoting, so "Lucknow, UP" round-trips.

import Papa from "papaparse";

export function rowsToCsv(columns, rows) {
  return Papa.unparse({
    fields: columns,
    data: rows.map((r) => columns.map((c) => (r?.[c] == null ? "" : r[c]))),
  });
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, columns, rows) {
  downloadBlob(filename, new Blob([rowsToCsv(columns, rows)], { type: "text/csv;charset=utf-8" }));
}
