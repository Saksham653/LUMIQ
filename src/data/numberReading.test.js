import { describe, it, expect } from "vitest";
import {
  normalizeCellText,
  digitSystemOf,
  readCurrencyMark,
  readNumberCell,
  evidenceOf,
  valueOf,
  createDecimalTally,
  addToDecimalTally,
  decideDecimalMark,
  readDateCell,
  looksLikeDateText,
  dateReadings,
  createDateTally,
  addToDateTally,
  decideDateOrder,
  canonicalDate,
} from "./numberReading.js";

const tallyOf = (cells) => {
  const tally = createDecimalTally();
  for (const raw of cells) addToDecimalTally(tally, raw, readNumberCell(raw));
  return tally;
};

const dateTallyOf = (cells) => {
  const tally = createDateTally();
  for (const raw of cells) addToDateTally(tally, raw, readDateCell(raw));
  return tally;
};

describe("digits of other writing systems", () => {
  it("maps Devanagari, Arabic-Indic, Persian and full-width digits to 0-9, same length", () => {
    expect(normalizeCellText("१२३ ١٢٣ ۱۲۳ １２３ 123")).toBe("123 123 123 123 123");
    const text = "कुल १२,३४५";
    expect(normalizeCellText(text)).toHaveLength(text.length);
    expect(normalizeCellText(null)).toBe("");
  });

  it("maps the marks that only belong to numbers", () => {
    expect(normalizeCellText("١٬٢٣٤٫٥٪")).toBe("1,234.5%");
    expect(normalizeCellText("（１，２００）")).toBe("(1,200)");
    expect(normalizeCellText("−500")).toBe("-500");
    expect(normalizeCellText("1 234 567")).toBe("1 234 567");
  });

  it("names the digit system", () => {
    expect(["१२", "١", "۱", "１", "12", "1२", "abc"].map(digitSystemOf)).toEqual([
      "devanagari",
      "arabic",
      "persian",
      "fullwidth",
      "latin",
      "mixed",
      null,
    ]);
  });
});

describe("currency marks", () => {
  it("takes one mark off the start or the end", () => {
    expect(readCurrencyMark("₹1,200")).toEqual({ rest: "1,200", symbol: "₹" });
    expect(readCurrencyMark("1,234.5 ₪")).toEqual({ rest: "1,234.5", symbol: "₪" });
    for (const cell of ["Rs. 500", "Rs500", "500 Rs", "INR 500", "500 INR"]) {
      expect(readCurrencyMark(cell)).toEqual({ rest: "500", symbol: "₹", currency: "INR" });
    }
    expect(readCurrencyMark("USD 12.5")).toEqual({ rest: "12.5", symbol: "$", currency: "USD" });
    expect(readCurrencyMark("12.5 EUR")).toEqual({ rest: "12.5", symbol: "€", currency: "EUR" });
    expect(readCurrencyMark("AED 300")).toEqual({ rest: "300", symbol: "AED", currency: "AED" });
    expect(readCurrencyMark("US$ 99")).toEqual({ rest: "99", symbol: "US$" });
    expect(readCurrencyMark("￥980")).toEqual({ rest: "980", symbol: "¥" });
    expect(readCurrencyMark("1,200円")).toEqual({ rest: "1,200", symbol: "¥", currency: "JPY" });
  });

  it("units and words are not money", () => {
    for (const cell of ["10 NOS", "5 PCS", "KGS 10", "TRY again", "500", "Rs", "abc"]) {
      expect(readCurrencyMark(cell)).toBeNull();
    }
  });
});

