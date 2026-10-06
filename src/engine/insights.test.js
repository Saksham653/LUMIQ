import { describe, it, expect } from "vitest";
import { computeInsights, detectTimeColumn } from "./insights.js";
import { buildDataset } from "../data/dataset.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const makeDs = (columns, rows) => buildDataset({ name: "t", icon: "", description: "", columns, rows });

describe("computeInsights stays silent instead of lying", () => {
  it("a 4-row file produces no false trend claim (and no 'dropped 25%')", () => {
    const ds = makeDs(["city", "revenue"], [
      { city: "Lucknow", revenue: 120000 },
      { city: "Delhi", revenue: 30000 },
      { city: "Mumbai", revenue: 90000 },
      { city: "Pune", revenue: 50000 },
    ]);
    const insights = computeInsights(ds, ds.data);
    expect(insights.filter((i) => i.type === "trend_up" || i.type === "trend_down")).toHaveLength(0);
    expect(JSON.stringify(insights)).not.toMatch(/dropped|surged/);
  });

  it("2 time points (marketing weeks) never produce a time trend", () => {
    const ds = SAMPLE_DATASETS.marketing;
    const trend = computeInsights(ds, ds.data).filter((i) => i.type.startsWith("trend"));
    expect(trend).toHaveLength(0);
  });

  it("5 time points (churn quarters) are below the 6-point minimum", () => {
    const ds = SAMPLE_DATASETS.churn;
    const trend = computeInsights(ds, ds.data).filter((i) => i.type.startsWith("trend"));
    expect(trend).toHaveLength(0);
  });

  it("returns [] when there is nothing meaningful to say", () => {
    const ds = makeDs(["name", "v"], [
      { name: "a", v: 10 },
      { name: "b", v: 10 },
      { name: "c", v: 10 },
    ]);
    expect(computeInsights(ds, ds.data)).toEqual([]);
    expect(computeInsights(ds, [])).toEqual([]);
  });
});

describe("change over time uses time order, not row order", () => {
  it("fires on the sales months and survives shuffled rows", () => {
    const ds = SAMPLE_DATASETS.sales;
    const inOrder = computeInsights(ds, ds.data).find((i) => i.type.startsWith("trend"));
    expect(inOrder).toBeTruthy();
    expect(inOrder.type).toBe("trend_up"); // Jan 245,000 → Dec 712,000
    expect(inOrder.title).toContain("190.6%");
    expect(inOrder.description).toContain("Jan");
    expect(inOrder.description).toContain("Dec");

    // Sort rows by revenue (as the table sort would) — same insight.
    const shuffled = [...ds.data].sort((a, b) => a.revenue - b.revenue);
    const afterShuffle = computeInsights(ds, shuffled).find((i) => i.type.startsWith("trend"));
    expect(afterShuffle).toEqual(inOrder);
  });

  it("detectTimeColumn finds months, quarters and weeks but not plain text", () => {
    expect(detectTimeColumn(SAMPLE_DATASETS.sales).column).toBe("month");
    expect(detectTimeColumn(SAMPLE_DATASETS.churn).column).toBe("cohort");
    expect(detectTimeColumn(SAMPLE_DATASETS.marketing).column).toBe("week");
    const ds = makeDs(["region", "v"], [{ region: "North", v: 1 }, { region: "South", v: 2 }]);
    expect(detectTimeColumn(ds)).toBeNull();
  });
});

describe("top contributor", () => {
  it("names the channel with the biggest spend share", () => {
    const ds = SAMPLE_DATASETS.marketing;
    const top = computeInsights(ds, ds.data).find((i) => i.type === "top");
    expect(top).toBeTruthy();
    expect(top.title).toBe("Google Ads leads spend");
    expect(top.description).toContain("44.9%");
  });

  it("needs at least 2 groups", () => {
    const ds = makeDs(["region", "revenue"], [
      { region: "North", revenue: 10 },
      { region: "North", revenue: 20 },
      { region: "North", revenue: 30 },
    ]);
    expect(computeInsights(ds, ds.data).filter((i) => i.type === "top")).toHaveLength(0);
  });

  it("stays silent on an even split (nothing truly leads)", () => {
    const ds = makeDs(["g", "v"], [
      { g: "a", v: 100 },
      { g: "b", v: 100 },
      { g: "c", v: 100 },
      { g: "a", v: 100 },
      { g: "b", v: 100 },
      { g: "c", v: 100 },
    ]);
    expect(computeInsights(ds, ds.data).filter((i) => i.type === "top")).toHaveLength(0);
  });
});

describe("unusual values (median-based, works on small files)", () => {
  it("finds a planted outlier in an 8-row file", () => {
    const rows = [98, 101, 99, 102, 100, 97, 103, 500].map((v, i) => ({ id: `r${i}`, v }));
    const ds = makeDs(["id", "v"], rows);
    const unusual = computeInsights(ds, ds.data).find((i) => i.type === "unusual");
    expect(unusual).toBeTruthy();
    expect(unusual.description).toContain("500");
    expect(unusual.description).toContain("above");
  });

  it("a clean small file has no unusual values", () => {
    const rows = [98, 101, 99, 102, 100, 97, 103, 104].map((v, i) => ({ id: `r${i}`, v }));
    const ds = makeDs(["id", "v"], rows);
    expect(computeInsights(ds, ds.data).filter((i) => i.type === "unusual")).toHaveLength(0);
  });
});

describe("insights respect the rows they are given (active filters)", () => {
  it("filtering to one week changes the top contributor numbers", () => {
    const ds = SAMPLE_DATASETS.marketing;
    const w1 = ds.data.filter((r) => r.week === "W1");
    const top = computeInsights(ds, w1).find((i) => i.type === "top");
    expect(top).toBeTruthy();
    // W1 spend: Google 45,000 of 103,000 total → 43.7%
    expect(top.description).toContain("43.7%");
  });
});
