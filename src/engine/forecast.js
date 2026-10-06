// Honest forecast (F12). Before projecting anything, the forecast
// checks itself: it holds out the last 3 real points, forecasts them
// from the earlier points alone, and reports how far off it was in
// plain percent. Data where that error passes 30% gets a warning
// instead of a projection. The confidence band is based on the
// spread of those real errors and widens with distance from the
// last real point — never a fixed width.

import { calcLinearRegression } from "../lib/analysis.js";

export const FORECAST_MIN_POINTS = 8;
export const FORECAST_HOLDOUT = 3;
export const FORECAST_MAX_ERROR_PCT = 30;
const FORECAST_STEPS = 5;

export function buildForecast(values) {
  if (!Array.isArray(values) || values.length < FORECAST_MIN_POINTS) {
    return { ok: false, reason: `Forecast needs at least ${FORECAST_MIN_POINTS} time points.` };
  }

  // Self-check: fit without the last 3 points and forecast them.
  const train = values.slice(0, values.length - FORECAST_HOLDOUT);
  const held = values.slice(-FORECAST_HOLDOUT);
  const trialFit = calcLinearRegression(train);
  const holdout = held.map((actual, i) => {
    const predicted = trialFit.slope * (train.length + i) + trialFit.intercept;
    return { actual, predicted, absError: Math.abs(predicted - actual) };
  });
  const pctErrors = holdout.map((h) =>
    h.actual !== 0 ? h.absError / Math.abs(h.actual) : (h.predicted === 0 ? 0 : 1)
  );
  const errorPct = Math.round((pctErrors.reduce((a, b) => a + b, 0) / pctErrors.length) * 1000) / 10;
  const tooIrregular = errorPct > FORECAST_MAX_ERROR_PCT;

  // The projection itself uses every point; the band grows with the
  // square root of the distance, scaled by the real holdout error.
  const fit = calcLinearRegression(values);
  const rmse = Math.sqrt(holdout.reduce((a, h) => a + h.absError * h.absError, 0) / holdout.length);
  const n = values.length;
  const forecast = [];
  const confidence = [];
  for (let i = 0; i < FORECAST_STEPS; i++) {
    forecast.push(fit.slope * (n + i) + fit.intercept);
    confidence.push(rmse * Math.sqrt(i + 1));
  }

  return {
    ok: true,
    tooIrregular,
    errorPct,
    holdoutPoints: FORECAST_HOLDOUT,
    slope: fit.slope,
    intercept: fit.intercept,
    r2: fit.r2,
    residualStd: fit.residualStd,
    forecast,
    confidence,
  };
}
