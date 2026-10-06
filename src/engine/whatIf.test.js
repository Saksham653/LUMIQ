import { describe, it, expect } from "vitest";
import { computeWhatIf, describeWhatIf } from "./whatIf.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";
import { buildDataset } from "../data/dataset.js";

const sales = SAMPLE_DATASETS.sales;

describe("computeWhatIf (F14)", () => {
  it("+10% revenue in North matches the hand calculation", () => {
    const r = computeWhatIf(sales, { measure: "revenue", changePct: 10, groupColumn: "region", groupValue: "North" });
    expect(r.rule).toBe("sum");
    // North: 245,000 + 334,000 + 356,000 = 935,000 → ×1.1 = 1,028,500
    const north = r.rows.find((x) => x.group === "North");
    expect(north.before).toBe(935000);
    expect(north.after).toBeCloseTo(1028500, 6);
    expect(north.diff).toBeCloseTo(93500, 6);
    // every other region is untouched
    for (const g of r.rows.filter((x) => x.group !== "North")) expect(g.diff).toBeCloseTo(0, 6);
    // grand total: 4,677,000 + 93,500 = 4,770,500
    expect(r.total.before).toBe(4677000);
    expect(r.total.after).toBeCloseTo(4770500, 6);
  });

  it("a rate column is averaged, not summed", () => {
    const r = computeWhatIf(sales, { measure: "profit_margin", changePct: 10, groupColumn: "region", groupValue: "North" });
    expect(r.rule).toBe("avg");
    expect(r.total.before).toBeCloseTo(25.325, 10);
    // North margins 23.1, 29.8, 30.5 gain 10% → total sum gains 8.34 → avg over 12
    expect(r.total.after).toBeCloseTo((303.9 + 8.34) / 12, 10);
    const north = r.rows.find((x) => x.group === "North");
    expect(north.before).toBeCloseTo((23.1 + 29.8 + 30.5) / 3, 10);
    expect(north.after).toBeCloseTo(north.before * 1.1, 10);
  });

  it("no group means the change applies to every row", () => {
    const r = computeWhatIf(sales, { measure: "revenue", changePct: -5 });
    expect(r.rows).toEqual([]);
    expect(r.total.after).toBeCloseTo(4677000 * 0.95, 6);
    expect(r.total.diff).toBeCloseTo(-4677000 * 0.05, 6);
  });

  it("blank cells stay blank through the change", () => {
    const ds = buildDataset({
      name: "t", icon: "", description: "", columns: ["g", "v"],
      rows: [{ g: "a", v: 100 }, { g: "a", v: null }, { g: "b", v: 50 }],
    });
    const r = computeWhatIf(ds, { measure: "v", changePct: 100, groupColumn: "g", groupValue: "a" });
    const a = r.rows.find((x) => x.group === "a");
    expect(a.before).toBe(100); // blank skipped
    expect(a.after).toBe(200);
    expect(r.total.after).toBe(250);
  });
});

describe("describeWhatIf", () => {
  it("plain words", () => {
    expect(describeWhatIf({ measure: "revenue", changePct: 10, groupColumn: "region", groupValue: "North" })).toBe("+10% revenue, only region North");
    expect(describeWhatIf({ measure: "cac", changePct: -5 })).toBe("-5% cac, across all rows");
  });
});
