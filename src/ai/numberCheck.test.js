import { describe, it, expect } from "vitest";
import { extractNumbers, collectCandidates, verifyNumbers } from "./numberCheck.js";

describe("extractNumbers", () => {
  it("reads plain, comma-grouped and Indian-grouped numbers", () => {
    const nums = extractNumbers("Revenue was 4,677,000 or 46,77,000 or 4677000.");
    expect(nums.map((n) => n.value)).toEqual([4677000, 4677000, 4677000]);
  });

  it("reads %, K, M, lakh and crore", () => {
    const nums = extractNumbers("Margin 25.3%, spend 97K, revenue 4.68M, 1.2 lakh, 2 crore.");
    expect(nums.map((n) => n.value)).toEqual([25.3, 97000, 4680000, 120000, 20000000]);
  });

  it("a number at the end of a sentence still parses with its unit", () => {
    const nums = extractNumbers("It reached 4.68M.");
    expect(nums).toHaveLength(1);
    expect(nums[0].value).toBe(4680000);
  });

  it("skips identifiers, versions and letter-adjacent digits", () => {
    expect(extractNumbers("W2 and Q1 and v1.2.3 and ab12")).toHaveLength(0);
  });

  it("tolerance follows the precision shown", () => {
    const [a] = extractNumbers("3.4K");
    expect(a.value).toBe(3400);
    expect(a.tolerance).toBeCloseTo(50, 9);
    const [b] = extractNumbers("45%");
    expect(b.tolerance).toBeCloseTo(0.5, 9);
    const [c] = extractNumbers("45.2");
    expect(c.tolerance).toBeCloseTo(0.05, 9);
  });
});

describe("verifyNumbers (F8 checker)", () => {
  const table = [
    { region: "South", total: 1331000, share: 28.46 },
    { region: "North", total: 935000, share: 19.99 },
    { cohort: "2024-Q1", rate: 7 },
  ];
  const candidates = collectCandidates(table, [12, 4]);

  it("verifies exact, rounded and scaled quotes of table values", () => {
    const text = "South made 1,331,000 (28.46%), roughly 1.33M or 28.5%, from 12 rows.";
    const { segments, checked, unverified } = verifyNumbers(text, candidates);
    expect(checked).toBe(5);
    expect(unverified).toBe(0);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });

  it("flags numbers that match nothing in the table", () => {
    const { segments, unverified } = verifyNumbers("North made 999,999 which is 55% of sales.", candidates);
    expect(unverified).toBe(2);
    const flagged = segments.filter((s) => s.number !== undefined && !s.verified).map((s) => s.text);
    expect(flagged).toEqual(["999,999", "55%"]);
  });

  it("numbers inside text cells count as candidates (2024-Q1 → 2024)", () => {
    const { unverified } = verifyNumbers("The 2024 cohorts churned at 7%.", candidates);
    expect(unverified).toBe(0);
  });

  it("rounding to fewer digits verifies, a wrong digit does not", () => {
    const ok = verifyNumbers("About 1.3M.", candidates);
    expect(ok.unverified).toBe(0);
    const bad = verifyNumbers("About 1.4M.", candidates);
    expect(bad.unverified).toBe(1);
  });

  it("Indian grouping and lakh quotes verify against the same value", () => {
    const { unverified } = verifyNumbers("That is 9,35,000, about 9.35 lakh.", candidates);
    expect(unverified).toBe(0);
  });

  it("segments always reassemble the original text", () => {
    for (const text of [
      "No numbers here.",
      "Edge 5",
      "5 starts and ends 9",
      "Mixed 1,234 and junk v1.2.3 and 45% end.",
      "",
    ]) {
      const { segments } = verifyNumbers(text, candidates);
      expect(segments.map((s) => s.text).join("")).toBe(text);
    }
  });
});
