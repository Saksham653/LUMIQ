// Keeps the user's work between visits (F16): uploaded datasets
// (rows + column types), Ask history per dataset (including the
// Show-the-work data), and the selected dataset and tab — all in
// IndexedDB via src/lib/storage.js. Everything is keyed by the
// dataset's unique id, never its name, so two files with the same
// name never collide. The API key is NOT handled here (it stays
// with the "Remember on this device" tick). If storage fails, the
// app keeps working and storageOk turns false so one line can say
// that nothing will be saved.

import { useEffect, useRef, useState } from "react";
import { storageGet, storageSet, storageClear, storageDelete } from "../lib/storage.js";
import { writeStoredApiKey } from "../lib/apiKeyStorage.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const LARGE_DATASET_BYTES = 50 * 1024 * 1024; // warn before saving over 50 MB

// Pre-B5-7 storage was keyed by dataset NAME. On first load, give
// old entries an id, move their history to the id key, and point
// the old selection at the right id — nothing is lost.
async function migrateStored(datasets, selected) {
  const samples = Object.values(SAMPLE_DATASETS);
  const out = [];
  let changed = false;
  for (const d of Array.isArray(datasets) ? datasets : []) {
    if (d.id) {
      out.push(d);
      continue;
    }
    changed = true;
    const withId = { ...d, id: crypto.randomUUID() };
    out.push(withId);
    const history = await storageGet(`askHistory:${d.name}`);
    if (Array.isArray(history)) {
      await storageSet(`askHistory:${withId.id}`, history);
      await storageDelete(`askHistory:${d.name}`);
    }
  }
  if (changed) await storageSet("datasets", out);

  // Sample chats were stored under the sample's name too.
  for (const s of samples) {
    const history = await storageGet(`askHistory:${s.name}`);
    if (Array.isArray(history)) {
      await storageSet(`askHistory:${s.id}`, history);
      await storageDelete(`askHistory:${s.name}`);
    }
  }

  let sel = selected;
  if (sel && !sel.datasetId && sel.datasetName) {
    const hit = out.find((d) => d.name === sel.datasetName) || samples.find((s) => s.name === sel.datasetName);
    sel = { datasetId: hit?.id ?? null, activeTab: sel.activeTab };
    await storageSet("selected", sel);
  }
  return { datasets: out, selected: sel };
}

export function usePersistence({
  activeDataset, setActiveDataset,
  activeTab, setActiveTab,
  uploadedDatasets, setUploadedDatasets,
  oracleMessages, setOracleMessages,
  setAskContext,
}) {
  const [storageOk, setStorageOk] = useState(true);
  const [ready, setReady] = useState(false); // hydration finished
  const prevDsId = useRef(null);
  const declinedLarge = useRef(new Set());
  const messagesRef = useRef(oracleMessages);
  messagesRef.current = oracleMessages;

  const guard = (work) =>
    Promise.resolve()
      .then(work)
      .catch(() => setStorageOk(false));

  // Hydrate once on boot (migrating name-keyed data from before B5-7).
  useEffect(() => {
    (async () => {
      try {
        let [datasets, selected] = await Promise.all([storageGet("datasets"), storageGet("selected")]);
        ({ datasets, selected } = await migrateStored(datasets, selected));
        if (datasets.length) setUploadedDatasets(datasets);
        let ds = null;
        if (selected?.datasetId) {
          ds =
            datasets.find((d) => d.id === selected.datasetId) ||
            Object.values(SAMPLE_DATASETS).find((d) => d.id === selected.datasetId) ||
            null;
        }
        if (ds) {
          prevDsId.current = ds.id;
          setActiveDataset(ds);
          const history = await storageGet(`askHistory:${ds.id}`);
          if (Array.isArray(history)) setOracleMessages(history);
        }
        if (selected?.activeTab) setActiveTab(selected.activeTab);
      } catch {
        setStorageOk(false);
      }
      setReady(true);
    })();
  }, []);

  // Ask history is per dataset: switching saves the old chat and
  // loads the new one.
  useEffect(() => {
    const prev = prevDsId.current;
    const next = activeDataset?.id ?? null;
    if (prev === next) return;
    prevDsId.current = next;
    if (!ready) return;
    guard(async () => {
      if (prev) {
        // empty chats delete their key, so a wipe stays a wipe
        if (messagesRef.current.length) await storageSet(`askHistory:${prev}`, messagesRef.current);
        else await storageDelete(`askHistory:${prev}`);
      }
      const history = next ? await storageGet(`askHistory:${next}`) : [];
      setOracleMessages(Array.isArray(history) ? history : []);
    });
  }, [activeDataset]);

  // Save the current chat (debounced) under the active dataset.
  useEffect(() => {
    if (!ready || !storageOk || !activeDataset?.id) return;
    const id = activeDataset.id;
    const t = setTimeout(() => {
      guard(() => (messagesRef.current.length === 0 ? storageDelete(`askHistory:${id}`) : storageSet(`askHistory:${id}`, messagesRef.current)));
    }, 400);
    return () => clearTimeout(t);
  }, [oracleMessages]);

  // Save uploaded datasets; very large ones only after a confirm.
  useEffect(() => {
    if (!ready || !storageOk) return;
    const persistable = uploadedDatasets.filter((d) => {
      let size = 0;
      try { size = JSON.stringify(d.data).length; } catch { size = Infinity; }
      if (size <= LARGE_DATASET_BYTES) return true;
      if (declinedLarge.current.has(d.id)) return false;
      const ok = window.confirm(`"${d.name}" is about ${Math.round(size / 1024 / 1024)} MB. Saving it on this device may be slow. Save anyway?`);
      if (!ok) declinedLarge.current.add(d.id);
      return ok;
    });
    if (persistable.length === 0) { guard(() => storageDelete("datasets")); return; }
    guard(() => storageSet("datasets", persistable));
  }, [uploadedDatasets]);

  // Remember the selected dataset and screen.
  useEffect(() => {
    if (!ready || !storageOk) return;
    if (!activeDataset?.id) { guard(() => storageDelete("selected")); return; }
    guard(() => storageSet("selected", { datasetId: activeDataset.id, activeTab }));
  }, [activeDataset, activeTab]);

  // "Delete everything stored on this device": IndexedDB plus the
  // remembered key. The in-memory session keeps working.
  const deleteEverything = async () => {
    try { await storageClear(); } catch { }
    writeStoredApiKey("", false);
    declinedLarge.current = new Set();
    setUploadedDatasets([]);
    setOracleMessages([]);
    setAskContext([]);
    const isSample = Object.values(SAMPLE_DATASETS).some((d) => d.id === activeDataset?.id);
    if (activeDataset && !isSample) setActiveDataset(null);
  };

  return { storageOk, deleteEverything, ready };
}
