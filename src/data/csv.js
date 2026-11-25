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

// Every record as a plain list of cells, row 1 included, so a reader can
// choose which row holds the headings (a title line above the table is
// common in exported reports). Same records as parseCsvText: the same
// separator guess, empty lines skipped, a UTF-8 BOM stripped. Cells are
// raw strings.
export function parseCsvGrid(text) {
  const res = Papa.parse(stripBom(text), { header: false, skipEmptyLines: "greedy" });
  const grid = Array.isArray(res.data) ? res.data : [];
  return { grid, errors: res.errors || [], delimiter: res.meta?.delimiter ?? "," };
}

function stopped(code, message) {
  return Object.assign(new Error(message), { code });
}

// parseCsvGrid in chunks, waiting a moment between chunks so a phone keeps
// drawing (a progress line, a Cancel button) while a big file is read.
// onProgress(rowsRead, charactersRead, totalCharacters) after each chunk.
// isCancelled() is asked between chunks: the promise then fails with
// code "cancelled". More than maxRows records fail with code
// "too-many-rows" as soon as they are seen. The result equals
// parseCsvGrid's (the chunked test holds the two together).
/**
 * @param {string} text
 * @param {{ onProgress?: (rows: number, cursor: number, total: number) => void, isCancelled?: () => boolean, maxRows?: number, chunkSize?: number }} [options]
 */
export function parseCsvGridAsync(text, { onProgress, isCancelled, maxRows, chunkSize = 256 * 1024 } = {}) {
  const clean = stripBom(text);
  // As in parseCsvTextChunked: papaparse would guess the line ending from
  // the first chunk only.
  const newline = clean.includes("\r\n") ? "\r\n" : clean.includes("\r") ? "\r" : "\n";
  return new Promise((resolve, reject) => {
    const grid = [];
    const errors = [];
    let delimiter = ",";
    let settled = false;
    const fail = (error, parser) => {
      if (settled) return;
      settled = true;
      try {
        parser?.abort();
      } catch {
        // already stopped
      }
      reject(error);
    };
    Papa.parse(clean, {
      header: false,
      skipEmptyLines: "greedy",
      newline,
      chunkSize,
      chunk: (res, parser) => {
        if (settled) return;
        if (res.meta?.delimiter) delimiter = res.meta.delimiter;
        for (const row of res.data) grid.push(row);
        for (const err of res.errors || []) errors.push(err);
        if (typeof maxRows === "number" && grid.length > maxRows + 1) {
          fail(stopped("too-many-rows", "This file has too many rows."), parser);
          return;
        }
        onProgress?.(grid.length, res.meta?.cursor ?? 0, clean.length);
        parser.pause();
        setTimeout(() => {
          if (settled) return;
          if (isCancelled?.()) {
            fail(stopped("cancelled", "Cancelled."), parser);
            return;
          }
          parser.resume();
        }, 0);
      },
      complete: () => {
        if (settled) return;
        settled = true;
        resolve({ grid, errors, delimiter });
      },
      error: (err) => fail(err instanceof Error ? err : new Error(String(err))),
    });
  });
}
