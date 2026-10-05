import { describe, it, expect } from "vitest";
import {
  isBlank,
  isNumber,
  numericValues,
  sum,
  mean,
  min,
  max,
  numericPairs,
  numericEntries,
} from "./stats.js";

describe("blank handling in averages (F4)", () => {
  it("the average of 10, blank, 20 is 15", () => {
    expect(mean([10, "", 20])).toBe(15);
  });

  it("null and undefined cells are skipped, not counted as 0", () => {
    expect(mean([10, null, 20, undefined])).toBe(15);
    expect(mean([5, "", null])).toBe(5);
  });

  it("an all-blank column has no average", () => {
    expect(mean(["", null, undefined])).toBeNull();
    expect(mean([])).toBeNull();
  });

  it("text and NaN never leak into an average", () => {
    expect(mean([10, "n/a", 20, NaN])).toBe(15);
  });
});

describe("sum, min, max", () => {
  it("totals skip blanks", () => {
    expect(sum([10, "", 20])).toBe(30);
    expect(sum(["", null])).toBeNull();
  });

  it("min and max skip blanks instead of treating them as 0", () => {
    expect(min([10, "", 20])).toBe(10);
    expect(max([10, "", 20])).toBe(20);
    expect(min([-5, "", 3])).toBe(-5);
    expect(min(["", null])).toBeNull();
    expect(max([])).toBeNull();
  });

  it("zero is a real value, not a blank", () => {
    expect(isBlank(0)).toBe(false);
    expect(mean([0, 10])).toBe(5);
    expect(min([0, 10])).toBe(0);
  });
});

describe("numericValues / isNumber", () => {
  it("keeps only finite numbers", () => {
    expect(numericValues([1, "", "2", null, 3, NaN, Infinity])).toEqual([1, 3]);
    expect(isNumber("2")).toBe(false);
    expect(isNumber(2)).toBe(true);
  });
});

describe("numericPairs (correlation input)", () => {
  it("drops a row when either column is blank", () => {
    const rows = [
      { a: 1, b: 10 },
      { a: "", b: 20 },
      { a: 3, b: null },
      { a: 4, b: 40 },
    ];
    expect(numericPairs(rows, "a", "b")).toEqual({ xs: [1, 4], ys: [10, 40] });
  });
});

describe("numericEntries (outlier input)", () => {
  it("skips blanks but keeps original row indices", () => {
    const rows = [{ v: 10 }, { v: "" }, { v: 30 }, { v: null }, { v: 50 }];
    expect(numericEntries(rows, "v")).toEqual([
      { index: 0, value: 10 },
      { index: 2, value: 30 },
      { index: 4, value: 50 },
    ]);
  });
});
