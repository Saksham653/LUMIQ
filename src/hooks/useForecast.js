// The Forecast overlay's narrative call and state. Moved verbatim
// from App.jsx; the abort ref lets the toggle cancel a narrative in
// flight.

import { useRef, useState } from "react";
import { callGroq } from "../ai/client.js";
import { fmtNum } from "../lib/format.js";

export function useForecast({ apiKey }) {
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [forecastNarrative, setForecastNarrative] = useState("");
  const [forecastLoading, setForecastLoading] = useState(false);
  const forecastAbortRef = useRef(null);

  const runForecast = async (metricName, regression) => {
    forecastAbortRef.current?.abort();
    const controller = new AbortController();
    forecastAbortRef.current = controller;
    setForecastLoading(true);
    setForecastNarrative("");
    if (!apiKey || apiKey === "demo") {
      setForecastNarrative(`📊 Trend Analysis: The metric "${metricName}" shows a ${regression.slope > 0 ? "positive" : "negative"} trend with a slope of ${regression.slope.toFixed(2)} per period. R² = ${regression.r2.toFixed(3)} (${regression.r2 > 0.7 ? "strong" : regression.r2 > 0.4 ? "moderate" : "weak"} fit). Forecast: next 5 values projected at ${regression.forecast.map(f => fmtNum(f)).join(", ")}. Connect a Groq API key for deeper AI analysis.`);
      setForecastLoading(false);
      return;
    }
    try {
      const prompt = `You are a data forecasting analyst. Analyze this trend:
Metric: ${metricName}
Linear Regression: slope=${regression.slope.toFixed(4)}, intercept=${regression.intercept.toFixed(2)}, R²=${regression.r2.toFixed(4)}
Residual Std Dev: ${regression.residualStd.toFixed(2)}
Next 5 forecasted values: ${regression.forecast.map(f => f.toFixed(2)).join(", ")}

Write a concise 3-4 sentence forecast narrative. Include: trend direction and strength, confidence level based on R², specific predicted values, and one business recommendation. Be direct and use actual numbers.`;

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
