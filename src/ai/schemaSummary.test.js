import { describe, it, expect } from "vitest";
import { buildSchemaSummary, renderSchemaSummary, schemaNumberCandidates } from "./schemaSummary.js";
import { buildPlanPrompt, buildExplainPrompt, parsePlannerReply, exampleQuestions } from "./oraclePlanner.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";
import { mean } from "../lib/stats.js";

const sales = SAMPLE_DATASETS.sales;

describe("buildSchemaSummary", () => {
  const summary = buildSchemaSummary(sales);

  it("covers all rows, not a sample", () => {
    expect(summary.rowCount).toBe(12);
    const revenue = summary.columns.find((c) => c.name === "revenue");
    expect(revenue.min).toBe(198000);
    expect(revenue.max).toBe(712000);
    expect(revenue.avg).toBe(389750); // 4,677,000 / 12
  });

  it("text columns get top values with counts", () => {
    const region = summary.columns.find((c) => c.name === "region");
    expect(region.unique).toBe(4);
    expect(region.top.map((t) => t.count)).toEqual([3, 3, 3, 3]);
  });

  it("the rendered text contains no raw rows", () => {
    const text = renderSchemaSummary(summary);
    expect(text).toContain("12 rows");
    expect(text).toContain("revenue (number)");
    // A raw row would pair month and revenue — month values never
    // appear because month is summarised as top values only, and no
    // full-row JSON is present.
    expect(text).not.toContain("245000"); // Jan's revenue, a cell value
    expect(text).not.toContain('"month"');
    expect(text).not.toContain("[{");
  });

  it("schemaNumberCandidates exposes only summary figures", () => {
    const candidates = schemaNumberCandidates(summary);
    expect(candidates).toContain(12);
    expect(candidates).toContain(389750);
    expect(candidates).not.toContain(245000);
  });
});

describe("planner prompts and parsing", () => {
  it("the plan prompt contains the schema, ops and no rows", () => {
    const text = buildPlanPrompt("total revenue by region", renderSchemaSummary(buildSchemaSummary(sales)));
    expect(text).toContain("sum, avg, min, max, count, median, share");
    expect(text).toContain("equals, not_equals");
    expect(text).not.toContain("245000");
  });

  it("the explain prompt caps the table at 50 rows", () => {
    const table = Array.from({ length: 80 }, (_, i) => ({ g: `g${i}`, v: i }));
    const text = buildExplainPrompt("q", ["step"], table, 100, 100);
    expect(text).toContain("first 50 of 80 rows");
    expect(text).not.toContain('"g":"g51"');
  });

  it("parses plan, describe, error and bare-plan replies", () => {
    expect(parsePlannerReply('{"type":"describe"}').kind).toBe("describe");
    expect(parsePlannerReply('```json\n{"type":"plan","plan":{"measures":[{"op":"count"}]}}\n```')).toEqual({
      kind: "plan",
      raw: { measures: [{ op: "count" }] },
    });
    expect(parsePlannerReply('{"error":"needs a forecast"}').kind).toBe("error");
    expect(parsePlannerReply('{"measures":[{"op":"count"}]}').kind).toBe("plan");
    expect(parsePlannerReply("row => true").kind).toBe("error");
    expect(parsePlannerReply("").kind).toBe("error");
  });

  it("example questions use real column names", () => {
    const qs = exampleQuestions(sales);
    expect(qs).toHaveLength(3);
    expect(qs.join(" ")).toContain("revenue");
    expect(qs.join(" ")).toMatch(/month|region|category/);
  });
});

describe("summary math sanity", () => {
  it("avg in the summary equals the blank-aware mean of all rows", () => {
    const summary = buildSchemaSummary(SAMPLE_DATASETS.churn);
    const ltv = summary.columns.find((c) => c.name === "ltv");
    expect(ltv.avg).toBeCloseTo(mean(SAMPLE_DATASETS.churn.data.map((r) => r.ltv)), 2);
  });
});