describe("readNumberCell: every way a cell can be meant", () => {
  const both = (raw) => {
    const r = readNumberCell(raw);
    return r && { dot: r.dot, comma: r.comma };
  };

  it("keeps both readings", () => {
    expect(both("1,234")).toEqual({ dot: 1234, comma: 1.234 });
    expect(both("1.234")).toEqual({ dot: 1.234, comma: 1234 });
    expect(both("1,5")).toEqual({ dot: null, comma: 1.5 });
    expect(both("0,500")).toEqual({ dot: null, comma: 0.5 });
    expect(both("0.500")).toEqual({ dot: 0.5, comma: null });
    expect(both("1 234")).toEqual({ dot: 1234, comma: 1234 });
    expect(both("1,234,567")).toEqual({ dot: 1234567, comma: null });
    expect(both("1,23,456.78")).toEqual({ dot: 123456.78, comma: null });
    expect(both("1.234,56")).toEqual({ dot: null, comma: 1234.56 });
    expect(both("1'234.50")).toEqual({ dot: 1234.5, comma: null });
  });

  it("keeps the old reading for 'the comma is not a decimal mark'", () => {
    expect(readNumberCell("1,5").loose).toBe(15);
    expect(readNumberCell("1.234,56").loose).toBeNull();
  });

  it("typed numbers pass through", () => {
    expect(readNumberCell(42)).toMatchObject({ dot: 42, comma: 42, typed: true });
    expect(readNumberCell(NaN)).toBeNull();
  });

  it("says what each cell is evidence of", () => {
    const kinds = ["1,234", "1.234", "1,5", "0,500", "0.500", "1 234", "1,234,567"].map((c) => evidenceOf(readNumberCell(c)));
    expect(kinds).toEqual(["either", "either", "comma", "comma", "dot", "same", "dot"]);
  });

  it("reads brackets, signs, currency before or after, /- and percent", () => {
    expect(readNumberCell("(1,200)")).toMatchObject({ dot: -1200, negative: true, brackets: true, kind: "number" });
    expect(readNumberCell("Rs. 500/-")).toMatchObject({ dot: 500, kind: "money", symbol: "₹", currency: "INR" });
    expect(readNumberCell("500/-")).toMatchObject({ dot: 500, kind: "money", symbol: null });
    expect(readNumberCell("(₹1,200.50)")).toMatchObject({ dot: -1200.5, kind: "money" });
    expect(readNumberCell("$(500)").dot).toBe(-500);
    expect(readNumberCell("500-").dot).toBe(-500);
    expect(readNumberCell("(12.5%)")).toMatchObject({ dot: -12.5, kind: "percent" });
    expect(readNumberCell("€ 1.234,50")).toMatchObject({ comma: 1234.5, symbol: "€" });
    expect(readNumberCell("1.234,50 €")).toMatchObject({ comma: 1234.5, symbol: "€" });
    expect(readNumberCell("£1,234.50")).toMatchObject({ dot: 1234.5, symbol: "£" });
    expect(readNumberCell("USD 12.5")).toMatchObject({ dot: 12.5, symbol: "$", currency: "USD" });
    expect(readNumberCell("रु 500")).toMatchObject({ dot: 500, kind: "money", symbol: "₹", currency: "INR" });
    expect(readNumberCell("१,२०० रू.")).toMatchObject({ dot: 1200, symbol: "₹" });
  });

  it("reads Devanagari and Arabic-Indic digits", () => {
    expect(readNumberCell("₹१,२०,०००")).toMatchObject({ dot: 120000, system: "devanagari" });
    expect(readNumberCell("١٬٢٣٤٫٥")).toMatchObject({ dot: 1234.5, system: "arabic" });
    expect(readNumberCell("२५%")).toMatchObject({ dot: 25, kind: "percent" });
  });

  it("still refuses what is not a number", () => {
    const bad = ["1,2,3", "1,23,45", "1.2.3", "10 NOS", "5 PCS", "98765 43210", "001 234", "12a", "N/A", "TRY 5 again", "1.5e3", "5.", "(a)", "-", "Rs.", "2024-01-31", "31/01/2024", "10:30", "+91 98765", "", "Lucknow, UP"];
    for (const cell of bad) expect(readNumberCell(cell)).toBeNull();
  });
});

