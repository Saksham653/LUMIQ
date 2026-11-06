// Layout regressions found while photographing the live app. Each
// check measures the real production build in Chromium, because jsdom
// has no layout engine and cannot see any of these bugs.
//
//  1. Overview overflowed sideways between ~901px and ~1090px: the
//     chart header's minimum width pushed the "chart | Auto Insights"
//     grid past the right edge of <main>.
//  2. Data health -> Run Deep Dive: the results grid made the two
//     cards a third wide each, and the correlation heatmap was clipped.
//  3. The Peak Value tile's third donut was clipped at the tile edge.

import { test, expect } from "@playwright/test";
import { enterDemo } from "./helpers.js";

// Pixels <main> would have to scroll sideways. 0 means nothing sticks out.
const mainOverflow = (page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return main.scrollWidth - main.clientWidth;
  });

const resize = (page, width) => page.setViewportSize({ width, height: 900 });

// The heatmap must be drawn completely: its box inside the card, and no
// ancestor between them with content scrolled out of sight.
async function expectHeatmapFullyVisible(card) {
  const cb = await card.boundingBox();
  const hm = await card.locator("svg").first().boundingBox();
  expect(hm.x).toBeGreaterThanOrEqual(cb.x);
  expect(hm.x + hm.width).toBeLessThanOrEqual(cb.x + cb.width);
  const hidden = await card.evaluate((el) => {
    let node = el.querySelector("svg").parentElement;
    while (node && node !== el) {
      if (node.scrollWidth > node.clientWidth) return node.scrollWidth - node.clientWidth;
      node = node.parentElement;
    }
    return 0;
  });
  expect(hidden).toBe(0);
}

test.describe("Overview", () => {
  // 768, 900 and 1093+ were already fine. 901-1090 is the measured bug
  // (117px at 960, 77px at 1000), and 360 overflowed by 197px for the
  // same reason: a bare 1fr track cannot shrink below the chart header.
  // 1024 and 1180 are iPad landscape.
  for (const width of [360, 768, 900, 901, 960, 1000, 1024, 1050, 1093, 1180, 1280, 1536]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await resize(page, width);
      await enterDemo(page);
      await expect(page.getByText("Auto Insights")).toBeVisible();
      expect(await mainOverflow(page)).toBe(0);
    });
  }

  test("keeps Auto Insights fully inside the window at 1000px", async ({ page }) => {
    await resize(page, 1000);
    await enterDemo(page);
    const box = await page.getByText("Auto Insights").boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(1000);
    // and the chart card still has a usable width next to it
    const card = await page.locator(".overview-grid > .glass-card").boundingBox();
    expect(card.width).toBeGreaterThan(300);
  });

  // Tiles are only 200-240px wide at these widths: 900 is the narrowest
  // 3-column case, 1180 the narrowest 4-column one, 1280 the common one.
  for (const width of [900, 1000, 1180, 1280]) {
    test(`Peak Value tile shows all three donuts inside its card at ${width}px`, async ({ page }) => {
      await resize(page, width);
      await enterDemo(page);
      await expect(page.getByText("Peak Value")).toBeVisible();
      const tile = page.locator(".metric-card.violet");
      const tileBox = await tile.boundingBox();
      const svgs = await tile.locator("svg").all();
      expect(svgs).toHaveLength(3);
      for (const svg of svgs) {
        const b = await svg.boundingBox();
        // every donut sits inside the tile's padding box, none is cut off
        expect(b.x).toBeGreaterThanOrEqual(tileBox.x);
        expect(b.x + b.width).toBeLessThanOrEqual(tileBox.x + tileBox.width);
      }
      // nothing in any tile is hidden by its own overflow: hidden
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll(".metric-card")].filter((c) => c.scrollWidth > c.clientWidth).length
      );
      expect(clipped).toBe(0);
    });
  }
});

test.describe("Data health -> Run Deep Dive", () => {
  const runDeepDive = async (page) => {
    await enterDemo(page);
    // The top tabs exist at every width; below 768px the sidebar is off-canvas
    await page.locator(".top-tabs").getByRole("button", { name: "Data health" }).click();
    await page.getByRole("button", { name: "Run Deep Dive" }).click();
    await expect(page.getByText("Correlation Matrix")).toBeVisible();
    await expect(page.getByText("Anomaly Detection")).toBeVisible();
  };

  for (const width of [1280, 1093]) {
    test(`shows two roomy cards and a fully visible heatmap at ${width}px`, async ({ page }) => {
      await resize(page, width);
      await runDeepDive(page);

      const corr = page.locator(".glass-card", { has: page.getByRole("heading", { name: "Correlation Matrix" }) });
      const anom = page.locator(".glass-card", { has: page.getByRole("heading", { name: "Anomaly Detection" }) });
      const cb = await corr.boundingBox();
      const ab = await anom.boundingBox();

      // two columns side by side, not three narrow ones with a hole
      expect(Math.abs(cb.y - ab.y)).toBeLessThan(2);
      expect(ab.x).toBeGreaterThan(cb.x + cb.width - 1);
      expect(cb.width).toBeGreaterThanOrEqual(340);
      expect(ab.width).toBeGreaterThanOrEqual(340);
      // together they fill the row (no empty third column)
      const rowRight = Math.max(cb.x + cb.width, ab.x + ab.width);
      const wrapper = await corr.locator("xpath=..").boundingBox();
      expect(rowRight).toBeGreaterThanOrEqual(wrapper.x + wrapper.width - 2);

      await expectHeatmapFullyVisible(corr);
      expect(await mainOverflow(page)).toBe(0);
    });
  }

  test("stacks the cards and stays inside the window at 360px", async ({ page }) => {
    await resize(page, 360);
    await runDeepDive(page);
    const corr = page.locator(".glass-card", { has: page.getByRole("heading", { name: "Correlation Matrix" }) });
    const anom = page.locator(".glass-card", { has: page.getByRole("heading", { name: "Anomaly Detection" }) });
    const cb = await corr.boundingBox();
    const ab = await anom.boundingBox();
    // one column: the Anomaly card is below the Correlation card
    expect(ab.y).toBeGreaterThan(cb.y + cb.height - 1);
    expect(cb.x + cb.width).toBeLessThanOrEqual(360);
    expect(ab.x + ab.width).toBeLessThanOrEqual(360);
    // the card is only 264px wide inside its padding: the 280px heatmap
    // has to scale down rather than lose its last column
    await expectHeatmapFullyVisible(corr);
    expect(await mainOverflow(page)).toBe(0);
  });
});
