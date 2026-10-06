// B7-2: the fixture workbook is built with SheetJS itself (2 sheets,
// real dates, a blank header, ₹ values) and read back through the
// exact pipeline the upload uses.

import { describe, it, expect, beforeAll } from "vitest";
import { isExcelFile, readExcelWorkbook, excelSheetToGrid } from "./excel.js";
import { buildPreviewFromGrid, datasetFromPreview } from "./uploadPreview.js";

let book;

beforeAll(async () => {
  const XLSX = await import("xlsx").then((m) => (typeof m.read === "function" ? m : m.default));
  const wb = XLSX.utils.book_new();
  // Sheet 1: dates, a blank header cell (→ "Column 2"), ₹ strings, numbers
  const orders = XLSX.utils.aoa_to_sheet(
    [
      ["order", "", "date", "amount", "price"],
      ["A-1", "x", new Date(2024, 2, 5), "₹1,200", 10.5],
      ["A-2", "y", new Date(2024, 2, 6), "₹980", 11],
      ["A-3", "z", new Date(2024, 2, 7), "", 12.25],
    ],
    { cellDates: true }
  );
  const notes = XLSX.utils.aoa_to_sheet([
    ["note", "count"],
    ["hello", 1],
    ["world", 2],
  ]);
  XLSX.utils.book_append_sheet(wb, orders, "Orders");
  XLSX.utils.book_append_sheet(wb, notes, "Notes");
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true });
  book = await readExcelWorkbook(buffer);
});

describe("Excel upload (B7-2)", () => {
  it("recognizes Excel filenames only", () => {
    expect(isExcelFile("q3.xlsx")).toBe(true);
    expect(isExcelFile("old.XLS")).toBe(true);
    expect(isExcelFile("data.csv")).toBe(false);
  });

  it("lists both sheets for the picker", () => {
    expect(book.sheetNames).toEqual(["Orders", "Notes"]);
  });

  it("blank header cells become positional names", async () => {
    const grid = await excelSheetToGrid(book, "Orders");
    expect(grid.columns).toEqual(["order", "Column 2", "date", "amount", "price"]);
  });

  it("Excel dates become real dates, not serial numbers", async () => {
    const grid = await excelSheetToGrid(book, "Orders");
    expect(grid.rows.map((r) => r.date)).toEqual(["2024-03-05", "2024-03-06", "2024-03-07"]);
  });

  it("₹ values and blanks flow through type detection into a working dataset", async () => {
    const grid = await excelSheetToGrid(book, "Orders");
    const preview = buildPreviewFromGrid(grid.columns, grid.rows, "orders");
    expect(preview.types.amount.type).toBe("money");
    expect(preview.types.amount.symbol).toBe("₹");
    expect(preview.types.date.type).toBe("date");
    expect(preview.types.price.type).toBe("number");
    const ds = datasetFromPreview(preview, preview.types);
    expect(ds.data.map((r) => r.amount)).toEqual([1200, 980, null]); // blank stays blank, never 0
    expect(ds.data[0].price).toBe(10.5);
  });

  it("the second sheet loads on its own", async () => {
    const grid = await excelSheetToGrid(book, "Notes");
    expect(grid.columns).toEqual(["note", "count"]);
    expect(grid.rows).toHaveLength(2);
    expect(grid.rows[1]).toEqual({ note: "world", count: 2 });
  });
});
