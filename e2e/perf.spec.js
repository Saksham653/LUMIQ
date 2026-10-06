// B7-1's browser-side speed target, measured for real: generate a
// 100,000 x 20 CSV in the page, drop it on the upload zone, and time
// drop → preview ready (worker parse + type detection). Target is
// 3,000 ms on a developer machine; CI runners get headroom but the
// measured number is always printed.

import { test, expect } from "@playwright/test";
import { enterDemo } from "./helpers.js";

test("100k x 20 CSV parses to preview inside the budget", async ({ page }) => {
  test.setTimeout(120_000);
  await enterDemo(page);
  await page.getByRole("button", { name: "Files" }).first().click();

  const ms = await page.evaluate(async () => {
    let seed = 42;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = (a) => a[Math.floor(rand() * a.length)];
    const blank = () => rand() < 0.03;
    const REG = ["North", "South", "East", "West", "Central", "NE", "NW", "SE", "SW", "Metro", "Rural", "Online"];
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lines = ["order_id,date,month,region,product,channel,city,revenue,units,price,discount_pct,cost,profit_margin,score,customer_count,rating,status,notes,ref_code,misc"];
    for (let i = 0; i < 100000; i++) {
      const m = Math.floor(rand() * 24), day = 1 + Math.floor(rand() * 28);
      lines.push([
        i + 1,
        `${2023 + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        MON[m % 12], pick(REG), `Product ${1 + Math.floor(rand() * 50)}`, pick(["Web", "Store", "Partner", "Phone", "App"]),
        blank() ? "" : pick(['"Lucknow, UP"', "Delhi", "Pune"]),
        blank() ? "" : `"₹${(1000 + Math.floor(rand() * 900000)).toLocaleString("en-US")}"`,
        blank() ? "" : Math.floor(rand() * 500), (10 + rand() * 990).toFixed(2),
        blank() ? "" : `${(rand() * 40).toFixed(1)}%`, Math.floor(rand() * 80000),
        (5 + rand() * 45).toFixed(2), Math.floor(rand() * 100), blank() ? "" : Math.floor(rand() * 5000),
        (1 + rand() * 4).toFixed(1), pick(["open", "closed", "pending"]), blank() ? "" : "routine order",
        `REF-${Math.floor(rand() * 1e6)}`, rand() < 0.5 ? "A" : "B",
      ].join(","));
    }
    const dt = new DataTransfer();
    dt.items.add(new File([lines.join("\r\n")], "perf-100k.csv", { type: "text/csv" }));
    const zone = document.querySelector(".upload-zone");
    const t0 = performance.now();
    zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    for (let i = 0; i < 2400; i++) {
      await new Promise((r) => setTimeout(r, 25));
      if ([...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Load")) {
        return Math.round(performance.now() - t0);
      }
    }
    return -1;
  });

  console.log(`\n  100k x 20 drop → preview ready: ${ms} ms (target 3,000 ms)\n`);
  expect(ms).toBeGreaterThan(0);
  await expect(page.getByText("100000 rows · 20 columns")).toBeVisible();
  // Local machines must hit the real 3 s target; shared CI runners
  // get 2x headroom but still publish the measured number above.
  expect(ms).toBeLessThan(process.env.CI ? 6000 : 3000);
});
