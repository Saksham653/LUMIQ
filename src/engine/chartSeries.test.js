import { describe, it, expect } from "vitest";
import { chartSeries } from "./chartSeries.js";
import { forecastSeries } from "./insights.js";
import { buildDataset } from "../data/dataset.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const sales = SAMPLE_DATASETS.sales;

describe("chartSeries (B5-1): labels come from the same rows as the values", () => {
  it("filtering Sales to one region keeps labels and values aligned row by row", () => {
    const north = sales.data.filter((r) => r.region === "North");
    const { values, labels } = chartSeries(sales, north, "revenue");
    expect(labels).toEqual(["Jan", "May", "Sep"]);
    expect(values).toEqual([245000, 334000, 356000]);
    // row-by-row: label i belongs to value i
    north.forEach((row, i) => {
      expect(labels[i]).toBe(row.month);
      expect(values[i]).toBe(row.revenue);
    });
  });

  it("with Forecast on (time order), sorted table rows change nothing", () => {
    const sortedByRevenue = [...sales.data].sort((a, b) => a.revenue - b.revenue);
    const { values, labels } = chartSeries(sales, sortedByRevenue, "revenue", { timeOrdered: true });
    expect(labels[0]).toBe("Jan");
    expect(labels[labels.length - 1]).toBe("Dec");
    expect(values).toEqual(forecastSeries(sales, sortedByRevenue, "revenue"));
  });

  it("a blank metric cell drops its label too — no misalignment", () => {
    const ds = buildDataset({
      name: "t", icon: "", description: "",
      columns: ["label", "v"],
      rows: [
        { label: "a", v: 1 },
        { label: "b", v: null },
        { label: "c", v: 3 },
      ],
    });
    const { values, labels } = chartSeries(ds, ds.data, "v");
    expect(values).toEqual([1, 3]);
    expect(labels).toEqual(["a", "c"]);
  });

  it("a blank label cell shows an empty label, not 'null'", () => {
    const ds = buildDataset({
      name: "t", icon: "", description: "",
      columns: ["label", "v"],
      rows: [{ label: "", v: 5 }],
    });
    expect(chartSeries(ds, ds.data, "v").labels).toEqual([""]);
  });

  it("degrades safely with no dataset, rows or metric", () => {
    expect(chartSeries(null, [], "v")).toEqual({ values: [], labels: [] });
    expect(chartSeries(sales, sales.data, "")).toEqual({ values: [], labels: [] });
  });
});
