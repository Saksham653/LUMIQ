// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import { usePersistence } from "./usePersistence.js";
import { storageGet, storageSet, storageClear, storageKeys } from "../lib/storage.js";

const api = {};

function Harness() {
  const [activeDataset, setActiveDataset] = useState(null);
  const [activeTab, setActiveTab] = useState("canvas");
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [oracleMessages, setOracleMessages] = useState([]);
  const [askContext, setAskContext] = useState([]);
  const persistence = usePersistence({
    activeDataset, setActiveDataset, activeTab, setActiveTab,
    uploadedDatasets, setUploadedDatasets, oracleMessages, setOracleMessages, setAskContext,
  });
  Object.assign(api, persistence, {
    activeDataset, setActiveDataset, setActiveTab, uploadedDatasets, setUploadedDatasets,
    oracleMessages, setOracleMessages, askContext,
  });
  return null;
}

const DS = {
  name: "mine", icon: "📁", description: "2 rows • 2 columns",
  columns: ["a", "b"],
  data: [{ a: 1, b: "x" }, { a: 2, b: "y" }],
  columnTypes: { a: { type: "number" }, b: { type: "text" } },
};

afterEach(async () => {
  cleanup();
  for (const k of Object.keys(api)) delete api[k];
  try { await storageClear(); } catch { }
  try { localStorage.clear(); } catch { }
});

describe("usePersistence (F16)", () => {
  it("saves work and a remount (reload) restores it", async () => {
    render(<Harness />);
    await waitFor(() => expect(api.ready).toBe(true));
    await act(async () => { api.setUploadedDatasets([DS]); });
    await act(async () => { api.setActiveDataset(DS); api.setActiveTab("oracle"); });
    await waitFor(async () => {
      expect(await storageGet("datasets")).toEqual([DS]);
      expect(await storageGet("selected")).toEqual({ datasetName: "mine", activeTab: "oracle" });
    });

    cleanup(); // "reload"
    for (const k of Object.keys(api)) delete api[k];
    render(<Harness />);
    await waitFor(() => {
      expect(api.uploadedDatasets).toEqual([DS]);
      expect(api.activeDataset?.name).toBe("mine");
    });
  });

  it("Ask history is kept per dataset across a reload", async () => {
    await storageSet("datasets", [DS]);
    await storageSet("selected", { datasetName: "mine", activeTab: "oracle" });
    await storageSet("askHistory:mine", [{ role: "user", content: "old question" }]);

    render(<Harness />);
    await waitFor(() => {
      expect(api.oracleMessages).toEqual([{ role: "user", content: "old question" }]);
    });
  });

  it("delete everything leaves nothing stored (IndexedDB and the key)", async () => {
    try { localStorage.setItem("lumiq_groq_api_key", "remembered"); } catch { }
    render(<Harness />);
    await waitFor(() => expect(api.ready).toBe(true));
    await act(async () => { api.setUploadedDatasets([DS]); api.setActiveDataset(DS); });
    await act(async () => { api.setOracleMessages([{ role: "user", content: "q" }]); });
    await waitFor(async () => { expect(await storageGet("datasets")).toEqual([DS]); });

    await act(async () => { await api.deleteEverything(); });
    await waitFor(async () => { expect(await storageKeys()).toEqual([]); });
    expect(localStorage.getItem("lumiq_groq_api_key")).toBeNull();
    expect(api.uploadedDatasets).toEqual([]);
    expect(api.oracleMessages).toEqual([]);
  });

  it("storage failure flips storageOk and never crashes the app", async () => {
    const real = globalThis.indexedDB;
    globalThis.indexedDB = { open() { throw new Error("private browsing"); } };
    try {
      render(<Harness />);
      await waitFor(() => { expect(api.storageOk).toBe(false); });
      // the app keeps working: state changes still apply in memory
      await act(async () => { api.setUploadedDatasets([DS]); });
      expect(api.uploadedDatasets).toEqual([DS]);
    } finally {
      globalThis.indexedDB = real;
    }
  });
});
