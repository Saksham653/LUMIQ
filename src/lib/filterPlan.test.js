import { describe, it, expect } from "vitest";
import {
  validateFilterPlan,
  applyFilterPlan,
  describeFilterPlan,
  parseFilterPlanReply,
} from "./filterPlan.js";

const COLUMNS = ["month", "revenue", "region", "returns"];

const ROWS = [
  { month: "Jan", revenue: 245000, region: "North", returns: 4.2 },
  { month: "Feb", revenue: 198000, region: "South", returns: 6.8 },
  { month: "Mar", revenue: 312000, region: "East", returns: 3.9 },
  { month: "Apr", revenue: "", region: "North", returns: 5.1 },
  { month: "May", revenue: 334000, region: "", returns: null },
];

describe("validateFilterPlan", () => {
  it("accepts a valid and-plan and normalizes it", () => {
    const res = validateFilterPlan(
      {
        logic: "and",
        conditions: [
          { column: "revenue", action: "greater_than", value: 300000 },
          { column: "region", action: "equals", value: "North" },
        ],
      },
      COLUMNS
    );
    expect(res.ok).toBe(true);
    expect(res.plan).toEqual({
      logic: "and",
      conditions: [
        { column: "revenue", action: "greater_than", value: 300000 },
        { column: "region", action: "equals", value: "North" },
      ],
    });
  });

  it("defaults missing logic to and, and accepts or", () => {
    const noLogic = validateFilterPlan(
      { conditions: [{ column: "region", action: "is_empty" }] },
      COLUMNS
    );
    expect(noLogic.ok).toBe(true);
    expect(noLogic.plan.logic).toBe("and");

    const orPlan = validateFilterPlan(
      {
        logic: "or",
        conditions: [
          { column: "region", action: "equals", value: "North" },
          { column: "region", action: "equals", value: "South" },
        ],
      },
      COLUMNS
    );
    expect(orPlan.ok).toBe(true);
    expect(orPlan.plan.logic).toBe("or");
  });

  it("resolves column names case-insensitively", () => {
    const res = validateFilterPlan(
      { logic: "and", conditions: [{ column: "Revenue", action: "less_than", value: 200000 }] },
      COLUMNS
    );
    expect(res.ok).toBe(true);
    expect(res.plan.conditions[0].column).toBe("revenue");
  });

  it("rejects an unknown column", () => {
    const res = validateFilterPlan(
      { logic: "and", conditions: [{ column: "profit", action: "greater_than", value: 1 }] },
      COLUMNS
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Unknown column "profit"');
  });

  it("rejects an unknown action", () => {
    const res = validateFilterPlan(
      { logic: "and", conditions: [{ column: "revenue", action: "matches_regex", value: ".*" }] },
      COLUMNS
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Unknown action "matches_regex"');
  });

  it("rejects malicious or malformed input without throwing", () => {
    const bad = [
      null,
      "row => true",
      ["not", "a", "plan"],
      { logic: "nand", conditions: [{ column: "revenue", action: "equals", value: 1 }] },
      { logic: "and", conditions: "revenue > 100" },
      { logic: "and", conditions: [] },
      { logic: "and", conditions: [{ column: "__proto__", action: "equals", value: 1 }] },
      { logic: "and", conditions: [{ column: "constructor", action: "equals", value: 1 }] },
      { logic: "and", conditions: [{ column: "revenue", action: "equals", value: { $gt: 0 } }] },
      { logic: "and", conditions: [{ column: "revenue", action: "greater_than", value: "(function(){alert(1)})()" }] },
      { logic: "and", conditions: [{ column: "revenue", action: "between", value: [1, 2, 3] }] },
      { logic: "and", conditions: [{ column: "revenue", action: "between", value: "1-100" }] },
      { logic: "and", conditions: [{ column: "region", action: "is_one_of", value: "North" }] },
      { logic: "and", conditions: [{ column: "region", action: "is_one_of", value: [["nested"]] }] },
      { logic: "and", conditions: [{ column: "region", action: "contains", value: "" }] },
    ];
    for (const raw of bad) {
      const res = validateFilterPlan(raw, COLUMNS);
      expect(res.ok).toBe(false);
      expect(typeof res.error).toBe("string");
      expect(res.error.length).toBeGreaterThan(0);
    }
  });

  it("caps the number of conditions", () => {
    const res = validateFilterPlan(
      {
        logic: "and",
        conditions: Array.from({ length: 21 }, () => ({
          column: "revenue",
          action: "greater_than",
          value: 0,
        })),
      },
      COLUMNS
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Too many conditions");
  });

  it("normalizes a reversed between range", () => {
    const res = validateFilterPlan(
      { logic: "and", conditions: [{ column: "revenue", action: "between", value: [300000, 100000] }] },
      COLUMNS
    );
    expect(res.ok).toBe(true);
    expect(res.plan.conditions[0].value).toEqual([100000, 300000]);
  });
});

describe("applyFilterPlan", () => {
  const plan = (conditions, logic = "and") => ({ logic, conditions });

  it("filters with greater_than and equals combined with and", () => {
    const out = applyFilterPlan(
      ROWS,
      plan([
        { column: "revenue", action: "greater_than", value: 300000 },
        { column: "region", action: "equals", value: "east" },
      ])
    );
    expect(out.map((r) => r.month)).toEqual(["Mar"]);
  });

  it("combines conditions with or", () => {
    const out = applyFilterPlan(
      ROWS,
      plan(
        [
          { column: "region", action: "equals", value: "North" },
          { column: "revenue", action: "less_than", value: 200000 },
        ],
        "or"
      )
    );
    expect(out.map((r) => r.month)).toEqual(["Jan", "Feb", "Apr"]);
  });

  it("matches text case-insensitively and numbers loosely", () => {
    const byText = applyFilterPlan(ROWS, plan([{ column: "region", action: "equals", value: "NORTH" }]));
    expect(byText.map((r) => r.month)).toEqual(["Jan", "Apr"]);

    const byNumberString = applyFilterPlan(ROWS, plan([{ column: "revenue", action: "equals", value: "245000" }]));
    expect(byNumberString.map((r) => r.month)).toEqual(["Jan"]);
  });

  it("supports between (inclusive), contains and is_one_of", () => {
    const between = applyFilterPlan(ROWS, plan([{ column: "revenue", action: "between", value: [198000, 312000] }]));
    expect(between.map((r) => r.month)).toEqual(["Jan", "Feb", "Mar"]);

    const contains = applyFilterPlan(ROWS, plan([{ column: "month", action: "contains", value: "ma" }]));
    expect(contains.map((r) => r.month)).toEqual(["Mar", "May"]);

    const oneOf = applyFilterPlan(ROWS, plan([{ column: "region", action: "is_one_of", value: ["south", "East"] }]));
    expect(oneOf.map((r) => r.month)).toEqual(["Feb", "Mar"]);
  });

  it("treats blank cells as matching only is_empty", () => {
    const empty = applyFilterPlan(ROWS, plan([{ column: "revenue", action: "is_empty", value: null }]));
    expect(empty.map((r) => r.month)).toEqual(["Apr"]);

    // A blank revenue is not 0, so it never matches a numeric comparison…
    const lessThan = applyFilterPlan(ROWS, plan([{ column: "revenue", action: "less_than", value: 1e9 }]));
    expect(lessThan.map((r) => r.month)).toEqual(["Jan", "Feb", "Mar", "May"]);

    // …and it does not match not_equals either.
    const notEquals = applyFilterPlan(ROWS, plan([{ column: "revenue", action: "not_equals", value: 245000 }]));
    expect(notEquals.map((r) => r.month)).toEqual(["Feb", "Mar", "May"]);

    const nullCell = applyFilterPlan(ROWS, plan([{ column: "returns", action: "is_empty", value: null }]));
    expect(nullCell.map((r) => r.month)).toEqual(["May"]);
  });
});

describe("describeFilterPlan", () => {
  it("renders a plan in plain words", () => {
    const res = validateFilterPlan(
      {
        logic: "and",
        conditions: [
          { column: "revenue", action: "greater_than", value: 300000 },
          { column: "region", action: "equals", value: "North" },
        ],
      },
      COLUMNS
    );
    // Number grouping follows the machine locale (e.g. 300,000 or 3,00,000).
    expect(describeFilterPlan(res.plan)).toBe(
      `revenue is more than ${(300000).toLocaleString()} and region is "North"`
    );
  });

  it("covers between, is_one_of and is_empty wording", () => {
    const res = validateFilterPlan(
      {
        logic: "or",
        conditions: [
          { column: "revenue", action: "between", value: [1000, 2000] },
          { column: "region", action: "is_one_of", value: ["North", "South"] },
          { column: "returns", action: "is_empty" },
        ],
      },
      COLUMNS
    );
    expect(describeFilterPlan(res.plan)).toBe(
      `revenue is between ${(1000).toLocaleString()} and ${(2000).toLocaleString()} or region is one of "North", "South" or returns is empty`
    );
  });
});

describe("parseFilterPlanReply", () => {
  it("parses a plain JSON reply", () => {
    const res = parseFilterPlanReply('{"logic":"and","conditions":[{"column":"revenue","action":"greater_than","value":1}]}');
    expect(res.ok).toBe(true);
    expect(res.raw.conditions).toHaveLength(1);
  });

  it("strips markdown fences", () => {
    const res = parseFilterPlanReply('```json\n{"logic":"and","conditions":[]}\n```');
    expect(res.ok).toBe(true);
  });

  it("passes through a model refusal as a plain error", () => {
    const res = parseFilterPlanReply('{"error":"this needs a calculation, not a filter"}');
    expect(res.ok).toBe(false);
    expect(res.error).toContain("this needs a calculation");
  });

  it("rejects replies that are not JSON plans", () => {
    for (const text of ["", "row => row.revenue > 100", "```js\nrow => true\n```", "[1,2,3]"]) {
      const res = parseFilterPlanReply(text);
      expect(res.ok).toBe(false);
    }
  });
});
