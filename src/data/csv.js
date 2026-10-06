// CSV reading via papaparse: quoted commas, CRLF line endings and a
// UTF-8 BOM are handled, empty lines are skipped, headers are
// trimmed. Values come back as raw strings; typing happens in
// columnTypes.js from all rows.

import Papa from "papaparse";

const BASE_OPTIONS = {
  header: true,
  skipEmptyLines: "greedy",
  transformHeader: (h) => String(h).trim(),
};

function stripBom(text) {
  return typeof text === "string" ? text.replace(/^﻿/, "") : "";
}

function dropUnnamed(fields) {
  return (fields || []).filter((f) => f !== "");
}

export function parseCsvText(text) {
  const res = Papa.parse(stripBom(text), { ...BASE_OPTIONS });
  const columns = dropUnnamed(res.meta?.fields);
  const rows = Array.isArray(res.data) ? res.data : [];
  return { columns, rows, errors: res.errors || [] };
}

// Same parse, delivered in chunks so a worker can report progress
// ("312,000 rows read…") while a big file loads. Output is identical
// to parseCsvText — the chunked test holds the two together.
export function parseCsvTextChunked(text, onProgress, { chunkSize } = {}) {
  const clean = stripBom(text);
  const rows = [];
  const errors = [];
  let fields = [];
  // papaparse guesses the newline from the first chunk only — with a
  // tiny chunk that holds no newline, CRLF files would keep stray \r
  // in values. Detect it from the whole text instead.
  const newline = clean.includes("\r\n") ? "\r\n" : clean.includes("\r") ? "\r" : "\n";
  Papa.parse(clean, {
    ...BASE_OPTIONS,
    newline,
    ...(chunkSize ? { chunkSize } : {}),
    chunk: (res) => {
      if (res.meta?.fields?.length) fields = res.meta.fields;
      for (const row of res.data) rows.push(row);
      // push one by one — spreading 100k errors from a malformed
      // file would blow the call stack
      for (const err of res.errors || []) errors.push(err);
      onProgress?.(rows.length, res.meta?.cursor ?? 0, clean.length);
    },
  });
  return { columns: dropUnnamed(fields), rows, errors };
}
