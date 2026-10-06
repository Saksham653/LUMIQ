// The Forecast overlay's narrative call and state. The forecast
// object comes from engine/forecast.js (holdout-checked); irregular
// data gets the honest warning and no AI call at all.

import { useRef, useState } from "react";
import { callGroq } from "../ai/client.js";
import { fmtNum, fitLabel } from "../lib/format.js";

export function useForecast({ apiKey }) {
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [forecastNarrative, setForecastNarrative] = useState("");
  const [forecastLoading, setForecastLoading] = useState(false);
  const forecastAbortRef = useRef(null);

  const runForecast = async (metricName, fc) => {
    forecastAbortRef.current?.abort();
    const controller = new AbortController();
    forecastAbortRef.current = controller;
    setForecastLoading(true);
    setForecastNarrative("");
    if (!fc?.ok) {
      setForecastNarrative(fc?.reason || "Forecast is not available for this data.");
      setForecastLoading(false);
      return;
    }
    if (fc.tooIrregular) {
      // No projection and no AI narrative — saying so IS the feature.
      setForecastNarrative(`This data is too irregular for a reliable forecast. Forecasting the last ${fc.holdoutPoints} real points from the earlier ones was off by about ${fc.errorPct}%.`);
      setForecastLoading(false);
      return;
    }
    if (!apiKey || apiKey === "demo") {
      setForecastNarrative(`📊 Trend Analysis: The metric "${metricName}" shows a ${fc.slope > 0 ? "positive" : "negative"} trend with a slope of ${fc.slope.toFixed(2)} per period. Fit: ${fitLabel(fc.r2)}. Checked on the last ${fc.holdoutPoints} points: off by about ${fc.errorPct}%. Forecast: next 5 values projected at ${fc.forecast.map(f => fmtNum(f)).join(", ")}. Connect a Groq API key for deeper AI analysis.`);
      setForecastLoading(false);
      return;
    }
    try {
      const prompt = `You are a data forecasting analyst. Analyze this trend:
Metric: ${metricName}
Linear Regression: slope=${fc.slope.toFixed(4)}, intercept=${fc.intercept.toFixed(2)}
Fit of the trendline: ${fitLabel(fc.r2)} (say it in these plain words; never quote an R² value)
Honesty check: forecasting the last ${fc.holdoutPoints} real points from the earlier ones was off by about ${fc.errorPct}% — state this plainly so the reader knows how much to trust the projection.
Next 5 forecasted values: ${fc.forecast.map(f => f.toFixed(2)).join(", ")}

Write a concise 3-4 sentence forecast narrative. Include: trend direction and strength, the honesty-check error in percent, specific predicted values, and one business recommendation. Be direct and use actual numbers.`;

      await callGroq(apiKey, [{ role: "user", content: prompt }], (text) => {
        setForecastNarrative(text);
      }, { signal: controller.signal });
    } catch (e) {
      if (forecastAbortRef.current === controller && !e.aborted) {
        setForecastNarrative("Could not generate the forecast narrative: " + e.message + " Toggle Forecast off and on to retry.");
      }
    }
    if (forecastAbortRef.current === controller) setForecastLoading(false);
  };

  return {
    forecastEnabled,
    setForecastEnabled,
    forecastNarrative,
    setForecastNarrative,
    forecastLoading,
    runForecast,
    forecastAbortRef,
  };
}
