import { describe, it, expect } from "vitest";
import {
  buildUploadPreview,
  buildPreviewFromGrid,
  previewWarnings,
  overrideColumnType,
  datasetFromPreview,
  rebuildPreview,
  findHeaderRow,
  previewSteps,
  csvSource,
} from "./uploadPreview.js";
import { parseCsvText, parseCsvGrid } from "./csv.js";
import { numericColumns } from "./dataset.js";
import { sum } from "../lib/stats.js";

const CSV =
  "city,revenue,price\n" +
  "Lucknow,100,10\n" +
  "Delhi,,20\n" +
  "Mumbai,300,abc\n" +
  "Pune,,30\n" +
  "Agra,500,40\n";

describe("upload preview (rest of F6)", () => {
  const preview = buildUploadPreview(CSV, "cities");

  it("reports name, counts and detected types", () => {
    expect(preview.name).toBe("cities");
    expect(preview.rowCount).toBe(5);
    expect(preview.columns).toEqual(["city", "revenue", "price"]);
    expect(preview.types.city.type).toBe("text");
    expect(preview.types.revenue.type).toBe("number");
    expect(preview.types.price.type).toBe("number"); // 4 of 5 parse
  });

  it("warnings show the right counts", () => {
    const texts = previewWarnings(preview, preview.types).map((w) => w.text);
    expect(texts).toContain("2 empty cells in revenue");
    expect(texts).toContain("1 value in price could not be read as a number");
    expect(texts).toHaveLength(2);
  });

  it("warnings follow a type override", () => {
    // Force the text column to number: every city becomes unreadable
    const overridden = overrideColumnType(preview.types, "city", "number");
    const texts = previewWarnings(preview, overridden).map((w) => w.text);
    expect(texts).toContain("5 values in city could not be read as numbers");
  });

  it("changing a column from text to number changes what the tiles can compute", () => {
    const asText = datasetFromPreview(preview, overrideColumnType(preview.types, "revenue", "text"));
    expect(numericColumns(asText)).toEqual(["price"]);
    expect(typeof asText.data[0].revenue).toBe("string");

    const asNumber = datasetFromPreview(preview, preview.types);
    expect(numericColumns(asNumber)).toEqual(["revenue", "price"]);
    expect(sum(asNumber.data.map((r) => r.revenue))).toBe(900); // 100+300+500, blanks stay blank
    expect(asNumber.data[1].revenue).toBeNull();
    expect(asNumber.data[2].price).toBeNull(); // "abc" under a number type is blank, never 0
  });

  it("a money override keeps the detected symbol, other overrides do not", () => {
    const p = buildUploadPreview("amount\n₹100\n₹200\n", "m");
    expect(p.types.amount).toEqual({ type: "money", symbol: "₹" });
    const toText = overrideColumnType(p.types, "amount", "text");
    expect(toText.amount).toEqual({ type: "text" });
    const backToMoney = overrideColumnType(toText, "amount", "money");
    expect(backToMoney.amount).toEqual({ type: "money" });
  });

  it("a file with nothing to decide needs no review", () => {
    expect(preview.needsReview).toBe(false);
    expect(preview.header).toEqual({ row: 0, chosen: false, detected: false });
    expect(preview.asks).toEqual([]);
    expect(preview.flags).toEqual([]);
  });
});

const lines = (...rows) => rows.join("\n") + "\n";

describe("CSV with headings in row 1 reads exactly as parseCsvText reads it", () => {
  const files = [
    'city,sales\n"Lucknow, UP",100\n"Delhi",200\n',
    "a,b\r\n1,x\r\n2,y\r\n",
    "﻿name,value\nA,1\n",
    " name , value \nA,1\n\n  \nB,2\n",
    'note,v\n"line1\nline2",5\n',
    "a,a,b,,c\n1,2,3,4,5\n6,7\n8,9,10,11,12,13\n",
    "x;y\n1;2\n",
  ];
  it.each(files)("%j", (text) => {
    const old = parseCsvText(text);
    const p = buildUploadPreview(text, "f");
    expect(p.columns).toEqual(old.columns);
    expect(p.rows.map((r) => old.columns.map((c) => r[c]))).toEqual(old.rows.map((r) => old.columns.map((c) => r[c])));
  });
});

