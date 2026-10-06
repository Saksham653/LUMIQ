// CSV reading via papaparse: quoted commas, CRLF line endings and a
// UTF-8 BOM are handled, empty lines are skipped, headers are
// trimmed. Values come back as raw strings; typing happens in
// columnTypes.js from all rows.

import Papa from "papaparse";

export function parseCsvText(text) {
  const clean = typeof text === "string" ? text.replace(/^﻿/, "") : "";
  const res = Papa.parse(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => String(h).trim(),
  });
  // Columns with an empty header have no addressable name — drop them
  const columns = (res.meta?.fields || []).filter((f) => f !== "");
  const rows = Array.isArray(res.data) ? res.data : [];
  return { columns, rows, errors: res.errors || [] };
}
