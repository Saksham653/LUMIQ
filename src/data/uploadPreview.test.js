import { describe, it, expect } from "vitest";
import { buildUploadPreview, previewWarnings, overrideColumnType, datasetFromPreview } from "./uploadPreview.js";
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
});