describe("decideDecimalMark: the column decides", () => {
  it("a comma seen in the column settles it", () => {
    expect(decideDecimalMark(tallyOf(["1,5", "2,75", "3"]))).toMatchObject({ decimal: ",", confidence: "high", reason: "seen" });
  });

  it("1,5 alone is truly unsure: one and a half, or fifteen", () => {
    expect(decideDecimalMark(tallyOf(["1,5", "2", "3"]))).toMatchObject({ decimal: ",", confidence: "low", reason: "single" });
    // Beside thousands written with a comma it does not turn them into decimals.
    expect(decideDecimalMark(tallyOf(["1,200", "950", "1,5"]))).toMatchObject({ decimal: ".", confidence: "low", reason: "single", mixed: ["1,5"] });
    // A dot-grouped thousand agrees with it: the comma is the decimal mark.
    expect(decideDecimalMark(tallyOf(["1,5", "1.234"]))).toMatchObject({ decimal: ",", confidence: "high", reason: "seen" });
    // "0,5" could never have been fifteen.
    expect(decideDecimalMark(tallyOf(["0,5", "2"]))).toMatchObject({ decimal: ",", confidence: "high" });
    // Another column that writes decimal commas settles it.
    expect(decideDecimalMark(tallyOf(["1,5", "2"]), ",")).toMatchObject({ decimal: ",", confidence: "medium", reason: "other-columns" });
  });

  it("thousands with a comma stay thousands, as always", () => {
    expect(decideDecimalMark(tallyOf(["1,200", "950", "2,000"]))).toMatchObject({ decimal: ".", confidence: "medium", reason: "assumed" });
  });

  it("1.234 alone could be either: low", () => {
    expect(decideDecimalMark(tallyOf(["1.234", "2.500", "12.000"]))).toMatchObject({ decimal: ".", confidence: "low", reason: "assumed" });
    expect(decideDecimalMark(tallyOf(["1.234", "2.500"]), ",")).toMatchObject({ decimal: ",", confidence: "medium", reason: "other-columns" });
  });

  it("cells written both ways: the larger side wins, low, and the others are listed", () => {
    const d = decideDecimalMark(tallyOf(["1,234.50", "2,000.00", "3,5", "950.25"]));
    expect(d).toMatchObject({ decimal: ".", confidence: "low", reason: "mixed" });
    expect(d.mixed).toEqual(["3,5"]);
  });

  it("whole numbers have nothing to decide", () => {
    expect(decideDecimalMark(tallyOf(["12", "1 234", 5]))).toMatchObject({ decimal: ".", confidence: "high", reason: "nothing-to-decide" });
  });

  it("values under the column's mark", () => {
    expect(valueOf(readNumberCell("1,5"), ",")).toEqual({ value: 1.5, odd: false });
    expect(valueOf(readNumberCell("1,5"), ".")).toEqual({ value: 1.5, odd: true });
    expect(valueOf(readNumberCell("1,5"), ".", { chosen: true })).toEqual({ value: 15, odd: true });
    expect(valueOf(readNumberCell("1,234"), ",")).toEqual({ value: 1.234, odd: false });
    expect(valueOf(readNumberCell("1,234.5"), ",")).toEqual({ value: 1234.5, odd: true });
  });
});

describe("readDateCell", () => {
  it("keeps ISO dates as written and pads short ones", () => {
    for (const cell of ["2024-01-31", "2024-03-05 10:30", "2024-01-31T10:00:00Z"]) {
      expect(readDateCell(cell)).toMatchObject({ form: "fixed", text: cell });
    }
    expect(readDateCell("2024-3-5").text).toBe("2024-03-05");
    expect(readDateCell("2024/01/31").iso).toBe("2024-01-31");
    expect(readDateCell("2024.02.01").iso).toBe("2024-02-01");
  });

  it("reads d/m/y and m/d/y with / - . and two or four digit years", () => {
    expect(readDateCell("05/01/2024")).toMatchObject({ form: "numeric", a: 5, b: 1, year: 2024, dmy: true, mdy: true });
    expect(readDateCell("31/01/2024")).toMatchObject({ dmy: true, mdy: false });
    expect(readDateCell("1-31-24")).toMatchObject({ dmy: false, mdy: true, year: 2024 });
    expect(readDateCell("31.01.2024")).toMatchObject({ dmy: true, year: 2024 });
    expect(readDateCell("31/01/2024 14:30").time).toBe(" 14:30");
    expect(readDateCell("13/02/2024 9:05 PM").time).toBe(" 21:05");
    expect(["31/01/24", "13/02/49", "13/02/50", "13/02/99"].map((c) => readDateCell(c).year)).toEqual([2024, 2049, 1950, 1999]);
    expect(readDateCell("३१/०१/२०२४")).toMatchObject({ a: 31, b: 1, year: 2024 });
  });

  it("reads English month names", () => {
    const iso = ["5 Jan 2024", "05-Jan-24", "January 5, 2024", "5th Feb 2024", "Sept 3, 2024"].map((c) => readDateCell(c).iso);
    expect(iso).toEqual(["2024-01-05", "2024-01-05", "2024-01-05", "2024-02-05", "2024-09-03"]);
    expect(readDateCell("Jan 2024")).toMatchObject({ iso: "2024-01", precision: "month" });
    expect(readDateCell("2011-12")).toMatchObject({ iso: "2011-12", fiscal: true });
    expect(looksLikeDateText("2011-12")).toBe(false);
    expect(looksLikeDateText("2011-07")).toBe(true);
  });

  it("refuses what is not a real date", () => {
    for (const cell of ["Jan", "W1", "2024-Q1", "31/13/2024", "31/02/2024", "2024-13-45", "12/2024", "Q1 2024", "5 Foo 2024", "31/01-2024", "1,234", ""]) {
      expect(readDateCell(cell)).toBeNull();
    }
  });

  it("gives both readings for a question", () => {
    expect(dateReadings("05/01/2024")).toEqual({ dmy: "2024-01-05", mdy: "2024-05-01" });
    expect(dateReadings("31/01/2024")).toEqual({ dmy: "2024-01-31", mdy: null });
  });
});

