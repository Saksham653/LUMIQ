// No Worker exists in the test environment, so these exercise the
// fallback path — which must behave exactly like the worker path:
// same parse, same types, same plan results.

import { describe, it, expect } from "vitest";
import { buildPreviewAsync, datasetFromPreviewAsync, runPlanAsync, workerSupported, cancelAllWork } from "./workerClient.js";
import { buildUploadPreview, datasetFromPreview } from "../data/uploadPreview.js";
import { runPlan } from "../engine/runPlan.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const CSV = 'city,revenue\n"Lucknow, UP",1200\nDelhi,800\nPune,\n';

describe("workerClient fallback (F13)", () => {
  it("runs without Workers here, by design", () => {
    expect(workerSupported()).toBe(false);
  });

  it("buildPreviewAsync equals the synchronous preview", async () => {
    const progress = [];
    const a = await buildPreviewAsync(CSV, "cities", "tok-1", (m) => progress.push(m));
    const b = buildUploadPreview(CSV, "cities");
    expect(a.columns).toEqual(b.columns);
    expect(a.rows).toEqual(b.rows);
    expect(a.types).toEqual(b.types);
    expect(a.rowCount).toBe(3);
    expect(a.token).toBe("tok-1");
    expect(progress.length).toBeGreaterThan(0); // fallback still reports once
  });

  it("datasetFromPreviewAsync equals the synchronous dataset (minus the random id)", async () => {
    const p = await buildPreviewAsync(CSV, "cities", "tok-2");
    const a = await datasetFromPreviewAsync(p, p.types);
    const b = datasetFromPreview(p, p.types);
    expect(a.columns).toEqual(b.columns);
    expect(a.data).toEqual(b.data);
    expect(a.columnTypes).toEqual(b.columnTypes);
    expect(typeof a.id).toBe("string");
    expect(a.id).not.toBe(b.id);
  });

  it("runPlanAsync equals runPlan on the Sales sample", async () => {
    const ds = SAMPLE_DATASETS.sales;
    const plan = {
      groupBy: ["region"],
      measures: [{ op: "sum", column: "revenue", as: "total" }],
      sort: { by: "total", dir: "desc" },
    };
    const viaClient = await runPlanAsync(ds, plan);
    expect(viaClient).toEqual(runPlan(ds.data, ds.columns, plan));
    expect(viaClient.table[0].total).toBe(1331000); // South tops the regions, hand-checked
  });

  it("cancelAllWork is safe to call with nothing running", () => {
    expect(() => cancelAllWork()).not.toThrow();
  });
});
