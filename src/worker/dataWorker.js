// The data worker (F13): parsing, type detection and plan running
// happen here, off the main thread, so the app never freezes on a
// big file. Built by Vite as a same-origin module worker — the CSP's
// script-src 'self' allows it (no blob workers).

import { parseCsvTextChunked } from "../data/csv.js";
import { detectColumnTypes, coerceRows } from "../data/columnTypes.js";
import { runPlan } from "../engine/runPlan.js";

// Raw preview rows wait here between "preview" and "load", so
// confirming never re-sends the file from the main thread.
const previews = new Map(); // token -> { columns, rows }

// Coerced rows of the one most recent dataset, so Ask questions on a
// big upload run plans with no row copying at all.
let planCache = null; // { dsId, columns, rows }

self.onmessage = (e) => {
  const { id, op, payload } = e.data || {};
  const progress = (info) => self.postMessage({ id, type: "progress", ...info });
  const done = (result) => self.postMessage({ id, type: "done", result });
  try {
    if (op === "buildPreview") {
      const { token, text } = payload;
      // 1 MB chunks so the progress bar ticks ~once per MB
      const { columns, rows } = parseCsvTextChunked(text, (count, cursor, total) => {
        progress({ stage: "parsing", rows: count, pct: total ? Math.min(99, Math.round((cursor / total) * 100)) : 0 });
      }, { chunkSize: 1024 * 1024 });
      if (columns.length === 0 || rows.length === 0) {
        throw new Error("No data rows found in this CSV.");
      }
      progress({ stage: "typing", rows: rows.length, pct: 99 });
      const types = detectColumnTypes(rows, columns);
      previews.set(token, { columns, rows });
      done({ columns, rows, rowCount: rows.length, types });
    } else if (op === "finishDataset") {
      const { token, dsId, types, rows: fallbackRows, columns: fallbackColumns } = payload;
      const cached = previews.get(token);
      const columns = cached?.columns ?? fallbackColumns;
      const rows = cached?.rows ?? fallbackRows;
      if (!rows) throw new Error("preview-expired");
      const data = coerceRows(rows, columns, types);
      previews.delete(token);
      planCache = { dsId, columns, rows: data };
      done({ data });
    } else if (op === "plan") {
      const { dsId, columns, plan, rows } = payload;
      if (rows) planCache = { dsId, columns, rows };
      if (!planCache || planCache.dsId !== dsId) throw new Error("rows-not-cached");
      done({ result: runPlan(planCache.rows, planCache.columns, plan) });
    } else if (op === "dropPreview") {
      previews.delete(payload.token);
      done({});
    } else {
      throw new Error(`Unknown worker op: ${op}`);
    }
  } catch (err) {
    self.postMessage({ id, type: "error", message: err?.message || "Worker task failed." });
  }
};