describe("decideDateOrder", () => {
  it("a day above 12 settles it", () => {
    expect(decideDateOrder(dateTallyOf(["05/01/2024", "13/01/2024", "31/01/2024"]))).toMatchObject({ order: "dmy", confidence: "high", reason: "seen" });
    expect(decideDateOrder(dateTallyOf(["1-31-24", "2-1-24", "12-25-23"]))).toMatchObject({ order: "mdy", confidence: "high", reason: "seen" });
  });

  it("stays ambiguous instead of guessing", () => {
    const d = decideDateOrder(dateTallyOf(["05/01/2024", "03/04/2024", "01/02/2024", "02/01/2024"]));
    expect(d).toMatchObject({ order: "ambiguous", confidence: "low", reason: "undecided" });
    expect(d.examples).toHaveLength(3);
  });

  it("rows in date order one way only are evidence", () => {
    const cells = ["03/01/2024", "04/01/2024", "05/01/2024", "01/02/2024", "02/02/2024", "03/02/2024"];
    expect(decideDateOrder(dateTallyOf(cells))).toMatchObject({ order: "dmy", confidence: "medium", reason: "row-order" });
  });

  it("another date column of the file can settle it", () => {
    expect(decideDateOrder(dateTallyOf(["05/01/2024", "03/04/2024"]), "dmy")).toMatchObject({ order: "dmy", confidence: "medium", reason: "other-columns" });
  });

  it("one stray cell does not flip a column; an even split is ambiguous", () => {
    const stray = [...Array.from({ length: 19 }, (_, i) => `${13 + (i % 15)}/01/2024`), "01/13/2024"];
    expect(decideDateOrder(dateTallyOf(stray))).toMatchObject({ order: "dmy", confidence: "low", reason: "mixed" });
    const split = ["13/01/2024", "14/01/2024", "15/01/2024", "16/01/2024", "17/01/2024", "01/13/2024", "01/14/2024", "01/15/2024", "01/16/2024", "01/17/2024"];
    expect(decideDateOrder(dateTallyOf(split))).toMatchObject({ order: "ambiguous", confidence: "low", reason: "mixed" });
  });

  it("no 05/01-style cell: nothing to decide", () => {
    expect(decideDateOrder(dateTallyOf(["2024-01-01", "5 Jan 2024"])).order).toBeNull();
  });

  it("stores ISO dates when the order is known, the cell as written otherwise", () => {
    expect(canonicalDate("05/01/2024", "dmy")).toEqual({ value: "2024-01-05", read: true });
    expect(canonicalDate("05/01/2024", "mdy")).toEqual({ value: "2024-05-01", read: true });
    expect(canonicalDate(" 05/01/2024 ", "ambiguous")).toEqual({ value: "05/01/2024", read: false });
    expect(canonicalDate("31/01/2024", "mdy")).toEqual({ value: "31/01/2024", read: false });
    expect(canonicalDate("5 Jan 2024", undefined)).toEqual({ value: "2024-01-05", read: true });
    expect(canonicalDate("Total", "dmy")).toEqual({ value: "Total", read: false });
  });
});
