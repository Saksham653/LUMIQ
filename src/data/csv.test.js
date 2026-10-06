import { describe, it, expect } from "vitest";
import { parseCsvText } from "./csv.js";
import { datasetFromCsv, numericColumns } from "./dataset.js";

describe("parseCsvText (F6)", () => {
  it("handles quoted commas", () => {
    const { columns, rows } = parseCsvText('city,sales\n"Lucknow, UP",100\n"Delhi",200\n');
    expect(columns).toEqual(["city", "sales"]);
    expect(rows).toEqual([
      { city: "Lucknow, UP", sales: "100" },
      { city: "Delhi", sales: "200" },
    ]);
  });

  it("handles CRLF line endings", () => {
    const { rows } = parseCsvText("a,b\r\n1,x\r\n2,y\r\n");
    expect(rows).toEqual([
      { a: "1", b: "x" },
      { a: "2", b: "y" },
    ]);
  });

  it("strips a UTF-8 BOM so the first header is clean", () => {
    const { columns } = parseCsvText("﻿name,value\nA,1\n");
    expect(columns[0]).toBe("name");
  });

  it("skips empty lines and trims headers", () => {
    const { columns, rows } = parseCsvText(" name , value \nA,1\n\n  \nB,2\n");
    expect(columns).toEqual(["name", "value"]);
    expect(rows).toHaveLength(2);
  });

  it("handles quoted fields containing newlines", () => {
    const { rows } = parseCsvText('note,v\n"line1\nline2",5\n');
    expect(rows[0].note).toBe("line1\nline2");
  });
});

describe("datasetFromCsv end to end", () => {
  const CSV =
    "month,revenue,margin,notes\n" +
    'Jan,"₹1,20,000",23.5%,"good, strong"\n' +
    "Feb,,31.2%,\n" +
    'Mar,"₹90,000",,quiet\n';

  it("types columns from all rows and keeps blanks null", () => {
    const ds = datasetFromCsv(CSV, "test");
    expect(ds.columnTypes.revenue).toEqual({ type: "money", symbol: "₹" });
    expect(ds.columnTypes.margin.type).toBe("percent");
    expect(ds.columnTypes.notes.type).toBe("text");
    expect(ds.data).toEqual([
      { month: "Jan", revenue: 120000, margin: 23.5, notes: "good, strong" },
      { month: "Feb", revenue: null, margin: 31.2, notes: null },
      { month: "Mar", revenue: 90000, margin: null, notes: "quiet" },
    ]);
    expect(numericColumns(ds)).toEqual(["revenue", "margin"]);
  });

  it("throws a plain error on an empty file", () => {
    expect(() => datasetFromCsv("", "x")).toThrow("No data rows");
  });
});

describe("dataset ids and name dedupe (B5-7)", () => {
  it("every dataset gets a unique id; sample ids are stable", async () => {
    const { SAMPLE_DATASETS } = await import("./sampleDatasets.js");
    expect(SAMPLE_DATASETS.sales.id).toBe("sample:sales");
    expect(SAMPLE_DATASETS.marketing.id).toBe("sample:marketing");
    const a = datasetFromCsv("x\n1\n", "same");
    const b = datasetFromCsv("x\n1\n", "same");
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it("uniqueDatasetName appends (2), (3) against taken names", async () => {
    const { uniqueDatasetName } = await import("./dataset.js");
    expect(uniqueDatasetName("sales", [])).toBe("sales");
    expect(uniqueDatasetName("sales", ["sales"])).toBe("sales (2)");
    expect(uniqueDatasetName("sales", ["sales", "sales (2)"])).toBe("sales (3)");
    expect(uniqueDatasetName("E-Commerce Sales", ["E-Commerce Sales"])).toBe("E-Commerce Sales (2)");
  });
});
