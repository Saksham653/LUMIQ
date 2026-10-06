// Chart and profile maths moved verbatim out of App.jsx: bucket
// downsampling, Pearson correlation, z-score anomalies, the linear
// regression behind Forecast, and the Column details profiler.

import { numericValues, median } from "./stats.js";
import { NUMERIC_TYPES } from "../data/columnTypes.js";

// Smart downsampling: bucket N data points into maxBuckets averaged bins
export function downsample(values, maxBuckets = 60) {
  if (values.length <= maxBuckets) return values;
  const bucketSize = values.length / maxBuckets;
  const result = [];
  for (let i = 0; i < maxBuckets; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const slice = values.slice(start, end);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

// Math utils for Data health
export function calcPearsonCorrelation(x, y) {
  let n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i]; sumY += y[i]; sumXY += x[i] * y[i]; sumX2 += x[i] * x[i]; sumY2 += y[i] * y[i];
  }
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function getAnomalies(vals, threshold = 2.5) {
  const n = vals.length;
  if (n === 0) return { mean: 0, stdDev: 0, anomalies: [] };
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const anomalies = [];
  vals.forEach((v, i) => {
    const zScore = stdDev === 0 ? 0 : Math.abs(v - mean) / stdDev;
    if (zScore > threshold) anomalies.push({ index: i, value: v, zScore });
  });
  return { mean, stdDev, anomalies };
}

// Linear regression for the Forecast overlay
export function calcLinearRegression(vals) {
  const n = vals.length;
  if (n < 2) return { slope: 0, intercept: vals[0] || 0, r2: 0, forecast: [], confidence: [] };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += vals[i]; sumXY += i * vals[i]; sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTot += Math.pow(vals[i] - yMean, 2);
    ssRes += Math.pow(vals[i] - predicted, 2);
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Std deviation of residuals for confidence band
  const residualStd = Math.sqrt(ssRes / Math.max(n - 2, 1));

  // Generate 5 forecast points
  const forecastSteps = 5;
  const forecast = [];
  const confidence = [];
  for (let i = 0; i < forecastSteps; i++) {
    const idx = n + i;
    const predicted = slope * idx + intercept;
    forecast.push(predicted);
    confidence.push(residualStd * 1.5);
  }

  return { slope, intercept, r2, forecast, confidence, residualStd };
}

// Column profiler for Column details
export function profileColumn(data, colName, typeInfo) {
  const values = data.map(r => r[colName]);
  const total = values.length;
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== "").length;
  const completeness = total > 0 ? (nonNull / total) * 100 : 0;
  const uniqueVals = new Set(values.filter(v => v !== null && v !== undefined && v !== ""));
  const uniqueCount = uniqueVals.size;

  // Type comes from the shared all-rows detection; fall back to a
  // value sniff only when no columnTypes map is available.
  const isNumeric = typeInfo
    ? NUMERIC_TYPES.includes(typeInfo.type)
    : typeof values.find(v => v !== null && v !== undefined && v !== "") === "number";

  const profile = {
    name: colName,
    type: isNumeric ? "Numeric" : "Categorical",
    total,
    nonNull,
    completeness: completeness.toFixed(1),
    uniqueCount,
  };

  if (isNumeric) {
    // Blank cells are excluded from every statistic; a column with no
    // numeric values gets null stats (shown as "—"), never fake zeros.
    const nums = numericValues(values);
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    profile.min = sorted[0] ?? null;
    profile.max = sorted[sorted.length - 1] ?? null;
    profile.mean = nums.length > 0 ? sum / nums.length : null;
    profile.median = median(nums);
    profile.stdDev = nums.length > 1 ? Math.sqrt(nums.reduce((a, v) => a + Math.pow(v - profile.mean, 2), 0) / (nums.length - 1)) : null;

    // Histogram (10 bins)
    if (nums.length > 0) {
      const range = profile.max - profile.min || 1;
      const binCount = Math.min(10, uniqueCount);
      const bins = Array(binCount).fill(0);
      nums.forEach(v => {
        let idx = Math.floor(((v - profile.min) / range) * (binCount - 1));
        if (idx < 0) idx = 0;
        if (idx >= binCount) idx = binCount - 1;
        bins[idx]++;
      });
      profile.histogram = bins;
    } else {
      profile.histogram = [];
    }
  } else {
    // Top 3 frequent values
    const freq = {};
    values.forEach(v => { const key = String(v); freq[key] = (freq[key] || 0) + 1; });
    profile.topValues = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([val, count]) => ({ val, count, pct: ((count / total) * 100).toFixed(1) }));
    profile.histogram = profile.topValues.map(t => t.count);
  }


  return profile;
}
