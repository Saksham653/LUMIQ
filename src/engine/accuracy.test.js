// Accuracy set (F7/F8): hand-written plans over the three sample
// datasets, each expected value worked out by hand from the data in
// src/data/sampleDatasets.js. If one of these fails, the engine is
// giving wrong numbers — never "fix" the expectation to match.

import { describe, it, expect } from "vitest";
import { runPlan } from "./runPlan.js";
import { validatePlan } from "./validatePlan.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";

const run = (dsKey, rawPlan) => {
  const ds = SAMPLE_DATASETS[dsKey];
  const checked = validatePlan(rawPlan, ds.columns, ds.columnTypes);
  expect(checked.ok, checked.error).toBe(true);
  return runPlan(ds.data, ds.columns, checked.plan);
};

describe("accuracy: E-Commerce Sales (12 rows)", () => {
  it("1. total revenue = 4,677,000", () => {
    const { table } = run("sales", { measures: [{ op: "sum", column: "revenue" }] });
    expect(table[0].sum_revenue).toBe(4677000);
  });

  it("2. total revenue by region, highest first", () => {
    const { table } = run("sales", {
      groupBy: ["region"],
      measures: [{ op: "sum", column: "revenue", as: "total" }],
      sort: { by: "total", dir: "desc" },
    });
    expect(table).toEqual([
      { region: "South", total: 1331000 },
      { region: "West", total: 1276000 },
      { region: "East", total: 1135000 },
      { region: "North", total: 935000 },
    ]);
  });

  it("3. average profit margin = 25.325", () => {
    const { table } = run("sales", { measures: [{ op: "avg", column: "profit_margin" }] });
    expect(table[0].avg_profit_margin).toBeCloseTo(25.325, 10);
  });

  it("4. month with the highest revenue = Dec (712,000)", () => {
    const { table } = run("sales", {
      groupBy: ["month"],
      measures: [{ op: "sum", column: "revenue", as: "rev" }],
      sort: { by: "rev", dir: "desc" },
      limit: 1,
    });
    expect(table).toEqual([{ month: "Dec", rev: 712000 }]);
  });

  it("5. North has 3 rows", () => {
    const { table, rowsUsed } = run("sales", {
      filter: { logic: "and", conditions: [{ column: "region", action: "equals", value: "North" }] },
      measures: [{ op: "count" }],
    });
    expect(rowsUsed).toBe(3);
    expect(table[0].count).toBe(3);
  });

  it("6. orders by category", () => {
    const { table } = run("sales", {
      groupBy: ["category"],
      measures: [{ op: "sum", column: "orders", as: "orders" }],
      sort: { by: "orders", dir: "desc" },
    });
    expect(table).toEqual([
      { category: "Electronics", orders: 17290 },
      { category: "Clothing", orders: 11640 },
      { category: "Home", orders: 4940 },
    ]);
  });

  it("7. revenue share by region adds to 100", () => {
    const { table } = run("sales", {
      groupBy: ["region"],
      measures: [{ op: "share", column: "revenue", as: "share" }],
      sort: { by: "share", dir: "desc" },
    });
    expect(table).toEqual([
      { region: "South", share: 28.46 },
      { region: "West", share: 27.28 },
      { region: "East", share: 24.27 },
      { region: "North", share: 19.99 },
    ]);
    expect(table.reduce((a, r) => a + r.share, 0)).toBeCloseTo(100, 1);
  });

  it("8. median revenue = 367,000", () => {
    const { table } = run("sales", { measures: [{ op: "median", column: "revenue" }] });
    expect(table[0].median_revenue).toBe(367000);
  });

  it("9. 5 months have revenue between 300,000 and 400,000", () => {
    const { table } = run("sales", {
      filter: { logic: "and", conditions: [{ column: "revenue", action: "between", value: [300000, 400000] }] },
      measures: [{ op: "count" }],
    });
    expect(table[0].count).toBe(5);
  });

  it("10. lowest profit margin per category", () => {
    const { table } = run("sales", {
      groupBy: ["category"],
      measures: [{ op: "min", column: "profit_margin", as: "low" }],
      sort: { by: "low", dir: "asc" },
    });
    expect(table).toEqual([
      { category: "Electronics", low: 19.7 },
      { category: "Clothing", low: 26.1 },
      { category: "Home", low: 27.3 },
    ]);
  });

  it("11. average order value in the North = 138.3667", () => {
    const { table } = run("sales", {
      filter: { logic: "and", conditions: [{ column: "region", action: "equals", value: "North" }] },
      measures: [{ op: "avg", column: "avg_order_value", as: "aov" }],
    });
    expect(table[0].aov).toBeCloseTo(415.1 / 3, 10);
  });

  it("12. max returns in Clothing = 8.9", () => {
    const { table } = run("sales", {
      filter: { logic: "and", conditions: [{ column: "category", action: "equals", value: "Clothing" }] },
      measures: [{ op: "max", column: "returns" }],
    });
    expect(table[0].max_returns).toBe(8.9);
  });
});

