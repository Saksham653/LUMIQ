// Layout regressions found while photographing the live app. Each
// check measures the real production build in Chromium, because jsdom
// has no layout engine and cannot see any of these bugs.
//
//  1. Overview overflowed sideways between ~901px and ~1090px: the
//     chart header's minimum width pushed the "chart | Auto Insights"
//     grid past the right edge of <main>.

import { test, expect } from "@playwright/test";
import { enterDemo } from "./helpers.js";

// Pixels <main> would have to scroll sideways. 0 means nothing sticks out.
const mainOverflow = (page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    return main.scrollWidth - main.clientWidth;
  });

const resize = (page, width) => page.setViewportSize({ width, height: 900 });

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
});
