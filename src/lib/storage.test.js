// fake-indexeddb gives this test a real-behaving IndexedDB in Node.
import "fake-indexeddb/auto";
import { describe, it, expect, afterEach } from "vitest";
import { storageGet, storageSet, storageClear, storageKeys, storageDelete } from "./storage.js";

afterEach(async () => {
  try { await storageClear(); } catch { }
});

describe("storage.js (F16)", () => {
  it("data survives a 'reload' — a fresh read finds what was written", async () => {
    const dataset = {
      name: "mine",
      columns: ["a", "b"],
      data: [{ a: 1, b: "x" }, { a: null, b: "y" }],
      columnTypes: { a: { type: "number" }, b: { type: "text" } },
    };
    await storageSet("datasets", [dataset]);
    await storageSet("selected", { datasetName: "mine", activeTab: "oracle" });
    await storageSet("askHistory:mine", [{ role: "user", content: "q" }, { role: "assistant", content: "a", proof: { steps: ["s"], table: [], rowsUsed: 2, totalRows: 2, sent: [] } }]);

    // nothing cached in the module — every call reopens the DB, which
    // is exactly what a page reload does
    expect(await storageGet("datasets")).toEqual([dataset]);
    expect(await storageGet("selected")).toEqual({ datasetName: "mine", activeTab: "oracle" });
    expect((await storageGet("askHistory:mine"))[1].proof.steps).toEqual(["s"]);
  });

  it("delete everything leaves nothing", async () => {
    await storageSet("datasets", [1]);
    await storageSet("askHistory:x", [2]);
    await storageClear();
    expect(await storageKeys()).toEqual([]);
    expect(await storageGet("datasets")).toBeUndefined();
  });

  it("single-key delete works", async () => {
    await storageSet("a", 1);
    await storageSet("b", 2);
    await storageDelete("a");
    expect(await storageGet("a")).toBeUndefined();
    expect(await storageGet("b")).toBe(2);
  });

  it("storage failure rejects cleanly and does not crash", async () => {
    const real = globalThis.indexedDB;
    try {
      globalThis.indexedDB = { open() { throw new Error("blocked by private browsing"); } };
      await expect(storageGet("datasets")).rejects.toThrow();
      await expect(storageSet("k", 1)).rejects.toThrow();
    } finally {
      globalThis.indexedDB = real;
    }
  });
});