describe("accuracy: Marketing Campaign (8 rows)", () => {
  it("13. channel with the lowest average CAC = Email (3.6)", () => {
    const { table } = run("marketing", {
      groupBy: ["channel"],
      measures: [{ op: "avg", column: "cac", as: "cac" }],
      sort: { by: "cac", dir: "asc" },
      limit: 1,
    });
    expect(table).toEqual([{ channel: "Email", cac: 3.6 }]);
  });

  it("14. total spend by channel", () => {
    const { table } = run("marketing", {
      groupBy: ["channel"],
      measures: [{ op: "sum", column: "spend", as: "spend" }],
      sort: { by: "spend", dir: "desc" },
    });
    expect(table).toEqual([
      { channel: "Google Ads", spend: 97000 },
      { channel: "Meta Ads", spend: 79000 },
      { channel: "SEO", spend: 24000 },
      { channel: "Email", spend: 16000 },
    ]);
  });

  it("15. total conversions = 10,776", () => {
    const { table } = run("marketing", { measures: [{ op: "sum", column: "conversions" }] });
    expect(table[0].sum_conversions).toBe(10776);
  });

  it("16. best ROAS = 13.2", () => {
    const { table } = run("marketing", { measures: [{ op: "max", column: "roas" }] });
    expect(table[0].max_roas).toBe(13.2);
  });

  it("17. clicks in week W2 = 209,600", () => {
    const { table } = run("marketing", {
      filter: { logic: "and", conditions: [{ column: "week", action: "equals", value: "W2" }] },
      measures: [{ op: "sum", column: "clicks" }],
    });
    expect(table[0].sum_clicks).toBe(209600);
  });

  it("18. spend share by channel", () => {
    const { table } = run("marketing", {
      groupBy: ["channel"],
      measures: [{ op: "share", column: "spend", as: "share" }],
      sort: { by: "share", dir: "desc" },
    });
    expect(table).toEqual([
      { channel: "Google Ads", share: 44.91 },
      { channel: "Meta Ads", share: 36.57 },
      { channel: "SEO", share: 11.11 },
      { channel: "Email", share: 7.41 },
    ]);
  });
});

describe("accuracy: Customer Churn (5 rows)", () => {
  it("19. churn rate by cohort (already one row each)", () => {
    const { table } = run("churn", {
      groupBy: ["cohort"],
      measures: [{ op: "avg", column: "churn_rate", as: "rate" }],
    });
    expect(table).toEqual([
      { cohort: "2024-Q1", rate: 7.0 },
      { cohort: "2024-Q2", rate: 6.0 },
      { cohort: "2024-Q3", rate: 5.9 },
      { cohort: "2024-Q4", rate: 5.9 },
      { cohort: "2025-Q1", rate: 4.5 },
    ]);
  });

  it("20. average churn rate = 5.86", () => {
    const { table } = run("churn", { measures: [{ op: "avg", column: "churn_rate" }] });
    expect(table[0].avg_churn_rate).toBeCloseTo(5.86, 10);
  });

  it("21. total customers = 9,970", () => {
    const { table } = run("churn", { measures: [{ op: "sum", column: "customers" }] });
    expect(table[0].sum_customers).toBe(9970);
  });

  it("22. cohort with the best NPS = 2025-Q1 (67)", () => {
    const { table } = run("churn", {
      groupBy: ["cohort"],
      measures: [{ op: "max", column: "nps", as: "nps" }],
      sort: { by: "nps", dir: "desc" },
      limit: 1,
    });
    expect(table).toEqual([{ cohort: "2025-Q1", nps: 67 }]);
  });

  it("23. total MRR = 1,495,500 and 3 cohorts churn below 6%", () => {
    const mrr = run("churn", { measures: [{ op: "sum", column: "mrr" }] });
    expect(mrr.table[0].sum_mrr).toBe(1495500);

    const low = run("churn", {
      filter: { logic: "and", conditions: [{ column: "churn_rate", action: "less_than", value: 6 }] },
      measures: [{ op: "count" }],
    });
    expect(low.table[0].count).toBe(3);
  });
});
