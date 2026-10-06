// Keeps the user's work between visits (F16): uploaded datasets
// (rows + column types), Ask history per dataset (including the
// Show-the-work data), and the selected dataset and tab — all in
// IndexedDB via src/lib/storage.js. The API key is NOT handled here
// (it stays with the "Remember on this device" tick). If storage
// fails, the app keeps working and storageOk turns false so one
// line can say that nothing will be saved.

import { useEffect, useRef, useState } from "react";
import { storageGet, storageSet, storageClear, storageDelete } from "../lib/storage.js";
import { writeStoredApiKey } from "../lib/apiKeyStorage.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const LARGE_DATASET_BYTES = 50 * 1024 * 1024; // warn before saving over 50 MB

export function usePersistence({
  activeDataset, setActiveDataset,
  activeTab, setActiveTab,
  uploadedDatasets, setUploadedDatasets,
  oracleMessages, setOracleMessages,
  setAskContext,
}) {
  const [storageOk, setStorageOk] = useState(true);
  const [ready, setReady] = useState(false); // hydration finished
  const prevDsName = useRef(null);
  const declinedLarge = useRef(new Set());
  const messagesRef = useRef(oracleMessages);
  messagesRef.current = oracleMessages;

  const guard = (work) =>
    Promise.resolve()
      .then(work)
      .catch(() => setStorageOk(false));

  // Hydrate once on boot.
  useEffect(() => {
    (async () => {
      try {
        const [datasets, selected] = await Promise.all([storageGet("datasets"), storageGet("selected")]);
        if (Array.isArray(datasets) && datasets.length) setUploadedDatasets(datasets);
        let ds = null;
        if (selected?.datasetName) {
          ds =
            (Array.isArray(datasets) ? datasets : []).find((d) => d.name === selected.datasetName) ||
            Object.values(SAMPLE_DATASETS).find((d) => d.name === selected.datasetName) ||
            null;
        }
        if (ds) {
          prevDsName.current = ds.name;
          setActiveDataset(ds);
          const history = await storageGet(`askHistory:${ds.name}`);
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
    const prev = prevDsName.current;
    const next = activeDataset?.name ?? null;
    if (prev === next) return;
    prevDsName.current = next;
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
    if (!ready || !storageOk || !activeDataset?.name) return;
    const name = activeDataset.name;
    const t = setTimeout(() => {
      guard(() => (messagesRef.current.length === 0 ? storageDelete(`askHistory:${name}`) : storageSet(`askHistory:${name}`, messagesRef.current)));
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
      if (declinedLarge.current.has(d.name)) return false;
      const ok = window.confirm(`"${d.name}" is about ${Math.round(size / 1024 / 1024)} MB. Saving it on this device may be slow. Save anyway?`);
      if (!ok) declinedLarge.current.add(d.name);
      return ok;
    });
    if (persistable.length === 0) { guard(() => storageDelete("datasets")); return; }
    guard(() => storageSet("datasets", persistable));
  }, [uploadedDatasets]);

  // Remember the selected dataset and screen.
  useEffect(() => {
    if (!ready || !storageOk) return;
    if (!activeDataset?.name) { guard(() => storageDelete("selected")); return; }
    guard(() => storageSet("selected", { datasetName: activeDataset.name, activeTab }));
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
    const isSample = Object.values(SAMPLE_DATASETS).some((d) => d.name === activeDataset?.name);
    if (activeDataset && !isSample) setActiveDataset(null);
  };

  return { storageOk, deleteEverything, ready };
}
