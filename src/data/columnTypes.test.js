import { describe, it, expect } from "vitest";
import {
  parseNumericString,
  detectColumnTypes,
  coerceRows,
  formatCell,
  formatTileValue,
  aggregationRule,
  looksLikeDate,
  describeColumns,
  createColumnReader,
} from "./columnTypes.js";
import { datasetFromCsv } from "./dataset.js";
import { detectTimeColumn } from "../engine/insights.js";
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

  it("reads yen, yuan, shekel and other currency symbols, before or after the number", () => {
    expect(parseNumericString("¥1,200")).toEqual({ value: 1200, kind: "money", symbol: "¥" });
    expect(parseNumericString("￥980")).toEqual({ value: 980, kind: "money", symbol: "¥" });
    expect(parseNumericString("1,234.5 ₪")).toEqual({ value: 1234.5, kind: "money", symbol: "₪" });
    expect(parseNumericString("₩15,000").symbol).toBe("₩");
  });

  it("keeps the clue that says whether ¥ means yen or yuan", () => {
    expect(parseNumericString("1,200円")).toEqual({ value: 1200, kind: "money", symbol: "¥", currency: "JPY" });
    expect(parseNumericString("JPY 1200")).toEqual({ value: 1200, kind: "money", symbol: "¥", currency: "JPY" });
    expect(parseNumericString("1,200元")).toEqual({ value: 1200, kind: "money", symbol: "¥", currency: "CNY" });
    expect(parseNumericString("RMB 88.5")).toEqual({ value: 88.5, kind: "money", symbol: "¥", currency: "CNY" });
    expect(parseNumericString("¥300 CNY")).toEqual({ value: 300, kind: "money", symbol: "¥", currency: "CNY" });
    // Text that merely contains the character is not a number.
    expect(parseNumericString("元宵节")).toBeNull();
    const rows = [{ p: "1,200円" }, { p: "980円" }, { p: "" }];
    expect(detectColumnTypes(rows, ["p"]).p).toEqual({ type: "money", symbol: "¥", currency: "JPY" });
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

// ---------------------------------------------------------------------------
// Reading numbers and dates per column (decimal comma, day first, ...)
// ---------------------------------------------------------------------------

const column = (cells) => cells.map((v) => ({ v }));
const read = (cells, options) => {
  const rows = column(cells);
  const { types, decisions } = describeColumns(rows, ["v"], options);
  return { type: types.v, decision: decisions.v, data: coerceRows(rows, ["v"], types).map((r) => r.v) };
};

describe("parseNumericString reads the cells the audit found misread", () => {
  it("decimal commas, brackets, rupee words, /- and percent", () => {
    expect(parseNumericString("1,5").value).toBe(1.5);
    expect(parseNumericString("1.234,56").value).toBe(1234.56);
    expect(parseNumericString("(1,200)")).toEqual({ value: -1200, kind: "number", symbol: null });
    expect(parseNumericString("Rs. 500")).toEqual({ value: 500, kind: "money", symbol: "₹", currency: "INR" });
    expect(parseNumericString("500/-")).toEqual({ value: 500, kind: "money", symbol: null });
    expect(parseNumericString("12,5%")).toEqual({ value: 12.5, kind: "percent", symbol: null });
  });

  it("more money, groupings and negatives", () => {
    expect(parseNumericString("INR 1,20,000.50")).toEqual({ value: 120000.5, kind: "money", symbol: "₹", currency: "INR" });
    expect(parseNumericString("12.5 USD")).toEqual({ value: 12.5, kind: "money", symbol: "$", currency: "USD" });
    expect(parseNumericString("Rs.500/-").value).toBe(500);
    expect(parseNumericString("£1,234.50").symbol).toBe("£");
    expect(parseNumericString("1 234,5").value).toBe(1234.5);
    expect(parseNumericString("1'234.50").value).toBe(1234.5);
    expect(parseNumericString("12,34,567.8").value).toBe(1234567.8);
    expect(parseNumericString("1.234.567").value).toBe(1234567);
    const negatives = [["-₹500", -500], ["₹-500", -500], ["(₹1,200.50)", -1200.5], ["$(500)", -500], ["500-", -500], ["−500", -500]];
    for (const [cell, value] of negatives) expect(parseNumericString(cell).value).toBe(value);
    expect(parseNumericString("(12.5%)")).toEqual({ value: -12.5, kind: "percent", symbol: null });
  });

  it("other digits", () => {
    expect(parseNumericString("१२३४").value).toBe(1234);
    expect(parseNumericString("₹१,२०,०००").value).toBe(120000);
    expect(parseNumericString("١٢٣٤").value).toBe(1234);
    expect(parseNumericString("١٬٢٣٤٫٥").value).toBe(1234.5);
    expect(parseNumericString("२५%")).toEqual({ value: 25, kind: "percent", symbol: null });
  });

  it("follows the column's decimal mark", () => {
    expect(parseNumericString("1,234", { type: "number", decimal: "," }).value).toBe(1.234);
    expect(parseNumericString("1,5", { type: "number", decimal: "." }).value).toBe(15);
    expect(parseNumericString("1,234").value).toBe(1234);
  });
});

describe("the column decides how its numbers are written", () => {
  it("decimal commas", () => {
    const r = read(["1,5", "2,75", "10,25", "3"]);
    expect(r.type).toEqual({ type: "number", decimal: "," });
    expect(r.data).toEqual([1.5, 2.75, 10.25, 3]);
    expect(r.decision.ambiguous).toBe(false);
    expect(r.decision.number).toMatchObject({ decimal: ",", confidence: "high", reason: "seen" });
  });

  it("one clear cell settles the rest", () => {
    expect(read(["1.234", "2.500", "1.234,56"]).data).toEqual([1234, 2500, 1234.56]);
    expect(read(["1,234", "2,500", "0,75"]).data).toEqual([1.234, 2.5, 0.75]);
  });

  it("thousands as before, with nothing to ask", () => {
    const r = read(["1,200", "950", "2,000"]);
    expect(r.type).toEqual({ type: "number" });
    expect(r.data).toEqual([1200, 950, 2000]);
    expect(r.decision.number).toMatchObject({ decimal: ".", confidence: "medium", reason: "assumed" });
    expect(r.decision.ambiguous).toBe(false);
  });

  it("1,5 alone is unsure, and says both readings", () => {
    const r = read(["1,5", "2", "3"]);
    expect(r.data).toEqual([1.5, 2, 3]);
    expect(r.decision.ambiguous).toBe(true);
    expect(r.decision.number).toMatchObject({ reason: "single", confidence: "low" });
    expect(r.decision.number.sample).toEqual({ raw: "1,5", mark: ",", asDot: 15, asComma: 1.5, commaIgnored: true });
    expect(read(["1.234", "2.500"]).decision.number.sample).toEqual({ raw: "1.234", mark: ".", asDot: 1.234, asComma: 1234, commaIgnored: false });
    expect(read(["1,234.50", "2,000.00", "3,5"]).decision.number.sample).toMatchObject({ raw: "3,5", asDot: 35, asComma: 3.5 });
    const chosen = read(["1,5", "2", "3"], { overrides: { v: { decimal: "." } } });
    expect(chosen.type).toEqual({ type: "number", decimal: "." });
    expect(chosen.data).toEqual([15, 2, 3]);
    expect(chosen.decision.ambiguous).toBe(false);
  });

  it("another column settles it", () => {
    const rows = [
      { price: "1,5", qty: "1.234" },
      { price: "2,75", qty: "2.500" },
      { price: "10,25", qty: "12.000" },
    ];
    const { types, decisions } = describeColumns(rows, ["price", "qty"]);
    expect(types.qty).toEqual({ type: "number", decimal: "," });
    expect(decisions.qty.number.reason).toBe("other-columns");
    expect(coerceRows(rows, ["price", "qty"], types).map((r) => r.qty)).toEqual([1234, 2500, 12000]);
  });

  it("a stray cell is still read, and the column is marked unsure", () => {
    const r = read(["1,234.50", "2,000.00", "3,5", "950.25"]);
    expect(r.data).toEqual([1234.5, 2000, 3.5, 950.25]);
    expect(r.decision.number).toMatchObject({ reason: "mixed", confidence: "low", mixed: ["3,5"] });
    expect(r.decision.counts.odd).toBe(1);
  });

  it("the person's choice wins", () => {
    const r = read(["1,234", "2,500"], { overrides: { v: { decimal: "," } } });
    expect(r.data).toEqual([1.234, 2.5]);
    expect(r.decision.number.reason).toBe("chosen");
  });

  it("money and percent carry the mark", () => {
    expect(read(["€ 1.234,50", "€ 99,90"]).type).toEqual({ type: "money", symbol: "€", decimal: "," });
    expect(read(["Rs. 500", "Rs. 1,200", "Rs. 75/-"]).type).toEqual({ type: "money", symbol: "₹", currency: "INR" });
    expect(read(["500/-", "1,200/-"]).type).toEqual({ type: "money" });
    expect(read(["12,5%", "8%"]).type).toEqual({ type: "percent", decimal: "," });
  });
});

describe("the column decides how its dates are written", () => {
  it("day first", () => {
    const r = read(["05/01/2024", "13/01/2024", "31/01/2024"]);
    expect(r.type).toEqual({ type: "date", dateOrder: "dmy" });
    expect(r.data).toEqual(["2024-01-05", "2024-01-13", "2024-01-31"]);
  });

  it("month first", () => {
    const r = read(["1-31-24", "2-1-24", "12-25-23"]);
    expect(r.type).toEqual({ type: "date", dateOrder: "mdy" });
    expect(r.data).toEqual(["2024-01-31", "2024-02-01", "2023-12-25"]);
  });

  it("an order nothing settles stays as written until the person says", () => {
    const cells = ["05/01/2024", "03/04/2024", "01/02/2024", "02/01/2024"];
    const r = read(cells);
    expect(r.type).toEqual({ type: "date", dateOrder: "ambiguous" });
    expect(r.data).toEqual(cells);
    expect(r.decision.ambiguous).toBe(true);
    expect(r.decision.date.sample).toEqual({ raw: "05/01/2024", dmy: "2024-01-05", mdy: "2024-05-01" });
    const chosen = read(cells, { overrides: { v: { dateOrder: "dmy" } } });
    expect(chosen.data).toEqual(["2024-01-05", "2024-04-03", "2024-02-01", "2024-01-02"]);
  });

  it("another date column settles it", () => {
    const rows = [
      { ordered: "05/01/2024", shipped: "25/01/2024" },
      { ordered: "03/04/2024", shipped: "13/04/2024" },
      { ordered: "02/01/2024", shipped: "02/02/2024" },
    ];
    const { decisions } = describeColumns(rows, ["ordered", "shipped"]);
    expect(decisions.ordered.date).toMatchObject({ order: "dmy", confidence: "medium", reason: "other-columns" });
  });

  it("ISO dates read exactly as before", () => {
    const cells = ["2024-01-01", "2024-02-01", "2024-03-05 10:30", "2024-03-06T10:00:00Z"];
    const r = read(cells);
    expect(r.type).toEqual({ type: "date" });
    expect(r.data).toEqual(cells);
  });

  it("other shapes become ISO", () => {
    expect(read(["2024/01/31", "2024.02.01", "2024-3-5"]).data).toEqual(["2024-01-31", "2024-02-01", "2024-03-05"]);
    expect(read(["Jan 2024", "Feb 2024", "March 2024"]).data).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(read(["5 Jan 2024", "January 6, 2024"]).data).toEqual(["2024-01-05", "2024-01-06"]);
  });

  it("financial years stay text", () => {
    expect(read(["2009-10", "2010-11", "2011-12"]).type.type).toBe("text");
    expect(read(["2010-10", "2010-11", "2010-12"]).type.type).toBe("date");
  });

  it("the reader in pieces equals the reader at once", () => {
    const rows = column(["05/01/2024", "13/01/2024", "1,5", "x", "2,5", ""]);
    const reader = createColumnReader(["v"]);
    for (let i = 0; i < rows.length; i += 2) reader.add(rows.slice(i, i + 2));
    expect(reader.finish()).toEqual(describeColumns(rows, ["v"]));
  });

  it("whole pipeline: a day-first, decimal-comma CSV gets a working time column", () => {
    const csv = ["date,amount", '05/01/2024,"1,5"', '13/01/2024,"2,5"', '25/02/2024,"3,5"', '03/03/2024,"4,5"', ""].join("\n");
    const ds = datasetFromCsv(csv, "x");
    expect(ds.columnTypes).toEqual({ date: { type: "date", dateOrder: "dmy" }, amount: { type: "number", decimal: "," } });
    expect(ds.data.map((r) => r.amount)).toEqual([1.5, 2.5, 3.5, 4.5]);
    expect(detectTimeColumn(ds).column).toBe("date");
  });

  it("old shapes stay exactly as they were", () => {
    const rows = [{ p: "12.5%", m: "₹1,200", d: "2024-01-01", t: "North" }];
    expect(detectColumnTypes(rows, ["p", "m", "d", "t"])).toEqual({
      p: { type: "percent" },
      m: { type: "money", symbol: "₹" },
      d: { type: "date" },
      t: { type: "text" },
    });
  });
});