describe("the heading row", () => {
  it("stays in row 1 for files that have it there", () => {
    expect(findHeaderRow(parseCsvGrid(lines("city,revenue,price", "Lucknow,100,10", "Delhi,,20")).grid)).toMatchObject({ index: 0, confidence: "high" });
    expect(findHeaderRow(parseCsvGrid(lines("name,city", "Asha,Pune", "Ravi,Delhi")).grid).index).toBe(0);
    expect(findHeaderRow(parseCsvGrid(lines("2023,2024,Region", "100,200,North", "110,210,South")).grid).index).toBe(0);
    expect(buildUploadPreview(lines("2023,2024,Region", "100,200,North", "110,210,South"), "y").header.row).toBe(0);
  });

  it("is found under a title, and the person can say otherwise", () => {
    const text = lines("Sales report October 2026", "Date,Customer,Amount", "13/10/2026,Asha,120", "14/10/2026,Ravi,80");
    const p = buildUploadPreview(text, "r");
    expect(p.header).toEqual({ row: 1, chosen: false, detected: true });
    expect(p.columns).toEqual(["Date", "Customer", "Amount"]);
    expect(p.rowCount).toBe(2);
    expect(p.types.Date).toEqual({ type: "date", dateOrder: "dmy" });
    expect(p.needsReview).toBe(true);
    const back = rebuildPreview(p, { headerRow: 0 });
    expect(back.header).toEqual({ row: 0, chosen: true, detected: false });
    expect(back.columns[0]).toBe("Sales report October 2026");
  });

  it("two title lines with padding commas", () => {
    const text = lines("Company,ABC Traders,,,,", "Period,Oct 2026,,,,", "Date,Bill,Customer,Item,Qty,Amount", "01/10/2026,B-1,Asha,Tea,2,280", "02/10/2026,B-2,Ravi,Rice,1,420");
    const p = buildUploadPreview(text, "t");
    expect(p.header.row).toBe(2);
    expect(p.columns).toEqual(["Date", "Bill", "Customer", "Item", "Qty", "Amount"]);
  });

  it("Excel sheets get the same search", () => {
    const columns = ["Orders 2024", "Column 2", "Column 3"];
    const rows = [
      { "Orders 2024": "order", "Column 2": "date", "Column 3": "amount" },
      { "Orders 2024": "A-1", "Column 2": "2024-03-05", "Column 3": "₹1,200" },
      { "Orders 2024": "A-2", "Column 2": "2024-03-06", "Column 3": 980 },
    ];
    const p = buildPreviewFromGrid(columns, rows, "x");
    expect(p.columns).toEqual(["order", "date", "amount"]);
    expect(p.types.amount).toEqual({ type: "money", symbol: "₹" });
    expect(datasetFromPreview(p, p.types).data).toEqual([
      { order: "A-1", date: "2024-03-05", amount: 1200 },
      { order: "A-2", date: "2024-03-06", amount: 980 },
    ]);
  });
});

describe("rows that look wrong", () => {
  const shop = lines(
    "Date,Customer,Qty,Amount",
    '05/10/2026,Asha,2,"1.240,50"',
    '13/10/2026,Ravi,1,"980,00"',
    "Date,Customer,Qty,Amount",
    '25/10/2026,,3,"2.100,75"',
    ',Kavita,1,"10,00"',
    '27/10/2026,Imran,4,"20,00"',
    '28/10/2026,Meera,2,"30,00"',
    '29/10/2026,Sunil,1,"40,00"',
    '30/10/2026,Tara,1,"50,00"',
    '31/10/2026,Om,1,"60,00"',
    '31/10/2026,Lata,1,"70,00"',
    '31/10/2026,Hari,1,"80,00"',
    'Total,,19,"4.681,25"',
  );

  it("finds the repeated headings, the total at the bottom and the blank key cell", () => {
    const p = buildUploadPreview(shop, "shop");
    expect(p.flags.map((f) => [f.index, f.reason, f.drop])).toEqual([
      [2, "repeated-header", true],
      [4, "blank-key", false],
      [12, "total-row", true],
    ]);
    expect(p.flags[1].column).toBe("Date");
    expect(p.flags[2]).toMatchObject({ label: "Total", row: 14 });
    expect(p.rowCount).toBe(11);
    expect(p.types).toEqual({
      Date: { type: "date", dateOrder: "dmy" },
      Customer: { type: "text" },
      Qty: { type: "number" },
      Amount: { type: "number", decimal: "," },
    });
    const ds = datasetFromPreview(p, p.types);
    expect(ds.data[0]).toEqual({ Date: "2026-10-05", Customer: "Asha", Qty: 2, Amount: 1240.5 });
    expect(ds.data[3]).toEqual({ Date: null, Customer: "Kavita", Qty: 1, Amount: 10 });
    expect(previewWarnings(p, p.types).map((w) => w.text)).toContain("Row 14 looks like a total of the rows above, so it was left out");
  });

  it("a flagged row can be kept after all", () => {
    const p = rebuildPreview(buildUploadPreview(shop, "shop"), { keepRows: [12] });
    expect(p.rowCount).toBe(12);
    expect(p.flags.find((f) => f.reason === "total-row").drop).toBe(false);
  });

  it("an unlabelled last row that adds up is a total too", () => {
    const p = buildUploadPreview(lines("item,qty,amount", "Tea,2,280", "Rice,1,420", "Soap,4,152", ",7,852"), "u");
    expect(p.flags).toEqual([{ index: 3, row: 5, reason: "total-row", drop: true, label: null, why: "sum", cells: ["7", "852"] }]);
  });

  it("a product called Total in the middle is an ordinary row", () => {
    const p = buildUploadPreview(lines("item,qty", "Total,1", "Tea,2", "Rice,1"), "p");
    expect(p.flags).toEqual([]);
    expect(p.rowCount).toBe(3);
  });
});

