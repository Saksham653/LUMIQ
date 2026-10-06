import { describe, it, expect } from "vitest";
import { computeHealth } from "./dataHealth.js";
import { buildDataset } from "../data/dataset.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const ds = (columns, rows) => buildDataset({ name: "t", icon: "", description: "", columns, rows });

describe("computeHealth (F15)", () => {
  it("a clean file scores 100 with no deductions", () => {
    const clean = ds(["g", "v"], [
      { g: "a", v: 10 }, { g: "b", v: 12 }, { g: "c", v: 11 },
      { g: "d", v: 13 }, { g: "e", v: 9 },
    ]);
    const h = computeHealth(clean);
    expect(h.score).toBe(100);
    expect(h.deductions).toEqual([]);
  });

  it("the samples score honestly: real robust outliers cost points", () => {
    // Feb's avg_order_value (128.6) really is far from the tight
    // 137-141 cluster — the score says so instead of hiding it.
    const sales = computeHealth(SAMPLE_DATASETS.sales);
    expect(sales.score).toBe(98);
    expect(sales.deductions).toEqual([{ points: 2, text: "1 unusual value in avg_order_value" }]);
    // Marketing has wide spreads everywhere — nothing unusual.
    expect(computeHealth(SAMPLE_DATASETS.marketing).score).toBe(100);
  });

  it("empty cells cost one point per percent of the column, with the message", () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ g: `g${i}`, revenue: i < 6 ? null : i }));
    const h = computeHealth(ds(["g", "revenue"], rows));
    const d = h.deductions.find((x) => x.text.includes("revenue"));
    expect(d.points).toBe(6);
    expect(d.text).toBe("6 of 100 cells in revenue are empty");
    expect(h.score).toBe(94);
  });

  it("repeated rows cost half a point per percent", () => {
    const base = Array.from({ length: 16 }, (_, i) => ({ g: `g${i}`, v: i }));
    const rows = [...base, { g: "g0", v: 0 }, { g: "g1", v: 1 }, { g: "g2", v: 2 }, { g: "g3", v: 3 }]; // 4 repeats of 20
    const h = computeHealth(ds(["g", "v"], rows));
    const d = h.deductions.find((x) => x.text.includes("repeats"));
    expect(d.text).toBe("4 of 20 rows are exact repeats");
    expect(d.points).toBe(10); // 20% × 0.5
    expect(h.score).toBe(90);
  });

  it("a text column mixing numbers and words costs a flat 5 with counts", () => {
    const rows = [
      { code: "A1X", v: 1 }, { code: "12", v: 2 }, { code: "B2Y", v: 3 },
      { code: "34", v: 4 }, { code: "C3Z", v: 5 },
    ];
    const h = computeHealth(ds(["code", "v"], rows));
    const d = h.deductions.find((x) => x.text.includes("mixes"));
    expect(d.points).toBe(5);
    expect(d.text).toBe("code mixes numbers and text (2 of 5 values look like numbers)");
    expect(h.score).toBe(95);
  });

  it("unusual values cost 2 each, capped at 10", () => {
    const rows = [98, 101, 99, 102, 100, 97, 103, 5000].map((v, i) => ({ g: `g${i}`, v }));
    const h = computeHealth(ds(["g", "v"], rows));
    const d = h.deductions.find((x) => x.text.includes("unusual"));
    expect(d.points).toBe(2);
    expect(d.text).toBe("1 unusual value in v");
    expect(h.score).toBe(98);
  });

  it("the score never goes below zero", () => {
    const rows = Array.from({ length: 10 }, () => ({ a: null, b: null }));
    expect(computeHealth(ds(["a", "b"], rows)).score).toBe(0);
  });
});
