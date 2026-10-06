// Main-thread side of the data worker (F13). Every call falls back
// to the same pure functions synchronously when Workers don't exist
// (tests, very old browsers), so behavior is identical either way.

import { buildUploadPreview, datasetFromPreview } from "../data/uploadPreview.js";
import { runPlan } from "../engine/runPlan.js";

export const workerSupported = () => typeof Worker !== "undefined";

let worker = null;
let seq = 0;
const pending = new Map(); // id -> { resolve, reject, onProgress }
let planCachedId = null; // dataset id whose rows the worker holds

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./dataWorker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const msg = e.data || {};
      const p = pending.get(msg.id);
      if (!p) return;
      if (msg.type === "progress") {
        p.onProgress?.(msg);
      } else {
        pending.delete(msg.id);
        if (msg.type === "done") p.resolve(msg.result);
        else p.reject(new Error(msg.message));
      }
    };
    worker.onerror = () => {
      const err = new Error("The data worker crashed. Falling back to the slow path.");
      for (const p of pending.values()) p.reject(err);
      pending.clear();
      worker.terminate();
      worker = null;
      planCachedId = null;
    };
  }
  return worker;
}

function workerCall(op, payload, onProgress) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, op, payload });
  });
}

// The Cancel button: kill the worker outright, reject whatever was
// in flight. The next call spawns a fresh worker.
export function cancelAllWork() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  planCachedId = null;
  const err = Object.assign(new Error("Cancelled."), { cancelled: true });
  for (const p of pending.values()) p.reject(err);
  pending.clear();
}

// Parse + type-detect a CSV for the upload preview, with progress.
export async function buildPreviewAsync(text, name, token, onProgress) {
  if (!workerSupported()) {
    const p = buildUploadPreview(text, name);
    onProgress?.({ stage: "parsing", rows: p.rowCount, pct: 99 });
    return { ...p, token };
  }
  const r = await workerCall("buildPreview", { token, text }, onProgress);
  return { name, columns: r.columns, rows: r.rows, rowCount: r.rowCount, types: r.types, token, workerHeld: true };
}

// Coerce the previewed rows into the final dataset. The worker still
// holds the raw rows under the preview token; if it was cancelled in
// between, coerce on the main thread instead — same result.
export async function datasetFromPreviewAsync(preview, types) {
  if (!workerSupported()) return datasetFromPreview(preview, types);
  const id = crypto.randomUUID();
  try {
    // An Excel preview was built on the main thread, so the worker
    // has no cached rows for it — send them along once.
    const fallback = preview.workerHeld ? {} : { rows: preview.rows, columns: preview.columns };
    const r = await workerCall("finishDataset", { token: preview.token, dsId: id, types, ...fallback });
    planCachedId = id;
    return {
      id,
      name: preview.name,
      icon: "📁",
      description: `${preview.rowCount} rows • ${preview.columns.length} columns`,
      columns: preview.columns,
      data: r.data,
      columnTypes: types,
    };
  } catch {
    return datasetFromPreview(preview, types);
  }
}

export function dropPreviewAsync(token) {
  if (!workerSupported() || !worker || !token) return;
  workerCall("dropPreview", { token }).catch(() => {});
}

// Ask's calculations: run the validated plan in the worker. Rows ride
// along only the first time per dataset; after that the worker's
// cached copy is used (zero copying for a freshly uploaded file).
export async function runPlanAsync(ds, plan) {
  if (!workerSupported()) return runPlan(ds.data, ds.columns, plan);
  const sendRows = planCachedId !== ds.id;
  if (sendRows) planCachedId = ds.id;
  try {
    const r = await workerCall("plan", {
      dsId: ds.id,
      columns: ds.columns,
      plan,
      rows: sendRows ? ds.data : undefined,
    });
    return r.result;
  } catch (err) {
    if (err?.cancelled) throw err;
    planCachedId = null;
    return runPlan(ds.data, ds.columns, plan); // worker hiccup → same engine, main thread
  }
}