describe("questions and corrections", () => {
  it("asks about a date order nothing settles, with both readings", () => {
    const p = buildUploadPreview(lines("date,v", "05/01/2024,1", "03/04/2024,2", "01/02/2024,3"), "d");
    expect(p.asks).toEqual([
      {
        column: "date",
        about: "date-order",
        level: "must",
        examples: ["05/01/2024", "03/04/2024", "01/02/2024"],
        sample: { raw: "05/01/2024", dmy: "2024-01-05", mdy: "2024-05-01" },
      },
    ]);
    expect(p.needsReview).toBe(true);
    const answered = rebuildPreview(p, { columns: { date: { dateOrder: "mdy" } } });
    expect(answered.asks).toEqual([]);
    expect(datasetFromPreview(answered, answered.types).data.map((r) => r.date)).toEqual(["2024-05-01", "2024-03-04", "2024-01-02"]);
  });

  it("asks about 1,5 alone: one and a half, or fifteen", () => {
    const p = buildUploadPreview(lines("item,price", 'a,"1,5"', "b,2", "c,3"), "n");
    expect(p.asks).toHaveLength(1);
    expect(p.asks[0]).toMatchObject({ column: "price", about: "decimal-mark", sample: { raw: "1,5", mark: ",", asDot: 15, asComma: 1.5, commaIgnored: true } });
    const fifteen = rebuildPreview(p, { columns: { price: { decimal: "." } } });
    expect(datasetFromPreview(fifteen, fifteen.types).data.map((r) => r.price)).toEqual([15, 2, 3]);
  });

  it("does not ask about thousands written with a comma", () => {
    const p = buildUploadPreview(lines("item,amount", 'a,"1,200"', "b,950", 'c,"2,000"'), "t");
    expect(p.asks).toEqual([]);
    expect(p.needsReview).toBe(false);
  });

  it("a column type can be changed, and number to money keeps the decimal comma", () => {
    const p = buildUploadPreview(lines("amount", '"1,5"', '"2,75"', "abc", '"3,25"', '"4,5"'), "m");
    expect(p.types.amount).toEqual({ type: "number", decimal: "," });
    expect(overrideColumnType(p.types, "amount", "money").amount).toEqual({ type: "money", decimal: "," });
    expect(overrideColumnType(p.types, "amount", "text").amount).toEqual({ type: "text" });
    expect(previewWarnings(p, p.types).map((w) => w.text)).toEqual(["1 value in amount could not be read as a number"]);
    const asText = rebuildPreview(p, { columns: { amount: { type: "text" } } });
    expect(asText.types.amount).toEqual({ type: "text" });
  });

  it("the steps yield on a big file and end in the same preview", () => {
    const rows = ["region,amount"];
    for (let i = 0; i < 12000; i++) rows.push(`R${i % 7},${i}`);
    const text = lines(...rows);
    const steps = previewSteps(csvSource(parseCsvGrid(text).grid), "big");
    let yielded = 0;
    let step = steps.next();
    while (!step.done) {
      yielded++;
      step = steps.next();
    }
    expect(yielded).toBeGreaterThan(1);
    const whole = buildUploadPreview(text, "big");
    expect(step.value.types).toEqual(whole.types);
    expect(step.value.rowCount).toBe(12000);
  });
});
