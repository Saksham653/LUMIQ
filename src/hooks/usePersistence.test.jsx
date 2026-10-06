// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import { usePersistence } from "./usePersistence.js";
import { storageGet, storageSet, storageClear, storageKeys } from "../lib/storage.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

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

const makeDs = (id, name) => ({
  id, name, icon: "📁", description: "2 rows • 2 columns",
  columns: ["a", "b"],
  data: [{ a: 1, b: "x" }, { a: 2, b: "y" }],
  columnTypes: { a: { type: "number" }, b: { type: "text" } },
});
const DS = makeDs("ds-mine", "mine");

const mountReady = async () => {
  render(<Harness />);
  await waitFor(() => expect(api.ready).toBe(true));
};

afterEach(async () => {
  cleanup();
  for (const k of Object.keys(api)) delete api[k];
  try { await storageClear(); } catch { }
  try { localStorage.clear(); } catch { }
});

describe("usePersistence (F16)", () => {
  it("saves work and a remount (reload) restores it", async () => {
    await mountReady();
    await act(async () => { api.setUploadedDatasets([DS]); });
    await act(async () => { api.setActiveDataset(DS); api.setActiveTab("oracle"); });
    await waitFor(async () => {
      expect(await storageGet("datasets")).toEqual([DS]);
      expect(await storageGet("selected")).toEqual({ datasetId: "ds-mine", activeTab: "oracle" });
    });

    cleanup(); // "reload"
    for (const k of Object.keys(api)) delete api[k];
    render(<Harness />);
    await waitFor(() => {
      expect(api.uploadedDatasets).toEqual([DS]);
      expect(api.activeDataset?.id).toBe("ds-mine");
    });
  });

  it("Ask history is kept per dataset id across a reload", async () => {
    await storageSet("datasets", [DS]);
    await storageSet("selected", { datasetId: "ds-mine", activeTab: "oracle" });
    await storageSet("askHistory:ds-mine", [{ role: "user", content: "old question" }]);

    render(<Harness />);
    await waitFor(() => {
      expect(api.oracleMessages).toEqual([{ role: "user", content: "old question" }]);
    });
  });

  it("two uploads with the same name keep separate histories (B5-7)", async () => {
    const A = makeDs("id-a", "sales");
    const B = makeDs("id-b", "sales"); // same display name, different id
    await mountReady();
    await act(async () => { api.setUploadedDatasets([A, B]); api.setActiveDataset(A); });
    await act(async () => { api.setOracleMessages([{ role: "user", content: "question for A" }]); });

    await act(async () => { api.setActiveDataset(B); }); // saves A's chat, loads B's (empty)
    await waitFor(() => expect(api.oracleMessages).toEqual([]));
    await act(async () => { api.setOracleMessages([{ role: "user", content: "question for B" }]); });

    await act(async () => { api.setActiveDataset(A); });
    await waitFor(() => expect(api.oracleMessages).toEqual([{ role: "user", content: "question for A" }]));
    expect(await storageGet("askHistory:id-a")).toEqual([{ role: "user", content: "question for A" }]);
    expect(await storageGet("askHistory:id-b")).toEqual([{ role: "user", content: "question for B" }]);
  });

  it("a sample and an upload with the same name don't collide (B5-7)", async () => {
    const sample = SAMPLE_DATASETS.sales;
    const clone = makeDs("id-up", sample.name); // upload named exactly like the sample
    await mountReady();
    await act(async () => { api.setUploadedDatasets([clone]); api.setActiveDataset(sample); });
    await act(async () => { api.setOracleMessages([{ role: "user", content: "sample chat" }]); });
    await act(async () => { api.setActiveDataset(clone); });
    await waitFor(() => expect(api.oracleMessages).toEqual([]));
    await act(async () => { api.setOracleMessages([{ role: "user", content: "upload chat" }]); });
    await act(async () => { api.setActiveDataset(sample); });
    await waitFor(() => expect(api.oracleMessages).toEqual([{ role: "user", content: "sample chat" }]));
    expect(await storageGet(`askHistory:${sample.id}`)).toEqual([{ role: "user", content: "sample chat" }]);
    expect(await storageGet("askHistory:id-up")).toEqual([{ role: "user", content: "upload chat" }]);
  });

  it("old name-keyed data is migrated on first load without losing anything (B5-7)", async () => {
    // pre-B5-7 shape: no ids anywhere
    const legacy = { ...makeDs(undefined, "legacy") };
    delete legacy.id;
    await storageSet("datasets", [legacy]);
    await storageSet("selected", { datasetName: "legacy", activeTab: "oracle" });
    await storageSet("askHistory:legacy", [{ role: "user", content: "legacy question" }]);
    await storageSet(`askHistory:${SAMPLE_DATASETS.sales.name}`, [{ role: "user", content: "legacy sample chat" }]);

    render(<Harness />);
    await waitFor(() => {
      expect(api.uploadedDatasets).toHaveLength(1);
      expect(api.uploadedDatasets[0].id).toBeTruthy();
      expect(api.activeDataset?.name).toBe("legacy");
      expect(api.oracleMessages).toEqual([{ role: "user", content: "legacy question" }]);
    });
    const id = api.uploadedDatasets[0].id;
    expect(await storageGet(`askHistory:${id}`)).toEqual([{ role: "user", content: "legacy question" }]);
    expect(await storageGet("askHistory:legacy")).toBeUndefined();
    expect((await storageGet("selected")).datasetId).toBe(id);
    // the sample's old name-keyed chat moved to its stable id
    expect(await storageGet(`askHistory:${SAMPLE_DATASETS.sales.id}`)).toEqual([{ role: "user", content: "legacy sample chat" }]);
    expect(await storageGet(`askHistory:${SAMPLE_DATASETS.sales.name}`)).toBeUndefined();
  });

  it("delete everything leaves nothing stored (IndexedDB and the key)", async () => {
    try { localStorage.setItem("lumiq_groq_api_key", "remembered"); } catch { }
    await mountReady();
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
