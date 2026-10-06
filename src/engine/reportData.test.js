import { describe, it, expect } from "vitest";
import { buildReportData, reportCandidates } from "./reportData.js";
import { SAMPLE_DATASETS } from "../data/sampleDatasets.js";
import { rowsToCsv } from "../lib/exportData.js";
import { parseCsvText } from "../data/csv.js";

describe("buildReportData (F17)", () => {
  const report = buildReportData(SAMPLE_DATASETS.sales);

  it("every number has a footnote", () => {
    expect(report.items.length).toBeGreaterThan(0);
    for (const item of report.items) {
      expect(typeof item.footnote).toBe("string");
      expect(item.footnote.length).toBeGreaterThan(10);
    }
  });

  it("totals and averages follow the aggregation rule, with honest footnotes", () => {
    const revenue = report.items.find((i) => i.label === "Total revenue");
    expect(revenue.value).toBe(4677000);
    expect(revenue.footnote).toBe("Sum of revenue across all 12 rows (blank cells skipped).");
    const margin = report.items.find((i) => i.label === "Average profit_margin");
    expect(margin.value).toBeCloseTo(25.325, 10);
    expect(margin.footnote).toBe("Average of profit_margin across all 12 rows (blank cells skipped).");
    const aov = report.items.find((i) => i.label === "Average avg_order_value");
    expect(aov).toBeTruthy(); // rate-like name → averaged, never summed
  });

  it("candidates cover every reported value for the number checker", () => {
    const candidates = reportCandidates(report);
    expect(candidates).toContain(4677000);
    expect(candidates).toContain(12);
  });
});

describe("CSV export (F17)", () => {
  it("round-trips quoted commas and blanks", () => {
    const columns = ["city", "revenue"];
    const rows = [
      { city: "Lucknow, UP", revenue: 120000 },
      { city: "Delhi", revenue: null },
    ];
    const csv = rowsToCsv(columns, rows);
    expect(csv).toContain('"Lucknow, UP"');
    const back = parseCsvText(csv);
    expect(back.columns).toEqual(columns);
    expect(back.rows).toEqual([
      { city: "Lucknow, UP", revenue: "120000" },
      { city: "Delhi", revenue: "" },
    ]);
  });

  it("matches the filtered rows exactly, in column order", () => {
    const ds = SAMPLE_DATASETS.sales;
    const filtered = ds.data.filter((r) => r.region === "North");
    const csv = rowsToCsv(ds.columns, filtered);
    const back = parseCsvText(csv);
    expect(back.rows).toHaveLength(3);
    expect(back.rows.map((r) => r.month)).toEqual(["Jan", "May", "Sep"]);
    expect(back.rows[0].revenue).toBe("245000");
  });
});
