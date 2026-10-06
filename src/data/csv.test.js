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
