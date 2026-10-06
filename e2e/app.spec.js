// B7-4: five end-to-end flows against the production build, Chromium
// only. Groq is mocked by route interception (helpers.js) — no real
// network call and no real key anywhere in these tests.

import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mockGroq, enterDemo, enterWithMockKey } from "./helpers.js";

let dir, csvPath, xlsxPath;

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "lumiq-e2e-"));
  csvPath = join(dir, "mini.csv");
  writeFileSync(csvPath, 'city,amount\n"Lucknow, UP",1200\nDelhi,800\nPune,\n');
  // The Excel fixture is built with the same pinned SheetJS the app uses
  const mod = await import("xlsx");
  const XLSX = typeof mod.read === "function" ? mod : mod.default;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      [["order", "", "date", "amount"], ["A-1", "x", new Date(2024, 2, 5), "₹1,200"], ["A-2", "y", new Date(2024, 2, 6), "₹980"], ["A-3", "z", new Date(2024, 2, 7), ""]],
      { cellDates: true }
    ),
    "Orders"
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["note", "count"], ["hello", 1]]), "Notes");
  xlsxPath = join(dir, "two-sheet.xlsx");
  writeFileSync(xlsxPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true }));
});

test("1. demo opens on Overview with correct tiles", async ({ page }) => {
  await enterDemo(page);
  await expect(page.getByText("Total · revenue")).toBeVisible();
  await expect(page.getByText("4.7M")).toBeVisible(); // 4,677,000 summed in the browser
  await expect(page.getByText("Auto Insights")).toBeVisible();
  await expect(page.getByText(/Showing 12 of 12 rows/)).toBeVisible();
});

test("2. upload a CSV and an Excel file through the preview", async ({ page }) => {
  await enterDemo(page);
  await page.getByRole("button", { name: "Files" }).first().click();

  // CSV: preview with quoted comma intact, then Load
  await page.getByLabel("Choose a CSV or Excel file").setInputFiles(csvPath);
  await expect(page.getByText("3 rows · 2 columns")).toBeVisible();
  await expect(page.getByText("Lucknow, UP")).toBeVisible();
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByText(/Showing 3 of 3 rows/)).toBeVisible();

  // Excel: sheet picker → Orders → preview shows real dates and ₹
  await page.getByRole("button", { name: "Files" }).first().click();
  await page.getByLabel("Choose a CSV or Excel file").setInputFiles(xlsxPath);
  await expect(page.getByText("This file has 2 sheets")).toBeVisible();
  await page.getByRole("button", { name: "📄 Orders" }).click();
  await expect(page.getByText("3 rows · 4 columns")).toBeVisible();
  await expect(page.getByText("2024-03-05")).toBeVisible();
  await expect(page.getByText("Column 2")).toBeVisible(); // blank header got a name
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByText(/Showing 3 of 3 rows/)).toBeVisible();
});

test("3. ask a question and a follow-up, open Show the work, check the rows count", async ({ page }) => {
  await enterWithMockKey(page);
  await page.getByRole("button", { name: "E-Commerce Sales" }).first().click();
  await page.getByRole("button", { name: "Ask" }).first().click();

  const input = page.getByLabel("Ask a question about your data");
  await input.fill("What is the total revenue by region?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText(/The leading group tops the table/)).toBeVisible();

  await input.fill("and by category?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText(/The leading group tops the table/).nth(1)).toBeVisible();

  // Proof of the follow-up: full engine run on all rows, new grouping
  await page.getByText("Show the work").nth(1).click();
  await expect(page.getByText("Based on 12 of 12 rows").nth(1)).toBeVisible();
  await expect(page.locator("li", { hasText: "Grouped by category (3 groups)" })).toBeVisible();
});

test("4. what-if calculation matches the expected total", async ({ page }) => {
  await enterDemo(page);
  await page.getByRole("button", { name: "What-if" }).first().click();
  await page.getByRole("button", { name: "Apply change" }).click();
  // +10% on revenue across all rows: 4,677,000 → 5,144,700 — the
  // expected string is built in the page so the locale cannot lie
  const expected = await page.evaluate(() => (5144700).toLocaleString());
  await expect(page.getByText(expected, { exact: true })).toBeVisible();
});

test("5. report shows footnotes, and the CSV download works", async ({ page }) => {
  await enterDemo(page);
  await page.getByRole("button", { name: "Report" }).first().click();
  await expect(page.getByText("Sum of revenue across all 12 rows (blank cells skipped).")).toBeVisible();
  await expect(page.getByRole("button", { name: "🖨 Print or save as PDF" })).toBeEnabled();

  await page.getByRole("button", { name: "Overview" }).first().click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "⬇ Download filtered data (CSV)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("E-Commerce Sales-filtered.csv");
  const file = join(dir, "downloaded.csv");
  await download.saveAs(file);
  const text = readFileSync(file, "utf8").trim();
  const lines = text.split(/\r?\n/);
  expect(lines[0]).toBe("month,revenue,orders,avg_order_value,region,category,returns,profit_margin");
  expect(lines).toHaveLength(13); // header + all 12 rows
  expect(text).toContain("Jan,245000");
});
