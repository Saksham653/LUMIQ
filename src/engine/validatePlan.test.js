import { describe, it, expect } from "vitest";
import { validatePlan } from "./validatePlan.js";

const COLUMNS = ["month", "revenue", "region", "profit_margin"];
const TYPES = {
  month: { type: "text" },
  revenue: { type: "number" },
  region: { type: "text" },
  profit_margin: { type: "number" },
};

const base = (over = {}) => ({
  measures: [{ op: "sum", column: "revenue" }],
  ...over,
});

describe("validatePlan acceptance", () => {
  it("accepts and normalizes a full plan", () => {
    const res = validatePlan(
      {
        filter: { logic: "and", conditions: [{ column: "region", action: "equals", value: "North" }] },
        groupBy: ["region"],
        measures: [{ op: "sum", column: "revenue", as: "total_revenue" }],
        sort: { by: "total_revenue", dir: "desc" },
        limit: 5,
      },
      COLUMNS,
      TYPES
    );
    expect(res.ok).toBe(true);
    expect(res.plan.measures).toEqual([{ op: "sum", column: "revenue", as: "total_revenue" }]);
    expect(res.plan.sort).toEqual({ by: "total_revenue", dir: "desc" });
  });

  it("fills defaults: alias, sort dir, wraps a bare groupBy string", () => {
    const res = validatePlan(
      base({ groupBy: "region", sort: { by: "sum_revenue" } }),
      COLUMNS,
      TYPES
    );
    expect(res.ok).toBe(true);
    expect(res.plan.groupBy).toEqual(["region"]);
    expect(res.plan.measures[0].as).toBe("sum_revenue");
    expect(res.plan.sort.dir).toBe("desc");
  });

  it("resolves column case-insensitively and allows count without a column", () => {
    const res = validatePlan({ measures: [{ op: "count" }, { op: "avg", column: "Profit_Margin" }] }, COLUMNS, TYPES);
    expect(res.ok).toBe(true);
    expect(res.plan.measures[0]).toEqual({ op: "count", as: "count" });
    expect(res.plan.measures[1].column).toBe("profit_margin");
  });
});

describe("validatePlan rejections", () => {
  const reject = (raw, fragment) => {
    const res = validatePlan(raw, COLUMNS, TYPES);
    expect(res.ok).toBe(false);
    expect(res.error.toLowerCase()).toContain(fragment.toLowerCase());
  };

  it("unknown columns", () => {
    reject(base({ groupBy: ["profit"] }), 'unknown groupby column "profit"');
    reject({ measures: [{ op: "sum", column: "sales" }] }, 'unknown measure column "sales"');
  });

  it("unknown ops and keys", () => {
    reject({ measures: [{ op: "stddev", column: "revenue" }] }, "unknown measure op");
    reject(base({ extra: 1 }), 'unknown key "extra"');
    reject({ measures: [{ op: "sum", column: "revenue", mode: "x" }] }, 'unknown key "mode"');
    reject(base({ sort: { by: "sum_revenue", nulls: "last" } }), 'unknown key "nulls"');
  });

  it("sum/avg (and other numeric ops) on non-number columns", () => {
    reject({ measures: [{ op: "sum", column: "region" }] }, "needs a number column");
    reject({ measures: [{ op: "avg", column: "month" }] }, "needs a number column");
    reject({ measures: [{ op: "median", column: "region" }] }, "needs a number column");
    reject({ measures: [{ op: "share", column: "month" }] }, "needs a number column");
  });

  it("missing or empty measures", () => {
    reject({}, "at least one measure");
    reject({ measures: [] }, "at least one measure");
    reject({ measures: [{ op: "sum" }] }, "needs a column");
  });

  it("bad sort and limit", () => {
    reject(base({ sort: { by: "nope" } }), "cannot sort by");
    reject(base({ sort: { by: "sum_revenue", dir: "down" } }), "sort direction");
    reject(base({ limit: 0 }), "limit");
    reject(base({ limit: 2.5 }), "limit");
    reject(base({ limit: 100000 }), "limit");
  });

  it("duplicate measure names and bad filters", () => {
    reject(
      { measures: [{ op: "sum", column: "revenue", as: "x" }, { op: "avg", column: "revenue", as: "x" }] },
      "share the name"
    );
    reject(base({ filter: { logic: "and", conditions: [{ column: "nope", action: "equals", value: 1 }] } }), "in the filter");
  });

  it("junk input never throws", () => {
    for (const junk of [null, 7, "sum revenue", [], { measures: "all" }]) {
      const res = validatePlan(junk, COLUMNS, TYPES);
      expect(res.ok).toBe(false);
    }
  });
});
