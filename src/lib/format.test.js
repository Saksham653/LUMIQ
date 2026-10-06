import { describe, it, expect } from "vitest";
import { fitLabel, fmtNum } from "./format.js";

describe("fitLabel (B4-7)", () => {
  it("0.7 and above is strong", () => {
    expect(fitLabel(0.7)).toBe("strong");
    expect(fitLabel(0.8)).toBe("strong");
    expect(fitLabel(1)).toBe("strong");
  });

  it("0.4 to 0.7 is moderate", () => {
    expect(fitLabel(0.4)).toBe("moderate");
    expect(fitLabel(0.55)).toBe("moderate");
    expect(fitLabel(0.699)).toBe("moderate");
  });

  it("below 0.4 is weak", () => {
    expect(fitLabel(0.39)).toBe("weak");
    expect(fitLabel(0)).toBe("weak");
    expect(fitLabel(-0.2)).toBe("weak");
  });

  it("junk input degrades to weak, never crashes", () => {
    expect(fitLabel(null)).toBe("weak");
    expect(fitLabel(undefined)).toBe("weak");
    expect(fitLabel(NaN)).toBe("weak");
  });
});

describe("fmtNum", () => {
  it("compresses to K/M and shows an em dash for blanks", () => {
    expect(fmtNum(4677000)).toBe("4.7M");
    expect(fmtNum(712000)).toBe("712K");
    expect(fmtNum(42)).toBe("42");
    expect(fmtNum(4.25)).toBe("4.3");
    expect(fmtNum(null)).toBe("—");
  });
});
