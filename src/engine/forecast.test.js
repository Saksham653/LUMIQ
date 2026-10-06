import { describe, it, expect } from "vitest";
import { buildForecast, FORECAST_MIN_POINTS, FORECAST_MAX_ERROR_PCT } from "./forecast.js";

const line = (n, slope = 10, start = 100) => Array.from({ length: n }, (_, i) => start + slope * i);

describe("buildForecast (F12)", () => {
  it("needs at least 8 points, with the reason spelled out", () => {
    expect(FORECAST_MIN_POINTS).toBe(8);
    const r = buildForecast(line(7));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("8 time points");
    expect(buildForecast(line(8)).ok).toBe(true);
  });

  it("a known straight line gives near-zero holdout error and a near-zero band", () => {
    const r = buildForecast(line(12)); // 100,110,...,210
    expect(r.ok).toBe(true);
    expect(r.tooIrregular).toBe(false);
    expect(r.errorPct).toBeLessThan(0.1);
    expect(r.forecast[0]).toBeCloseTo(220, 6);
    expect(r.forecast[4]).toBeCloseTo(260, 6);
    for (const c of r.confidence) expect(c).toBeLessThan(0.001);
  });

  it("a noisy series widens the band with distance", () => {
    const noisy = line(12).map((v, i) => v + (i % 2 === 0 ? 15 : -15));
    const r = buildForecast(noisy);
    expect(r.ok).toBe(true);
    expect(r.confidence[0]).toBeGreaterThan(0);
    expect(r.confidence[4]).toBeGreaterThan(r.confidence[0]);
    // sqrt growth: last step ≈ sqrt(5) × first step
    expect(r.confidence[4] / r.confidence[0]).toBeCloseTo(Math.sqrt(5), 5);
  });

  it("an irregular series triggers the warning instead of a projection", () => {
    // collapses at the end — the holdout check must catch it
    const irregular = [100, 110, 120, 130, 140, 150, 160, 170, 20, 300, 10];
    const r = buildForecast(irregular);
    expect(r.ok).toBe(true);
    expect(r.errorPct).toBeGreaterThan(FORECAST_MAX_ERROR_PCT);
    expect(r.tooIrregular).toBe(true);
  });

  it("the holdout error matches a hand calculation", () => {
    // train = [0,10,20,30,40,50,60,70] → fit y = 10x exactly;
    // held-out actuals 80,90,1000 → predictions 80,90,100
    const values = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 1000];
    const r = buildForecast(values);
    // errors: 0%, 0%, |100-1000|/1000 = 90% → mean 30% → not above 30
    expect(r.errorPct).toBeCloseTo(30, 1);
    expect(r.tooIrregular).toBe(false);
  });
});
