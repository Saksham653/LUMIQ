import { describe, it, expect } from "vitest";
import { runPlan } from "./runPlan.js";

const ROWS = [
  { region: "North", revenue: 100, margin: 20 },
  { region: "North", revenue: 300, margin: 30 },
  { region: "South", revenue: 200, margin: 10 },
  { region: "South", revenue: null, margin: 40 },
  { region: "East", revenue: 400, margin: null },
];
const COLUMNS = ["region", "revenue", "margin"];

const m = (op, column, as) => (column ? { op, column, as: as || `${op}_${column}` } : { op, as: as || "count" });

describe("runPlan measures", () => {
  it("sum, avg, min, max, median, count on the whole table", () => {
    const { table, rowsUsed, totalRows } = runPlan(ROWS, COLUMNS, {
      measures: [m("sum", "revenue"), m("avg", "revenue"), m("min", "revenue"), m("max", "revenue"), m("median", "revenue"), m("count")],
    });
    expect(rowsUsed).toBe(5);
    expect(totalRows).toBe(5);
    expect(table).toEqual([
      {
        sum_revenue: 1000,
        avg_revenue: 250, // 1000 / 4 real values — the blank is skipped
        min_revenue: 100,
        max_revenue: 400,
        median_revenue: 250, // 100,200,300,400 → (200+300)/2
        count: 5,
      },
    ]);
  });

  it("count with a column counts filled-in cells only", () => {
    const { table } = runPlan(ROWS, COLUMNS, { measures: [m("count", "revenue", "n")] });
    expect(table[0].n).toBe(4);
  });

  it("median with an odd count picks the middle value", () => {
    const { table } = runPlan(ROWS.slice(0, 3), COLUMNS, { measures: [m("median", "revenue")] });
    expect(table[0].median_revenue).toBe(200);
  });
});

describe("runPlan grouping, share, sort, limit", () => {
  it("groups and aggregates per group, blanks skipped", () => {
    const { table, steps } = runPlan(ROWS, COLUMNS, {
      groupBy: ["region"],
      measures: [m("sum", "revenue"), m("avg", "margin")],
    });
    expect(table).toEqual([
      { region: "North", sum_revenue: 400, avg_margin: 25 },
      { region: "South", sum_revenue: 200, avg_margin: 25 },
      { region: "East", sum_revenue: 400, avg_margin: null },
    ]);
    expect(steps.join(" | ")).toContain("Grouped by region (3 groups)");
  });

  it("share of total adds up to 100 across groups", () => {
    const { table } = runPlan(ROWS, COLUMNS, {
      groupBy: ["region"],
      measures: [m("share", "revenue")],
    });
    const shares = table.map((r) => r.share_revenue);
    expect(shares).toEqual([40, 20, 40]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("sorts by a measure in both directions and limits", () => {
    const desc = runPlan(ROWS, COLUMNS, {
      groupBy: ["region"],
      measures: [m("sum", "revenue")],
      sort: { by: "sum_revenue", dir: "desc" },
      limit: 2,
    });
    expect(desc.table.map((r) => r.region)).toEqual(["North", "East"]);
    expect(desc.steps.join(" | ")).toContain("Kept the top 2 of 3");

    const asc = runPlan(ROWS, COLUMNS, {
      groupBy: ["region"],
      measures: [m("sum", "revenue")],
      sort: { by: "sum_revenue", dir: "asc" },
    });
    expect(asc.table[0].region).toBe("South");
  });

  it("filter runs first and is counted in the steps", () => {
    const { table, rowsUsed, steps } = runPlan(ROWS, COLUMNS, {
      filter: { logic: "and", conditions: [{ column: "region", action: "equals", value: "North" }] },
      measures: [m("sum", "revenue")],
    });
    expect(rowsUsed).toBe(2);
    expect(table[0].sum_revenue).toBe(400);
    expect(steps[0]).toBe('Kept rows where region is "North" (2 of 5 rows)');
  });

  it("an all-blank group aggregates to null, never 0", () => {
    const rows = [
      { region: "X", revenue: null },
      { region: "X", revenue: "" },
    ];
    const { table } = runPlan(rows, ["region", "revenue"], {
      groupBy: ["region"],
      measures: [m("sum", "revenue"), m("avg", "revenue")],
    });
    expect(table).toEqual([{ region: "X", sum_revenue: null, avg_revenue: null }]);
  });

  it("steps read as plain English", () => {
    const { steps } = runPlan(ROWS, COLUMNS, {
      filter: { logic: "and", conditions: [{ column: "revenue", action: "greater_than", value: 150 }] },
      groupBy: ["region"],
      measures: [m("sum", "revenue"), m("share", "revenue")],
      sort: { by: "sum_revenue", dir: "desc" },
    });
    expect(steps).toEqual([
      `Kept rows where revenue is more than ${(150).toLocaleString()} (3 of 5 rows)`,
      "Grouped by region (3 groups)",
      "Added up revenue",
      "Calculated each group's share of total revenue",
      "Sorted by sum_revenue, highest first",
    ]);
  });
});
