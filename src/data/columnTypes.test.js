import { describe, it, expect } from "vitest";
import {
  parseNumericString,
  detectColumnTypes,
  coerceRows,
  formatCell,
  formatTileValue,
  aggregationRule,
  looksLikeDate,
} from "./columnTypes.js";
import { SAMPLE_DATASETS } from "./sampleDatasets.js";

describe("parseNumericString", () => {
  it("accepts Indian and Western grouping", () => {
    expect(parseNumericString("1,20,000")).toEqual({ value: 120000, kind: "number", symbol: null });
    expect(parseNumericString("120,000")).toEqual({ value: 120000, kind: "number", symbol: null });
    expect(parseNumericString("1,234,567.89").value).toBe(1234567.89);
  });

  it("accepts currency and percent", () => {
    expect(parseNumericString("₹1,200")).toEqual({ value: 1200, kind: "money", symbol: "₹" });
    expect(parseNumericString("$99.5").kind).toBe("money");
    expect(parseNumericString("12.5%")).toEqual({ value: 12.5, kind: "percent", symbol: null });
    expect(parseNumericString("-3.4").value).toBe(-3.4);
  });

  it("rejects text, dates and blanks", () => {
    for (const bad of ["Lucknow, UP", "Jan", "2024-01-31", "", "  ", null, undefined, "12a", "N/A"]) {
      expect(parseNumericString(bad)).toBeNull();
    }
  });
});

describe("detectColumnTypes", () => {
  it("decides from all rows, not the first — a blank first cell stays numeric", () => {
    const rows = [{ v: "" }, { v: "10" }, { v: "20" }, { v: "30" }];
    expect(detectColumnTypes(rows, ["v"]).v.type).toBe("number");
  });

  it("detects percent, money (with symbol) and date columns", () => {
    const rows = [
      { p: "12.5%", m: "₹1,200", d: "2024-01-01", t: "North" },
      { p: "8%", m: "₹950", d: "2024-02-01", t: "South" },
      { p: "", m: "₹2,000", d: "2024-03-01", t: "East" },
    ];
    const types = detectColumnTypes(rows, ["p", "m", "d", "t"]);
    expect(types.p.type).toBe("percent");
    expect(types.m).toEqual({ type: "money", symbol: "₹" });
    expect(types.d.type).toBe("date");
    expect(types.t.type).toBe("text");
  });

  it("a mostly-text column is text even if some cells look numeric", () => {
    const rows = [{ v: "A1" }, { v: "B2" }, { v: "3" }, { v: "C4" }, { v: "D5" }];
    expect(detectColumnTypes(rows, ["v"]).v.type).toBe("text");
  });

  it("an all-blank column is text", () => {
    const rows = [{ v: "" }, { v: null }];
    expect(detectColumnTypes(rows, ["v"]).v.type).toBe("text");
  });

  it("works on already-typed values (sample datasets)", () => {
    const types = SAMPLE_DATASETS.sales.columnTypes;
    expect(types.revenue.type).toBe("number");
    expect(types.region.type).toBe("text");
    expect(SAMPLE_DATASETS.churn.columnTypes.cohort.type).toBe("text");
  });
});

describe("coerceRows", () => {
  it("numbers parse (Indian grouping included) and blanks stay null", () => {
    const rows = [{ v: "1,20,000" }, { v: "" }, { v: "20" }, { v: "30" }, { v: null }];
    const types = detectColumnTypes(rows, ["v"]);
    expect(types.v.type).toBe("number");
    const data = coerceRows(rows, ["v"], types);
    expect(data.map((r) => r.v)).toEqual([120000, null, 20, 30, null]);
  });

  it("keeps a numeric column working around one bad cell when the share is high", () => {
    const rows = [{ v: "10" }, { v: "20" }, { v: "30" }, { v: "40" }, { v: "x" }];
    const types = detectColumnTypes(rows, ["v"]);
    expect(types.v.type).toBe("number");
    const data = coerceRows(rows, ["v"], types);
    expect(data.map((r) => r.v)).toEqual([10, 20, 30, 40, null]);
  });

  it("text columns trim strings and blank to null", () => {
    const rows = [{ t: "  North " }, { t: "" }, { t: null }];
    const data = coerceRows(rows, ["t"], { t: { type: "text" } });
    expect(data.map((r) => r.t)).toEqual(["North", null, null]);
  });
});

describe("formatCell", () => {
  it("renders blanks as empty, never 0 or null", () => {
    expect(formatCell(null, { type: "number" })).toBe("");
    expect(formatCell(undefined, { type: "text" })).toBe("");
  });

  it("re-renders money and percent from the type", () => {
    expect(formatCell(1200, { type: "money", symbol: "₹" })).toBe(`₹${(1200).toLocaleString()}`);
    expect(formatCell(12.5, { type: "percent" })).toBe("12.5%");
    expect(formatCell(42, { type: "number" })).toBe("42");
  });
});

describe("formatTileValue (B3-4)", () => {
  it("percent and averaged values keep one decimal — 12.5, never 13", () => {
    expect(formatTileValue(12.5, { type: "percent" }, "avg")).toBe("12.5%");
    expect(formatTileValue(12.5, { type: "number" }, "avg")).toBe("12.5");
    expect(formatTileValue(25.325, { type: "number" }, "avg")).toBe("25.3");
  });

  it("money carries its symbol, counts show no decimals", () => {
    expect(formatTileValue(240000, { type: "money", symbol: "₹" }, "sum")).toBe("₹240K");
    expect(formatTileValue(33870, { type: "number" }, "sum")).toBe("34K");
    expect(formatTileValue(42, { type: "number" }, "sum")).toBe("42");
    expect(formatTileValue(42.4, { type: "number" }, "sum")).toBe("42");
  });

  it("large values compress to K and M; null shows an em dash", () => {
    expect(formatTileValue(4677000, { type: "number" }, "sum")).toBe("4.7M");
    expect(formatTileValue(2822.5, { type: "number" }, "avg")).toBe("2.8K");
    expect(formatTileValue(null, { type: "number" }, "sum")).toBe("—");
  });
});

describe("aggregationRule (F9)", () => {
  it("averages percent columns and rate-like names, sums amounts", () => {
    expect(aggregationRule("profit_margin", { type: "number" })).toBe("avg");
    expect(aggregationRule("churn_rate", { type: "number" })).toBe("avg");
    expect(aggregationRule("nps", { type: "number" })).toBe("avg");
    expect(aggregationRule("score", { type: "number" })).toBe("avg");
    expect(aggregationRule("anything", { type: "percent" })).toBe("avg");
    expect(aggregationRule("revenue", { type: "number" })).toBe("sum");
    expect(aggregationRule("orders", { type: "number" })).toBe("sum");
    expect(aggregationRule("spend", { type: "money", symbol: "₹" })).toBe("sum");
  });
});

describe("looksLikeDate", () => {
  it("matches common date shapes only", () => {
    expect(looksLikeDate("2024-01-31")).toBe(true);
    expect(looksLikeDate("31/01/2024")).toBe(true);
    expect(looksLikeDate("2024-Q1")).toBe(false);
    expect(looksLikeDate("Jan")).toBe(false);
    expect(looksLikeDate("W1")).toBe(false);
  });
});
