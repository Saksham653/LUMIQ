import { useState, useEffect, useRef, useMemo } from "react";

// ============================================================
// LUMIQ — Luminous Intelligence Queries (Groq Edition)
// ============================================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function callGroq(apiKey, messages, onStream) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Groq API error");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") break;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content || "";
        fullText += delta;
        onStream?.(fullText, delta);
      } catch { }
    }
  }
  return fullText;
}

// ─── Sample Datasets ────────────────────────────────────────
const SAMPLE_DATASETS = {
  sales: {
    name: "E-Commerce Sales",
    icon: "🛒",
    description: "12 months of online sales data",
    columns: ["month", "revenue", "orders", "avg_order_value", "region", "category", "returns", "profit_margin"],
    data: [
      { month: "Jan", revenue: 245000, orders: 1820, avg_order_value: 134.6, region: "North", category: "Electronics", returns: 4.2, profit_margin: 23.1 },
      { month: "Feb", revenue: 198000, orders: 1540, avg_order_value: 128.6, region: "South", category: "Clothing", returns: 6.8, profit_margin: 31.2 },
      { month: "Mar", revenue: 312000, orders: 2210, avg_order_value: 141.2, region: "East", category: "Electronics", returns: 3.9, profit_margin: 22.7 },
      { month: "Apr", revenue: 289000, orders: 2050, avg_order_value: 140.9, region: "West", category: "Home", returns: 5.1, profit_margin: 28.4 },
      { month: "May", revenue: 334000, orders: 2380, avg_order_value: 140.3, region: "North", category: "Clothing", returns: 7.2, profit_margin: 29.8 },
      { month: "Jun", revenue: 378000, orders: 2720, avg_order_value: 138.9, region: "East", category: "Electronics", returns: 4.4, profit_margin: 21.9 },
      { month: "Jul", revenue: 421000, orders: 3010, avg_order_value: 139.9, region: "South", category: "Electronics", returns: 3.7, profit_margin: 20.8 },
      { month: "Aug", revenue: 398000, orders: 2890, avg_order_value: 137.7, region: "West", category: "Home", returns: 5.8, profit_margin: 27.3 },
      { month: "Sep", revenue: 356000, orders: 2540, avg_order_value: 140.2, region: "North", category: "Clothing", returns: 6.3, profit_margin: 30.5 },
      { month: "Oct", revenue: 445000, orders: 3210, avg_order_value: 138.6, region: "East", category: "Electronics", returns: 4.1, profit_margin: 22.4 },
      { month: "Nov", revenue: 589000, orders: 4320, avg_order_value: 136.3, region: "West", category: "Electronics", returns: 5.2, profit_margin: 19.7 },
      { month: "Dec", revenue: 712000, orders: 5180, avg_order_value: 137.4, region: "South", category: "Clothing", returns: 8.9, profit_margin: 26.1 },
    ],
  },
  marketing: {
    name: "Marketing Campaign",
    icon: "📊",
    description: "Multi-channel campaign performance",
    columns: ["channel", "spend", "impressions", "clicks", "conversions", "cac", "roas", "week"],
    data: [
      { channel: "Google Ads", spend: 45000, impressions: 2100000, clicks: 42000, conversions: 1260, cac: 35.7, roas: 4.2, week: "W1" },
      { channel: "Meta Ads", spend: 38000, impressions: 3400000, clicks: 51000, conversions: 918, cac: 41.4, roas: 3.6, week: "W1" },
      { channel: "Email", spend: 8000, impressions: 890000, clicks: 71200, conversions: 2136, cac: 3.7, roas: 12.8, week: "W1" },
      { channel: "SEO", spend: 12000, impressions: 560000, clicks: 28000, conversions: 840, cac: 14.3, roas: 8.4, week: "W1" },
      { channel: "Google Ads", spend: 52000, impressions: 2380000, clicks: 47600, conversions: 1428, cac: 36.4, roas: 4.1, week: "W2" },
      { channel: "Meta Ads", spend: 41000, impressions: 3700000, clicks: 55500, conversions: 999, cac: 41.0, roas: 3.7, week: "W2" },
      { channel: "Email", spend: 8000, impressions: 950000, clicks: 76000, conversions: 2280, cac: 3.5, roas: 13.2, week: "W2" },
      { channel: "SEO", spend: 12000, impressions: 610000, clicks: 30500, conversions: 915, cac: 13.1, roas: 9.1, week: "W2" },
    ],
  },
  churn: {
    name: "Customer Churn",
    icon: "👥",
    description: "SaaS customer retention analysis",
    columns: ["cohort", "customers", "churned", "churn_rate", "ltv", "mrr", "support_tickets", "nps"],
    data: [
      { cohort: "2024-Q1", customers: 1240, churned: 87, churn_rate: 7.0, ltv: 2840, mrr: 186000, support_tickets: 3.2, nps: 42 },
      { cohort: "2024-Q2", customers: 1580, churned: 95, churn_rate: 6.0, ltv: 3120, mrr: 237000, support_tickets: 2.8, nps: 48 },
      { cohort: "2024-Q3", customers: 1920, churned: 115, churn_rate: 5.9, ltv: 3450, mrr: 288000, support_tickets: 2.5, nps: 54 },
      { cohort: "2024-Q4", customers: 2340, churned: 140, churn_rate: 5.9, ltv: 3780, mrr: 351000, support_tickets: 2.1, nps: 61 },
      { cohort: "2025-Q1", customers: 2890, churned: 130, churn_rate: 4.5, ltv: 4210, mrr: 433500, support_tickets: 1.9, nps: 67 },
    ],
  },
};

function generateAutoInsights(dataset) {
  const data = dataset.data;
  const insights = [];
  const numericCols = dataset.columns.filter((c) => typeof data[0][c] === "number");
  numericCols.forEach((col) => {
    const vals = data.map((d) => d[col]);
    let max = -Infinity, min = Infinity;
    for (const v of vals) { if (v > max) max = v; if (v < min) min = v; }
    // Compare first 10% vs last 10% for trend detection (more robust for large datasets)
    const headSize = Math.max(1, Math.floor(vals.length * 0.1));
    const tailSize = Math.max(1, Math.floor(vals.length * 0.1));
    const headAvg = vals.slice(0, headSize).reduce((a, b) => a + b, 0) / headSize;
    const tailAvg = vals.slice(-tailSize).reduce((a, b) => a + b, 0) / tailSize;
    const change = headAvg !== 0 ? ((tailAvg - headAvg) / Math.abs(headAvg)) * 100 : 0;
    if (Math.abs(change) > 20) {
      insights.push({
        type: change > 0 ? "trend_up" : "trend_down",
        title: `${col} ${change > 0 ? "surged" : "dropped"} ${Math.abs(change).toFixed(1)}%`,
        description: `From ${min.toLocaleString()} to ${max.toLocaleString()} — a significant ${change > 0 ? "growth" : "decline"} trend.`,
        metric: col,
        value: change.toFixed(1),
        severity: Math.abs(change) > 50 ? "high" : "medium",
      });
    }
  });
  return insights.slice(0, 4);
}


// Smart downsampling: bucket N data points into maxBuckets averaged bins
function downsample(values, maxBuckets = 60) {
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

// Format numbers for axis labels
function fmtNum(v) {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

// Math utils for AI Lab
function calcPearsonCorrelation(x, y) {
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

function getAnomalies(vals, threshold = 2.5) {
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

// Linear regression for Crystal Ball Forecasting
function calcLinearRegression(vals) {
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

// Column profiler for Data DNA
function profileColumn(data, colName) {
  const values = data.map(r => r[colName]);
  const total = values.length;
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== "").length;
  const completeness = total > 0 ? (nonNull / total) * 100 : 0;
  const uniqueVals = new Set(values.filter(v => v !== null && v !== undefined && v !== ""));
  const uniqueCount = uniqueVals.size;

  // Detect type
  const sampleNonNull = values.find(v => v !== null && v !== undefined && v !== "");
  const isNumeric = typeof sampleNonNull === "number";

  const profile = {
    name: colName,
    type: isNumeric ? "Numeric" : "Categorical",
    total,
    nonNull,
    completeness: completeness.toFixed(1),
    uniqueCount,
  };

  if (isNumeric) {
    const nums = values.filter(v => typeof v === "number" && !isNaN(v));
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    profile.min = sorted[0] ?? 0;
    profile.max = sorted[sorted.length - 1] ?? 0;
    profile.mean = nums.length > 0 ? sum / nums.length : 0;
    profile.median = nums.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    profile.stdDev = nums.length > 1 ? Math.sqrt(nums.reduce((a, v) => a + Math.pow(v - profile.mean, 2), 0) / (nums.length - 1)) : 0;

    // Histogram (10 bins)
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
    // Top 3 frequent values
    const freq = {};
    values.forEach(v => { const key = String(v); freq[key] = (freq[key] || 0) + 1; });
    profile.topValues = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([val, count]) => ({ val, count, pct: ((count / total) * 100).toFixed(1) }));
    profile.histogram = profile.topValues.map(t => t.count);
  }

  // Data Quality Score (0-100)
  let quality = 0;
  quality += completeness * 0.4; // 40% weight on completeness
  quality += Math.min(uniqueCount / total, 1) * 30; // 30% weight on variety (capped)
  quality += (nonNull > 0 ? 30 : 0); // 30% for having data at all
  profile.qualityScore = Math.min(100, Math.round(quality));

  return profile;
}

function MiniBarChart({ data, xKey, yKey, color = "#00D4FF" }) {
  const raw = data.map((d) => d[yKey] || 0);
  const vals = downsample(raw, 24);
  const max = Math.max(...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "60px", padding: "4px 0" }}>
      {vals.map((v, i) => {
        const h = ((v - min) / range) * 52;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "52px" }}>
            <div style={{ width: "100%", height: `${Math.max(h, 1)}px`, background: `linear-gradient(to top, ${color}88, ${color})`, borderRadius: "2px 2px 0 0", transition: "height 0.3s ease" }} />
          </div>
        );
      })}
    </div>
  );
}

function MiniLineChart({ data, yKey, color = "#FFB627" }) {
  const raw = data.map((d) => d[yKey] || 0);
  const vals = downsample(raw, 40);
  const max = Math.max(...vals); const min = Math.min(...vals); const range = max - min || 1;
  const w = 200; const h = 60;
  const points = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * w},${h - ((v - min) / range) * (h - 12) - 6}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "60px" }}>
      <defs>
        <linearGradient id={`mini-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={areaPoints} fill={`url(#mini-grad-${color.replace('#', '')})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 28; const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1a2244" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{(pct * 100).toFixed(0)}%</text>
      </svg>
      <span style={{ fontSize: "10px", color: "#8892b0", textAlign: "center" }}>{label}</span>
    </div>
  );
}


function HeatmapChart({ matrix, columns }) {
  const n = columns.length;
  // Dynamic sizing based on number of columns
  const cellSize = Math.max(20, Math.min(40, 300 / n));
  const w = n * cellSize;
  const h = n * cellSize;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={w + 80} height={h + 80}>
        <g transform={`translate(80, 20)`}>
          {matrix.map((row, i) =>
            row.map((val, j) => {
              // Color mapping: Negative = Orange/Red, Positive = Cyan/Blue, 0 = Dark
              const intensity = Math.abs(val);
              const color = val > 0 ? `rgba(0, 212, 255, ${intensity})` : `rgba(255, 60, 60, ${intensity})`;
              return (
                <g key={`${i}-${j}`}>
                  <rect x={j * cellSize} y={i * cellSize} width={cellSize - 1} height={cellSize - 1} fill={color} stroke="#1e2d5c" strokeWidth="0.5" />
                  {n <= 8 && <text x={j * cellSize + cellSize / 2} y={i * cellSize + cellSize / 2 + 3} textAnchor="middle" fill={intensity > 0.5 ? "#000" : "#8892b0"} fontSize={cellSize * 0.3} fontFamily="DM Mono">{val.toFixed(2)}</text>}
                </g>
              );
            })
          )}
          {/* Labels */}
          {columns.map((c, i) => (
            <text key={`lx-${i}`} x={i * cellSize + cellSize / 2} y={h + 12} textAnchor="end" transform={`rotate(-45 ${i * cellSize + cellSize / 2} ${h + 12})`} fill="#8892b0" fontSize="10">{c.length > 10 ? c.slice(0, 8) + '..' : c}</text>
          ))}
          {columns.map((c, i) => (
            <text key={`ly-${i}`} x={-8} y={i * cellSize + cellSize / 2 + 3} textAnchor="end" fill="#8892b0" fontSize="10">{c.length > 10 ? c.slice(0, 8) + '..' : c}</text>
          ))}
        </g>
      </svg>
    </div>
  );
}

function AnomalyScatterChart({ data, metric, anomalies }) {
  const rawVals = data.map((d) => d[metric] || 0);
  const maxV = Math.max(...rawVals); const minV = Math.min(...rawVals); const range = maxV - minV || 1;
  const w = 400; const h = 200;
  const padL = 40; const padT = 20; const padB = 30; const padR = 20;
  const chartW = w - padL - padR; const chartH = h - padT - padB;

  // Create a fast lookup set for anomaly indices
  const anomalySet = new Set(anomalies.map(a => a.index));
  // Downsample normal points if dataset is huge, but ALWAYS draw anomalies precisely
  const drawPoints = [];
  const MAX_POINTS = 500;
  const step = Math.max(1, Math.floor(rawVals.length / MAX_POINTS));

  for (let i = 0; i < rawVals.length; i++) {
    const isAnomaly = anomalySet.has(i);
    if (isAnomaly || i % step === 0) {
      drawPoints.push({
        index: i,
        val: rawVals[i],
        isAnomaly
      });
    }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const yPos = padT + chartH * (1 - frac);
        const val = minV + range * frac;
        return (
          <g key={i}>
            <line x1={padL} y1={yPos} x2={w - padR} y2={yPos} stroke="#1e2d5c" strokeWidth="0.5" />
            <text x={padL - 4} y={yPos + 3} textAnchor="end" fill="#3d4f7c" fontSize="10" fontFamily="DM Mono">{fmtNum(val)}</text>
          </g>
        );
      })}
      {/* Points */}
      {drawPoints.map((pt, i) => {
        const px = padL + (pt.index / Math.max(rawVals.length - 1, 1)) * chartW;
        const py = padT + chartH - ((pt.val - minV) / range) * chartH;
        return (
          <circle key={i} cx={px} cy={py} r={pt.isAnomaly ? 4 : Math.max(1.5, 300 / drawPoints.length)}
            fill={pt.isAnomaly ? "#FF3C3C" : "#00D4FF"}
            opacity={pt.isAnomaly ? 0.9 : 0.4}
            stroke={pt.isAnomaly ? "#FF8888" : "none"} />
        );
      })}
    </svg>
  );
}


export default function LumiqApp() {
  const [page, setPage] = useState(import.meta.env.VITE_GROQ_API_KEY ? "app" : "landing");
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GROQ_API_KEY || "");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [activeDataset, setActiveDataset] = useState(null);
  const [activeTab, setActiveTab] = useState("canvas");
  const [oracleMessages, setOracleMessages] = useState([]);
  const [oracleInput, setOracleInput] = useState("");
  const [oracleLoading, setOracleLoading] = useState(false);
  const [narrativeText, setNarrativeText] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioInput, setScenarioInput] = useState("");
  const [labAnalysis, setLabAnalysis] = useState(null);
  const [labLoading, setLabLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const [uploadedData, setUploadedData] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [oracleMessages]);
  // Reset lab analysis when dataset changes
  useEffect(() => {
    if (activeDataset) {
      setInsights(generateAutoInsights(activeDataset));
      setLabAnalysis(null);
    }
  }, [activeDataset]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #050914; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0a0f2c; }
    ::-webkit-scrollbar-thumb { background: #1e2d5c; border-radius: 2px; }
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    @keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes beam { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    .lumiq-app { min-height: 100vh; background: #050914; color: #e2e8f0; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
    .btn-primary { background: linear-gradient(135deg, #00D4FF, #0099bb); color: #050914; border: none; padding: 12px 28px; border-radius: 8px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px #00D4FF44; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-ghost { background: transparent; color: #8892b0; border: 1px solid #1e2d5c; padding: 10px 20px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; }
    .btn-ghost:hover { border-color: #00D4FF55; color: #00D4FF; background: #00D4FF0A; }
    .glass-card { background: linear-gradient(135deg, #0d1b3e15, #0a0f2c10); border: 1px solid #1e2d5c; border-radius: 16px; backdrop-filter: blur(20px); }
    .insight-card { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 12px; padding: 16px; transition: all 0.2s; animation: fadeSlide 0.4s ease both; }
    .insight-card:hover { border-color: #00D4FF44; transform: translateY(-2px); }
    .tab-btn { background: transparent; border: none; padding: 10px 20px; color: #8892b0; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab-btn.active { color: #00D4FF; border-bottom-color: #00D4FF; }
    .tab-btn:hover:not(.active) { color: #ccd6f6; }
    .oracle-input { width: 100%; background: #0a1128; border: 1px solid #1e2d5c; border-radius: 12px; padding: 14px 18px; color: #e2e8f0; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; resize: none; transition: border-color 0.2s; }
    .oracle-input:focus { border-color: #00D4FF55; }
    .oracle-input::placeholder { color: #3d4f7c; }
    .chat-bubble-user { background: linear-gradient(135deg, #00D4FF1a, #00D4FF0d); border: 1px solid #00D4FF33; border-radius: 16px 16px 4px 16px; padding: 12px 16px; font-size: 14px; color: #ccd6f6; max-width: 80%; margin-left: auto; }
    .chat-bubble-oracle { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 4px 16px 16px 16px; padding: 12px 16px; font-size: 14px; color: #e2e8f0; max-width: 85%; line-height: 1.6; }
    .streaming-cursor::after { content: '▋'; animation: blink 0.8s infinite; color: #00D4FF; }
    .stat-number { font-family: 'DM Mono', monospace; font-size: 28px; font-weight: 500; background: linear-gradient(135deg, #ffffff, #a8b4d8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .prism-logo { animation: float 4s ease-in-out infinite; }
    .data-pill { display: inline-flex; align-items: center; gap: 6px; background: #0d1b3e; border: 1px solid #1e2d5c; border-radius: 20px; padding: 4px 12px; font-family: 'DM Mono', monospace; font-size: 11px; color: #8892b0; }
    .metric-card { background: linear-gradient(135deg, #0d1b3e, #0a1128); border: 1px solid #1e2d5c; border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
    .metric-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
    .metric-card.cyan::before { background: linear-gradient(90deg, transparent, #00D4FF, transparent); }
    .metric-card.gold::before { background: linear-gradient(90deg, transparent, #FFB627, transparent); }
    .metric-card.violet::before { background: linear-gradient(90deg, transparent, #7B4FE8, transparent); }
    .metric-card.green::before { background: linear-gradient(90deg, transparent, #00E5A0, transparent); }
    .scenario-card { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 12px; padding: 18px; margin-top: 12px; animation: fadeSlide 0.3s ease; }
    .grid-bg { background-image: linear-gradient(rgba(30,45,92,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,45,92,0.3) 1px, transparent 1px); background-size: 40px 40px; }
    .landing-hero { background: radial-gradient(ellipse 80% 60% at 50% -20%, #00D4FF15 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 100%, #7B4FE810 0%, transparent 60%); }
    .feature-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .narrative-box { background: #0a1128; border: 1px solid #1e2d5c; border-left: 3px solid #FFB627; border-radius: 0 12px 12px 0; padding: 20px; font-size: 14px; line-height: 1.8; color: #ccd6f6; white-space: pre-wrap; }
    .upload-zone { border: 2px dashed #1e2d5c; border-radius: 16px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
    .upload-zone:hover { border-color: #00D4FF55; background: #00D4FF08; }
    input[type="text"], input[type="password"] { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 8px; color: #e2e8f0; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 12px 16px; outline: none; transition: border-color 0.2s; }
    input[type="text"]:focus, input[type="password"]:focus { border-color: #00D4FF55; }
    input::placeholder { color: #3d4f7c; }
    select { background: #0a1128; border: 1px solid #1e2d5c; border-radius: 8px; color: #e2e8f0; font-family: 'DM Mono', monospace; font-size: 12px; padding: 8px 12px; outline: none; cursor: pointer; }
    .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; color: #8892b0; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 500; border: 1px solid transparent; }
    .sidebar-link:hover { color: #ccd6f6; background: #0d1b3e; }
    .sidebar-link.active { color: #00D4FF; background: #00D4FF0d; border-color: #00D4FF22; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; font-family: 'Syne', sans-serif; letter-spacing: 0.5px; }
    .badge-cyan { background: #00D4FF1a; color: #00D4FF; border: 1px solid #00D4FF33; }
    .badge-gold { background: #FFB6271a; color: #FFB627; border: 1px solid #FFB62733; }
    .badge-violet { background: #7B4FE81a; color: #7B4FE8; border: 1px solid #7B4FE833; }
    .badge-green { background: #00E5A01a; color: #00E5A0; border: 1px solid #00E5A033; }
    .mobile-menu-btn { display: none; background: none; border: 1px solid #1e2d5c; border-radius: 8px; color: #8892b0; font-size: 22px; padding: 6px 10px; cursor: pointer; z-index: 100; }
    .mobile-menu-btn:hover { color: #00D4FF; border-color: #00D4FF55; }
    .sidebar-overlay { display: none; }

    @media (max-width: 768px) {
      .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
      .app-sidebar { position: fixed !important; top: 0; left: 0; bottom: 0; width: 260px !important; z-index: 200; transform: translateX(-100%); transition: transform 0.3s ease; }
      .app-sidebar.open { transform: translateX(0); }
      .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 199; }
      .app-main { width: 100% !important; }
      .top-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 0 !important; }
      .top-tabs::-webkit-scrollbar { display: none; }
      .tab-btn { padding: 8px 12px; font-size: 11px; white-space: nowrap; flex-shrink: 0; }
      .stat-number { font-size: 20px; }
      .glass-card { border-radius: 12px; }
      .metric-card { padding: 14px; }
      .oracle-input { font-size: 13px; padding: 10px 14px; }
      .chat-bubble-user, .chat-bubble-oracle { max-width: 95%; font-size: 13px; }
      .narrative-box { font-size: 13px; padding: 14px; }
      .landing-hero nav { padding: 12px 16px; }
      .landing-hero h1 { letter-spacing: -1px; }
    }
  `;




  // AppShell logic moved outside


  return (
    <div className="lumiq-app">
      <style>{css}</style>
      {page === "landing" && <LandingPage setPage={setPage} />}
      {page === "setup" && (
        <ApiKeySetup
          setPage={setPage}
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          setApiKey={setApiKey}
        />
      )}
      {(page === "app" || (page !== "landing" && page !== "setup")) && (
        <AppShell
          apiKey={apiKey}
          setPage={setPage}
          activeDataset={activeDataset}
          setActiveDataset={setActiveDataset}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          oracleMessages={oracleMessages}
          setOracleMessages={setOracleMessages}
          oracleInput={oracleInput}
          setOracleInput={setOracleInput}
          oracleLoading={oracleLoading}
          setOracleLoading={setOracleLoading}
          narrativeText={narrativeText}
          setNarrativeText={setNarrativeText}
          narrativeLoading={narrativeLoading}
          setNarrativeLoading={setNarrativeLoading}
          scenarioLoading={scenarioLoading}
          setScenarioLoading={setScenarioLoading}
          scenarios={scenarios}
          setScenarios={setScenarios}
          scenarioInput={scenarioInput}
          setScenarioInput={setScenarioInput}
          labAnalysis={labAnalysis}
          setLabAnalysis={setLabAnalysis}
          labLoading={labLoading}
          setLabLoading={setLabLoading}
          insights={insights}
          uploadedData={uploadedData}
          setUploadedData={setUploadedData}
          uploadError={uploadError}
          setUploadError={setUploadError}
          chatEndRef={chatEndRef}
          fileInputRef={fileInputRef}
          callGroq={callGroq}
        />
      )}
    </div>
  );
}

// ─── Sub-Components (Moved outside to prevent focus loss) ──────────────────

function PrismLogo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="prism-face" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0055aa" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="prism-side" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7B4FE8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0a0f2c" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <polygon points="50,8 88,75 12,75" fill="url(#prism-face)" stroke="#00D4FF" strokeWidth="1.5" />
      <polygon points="50,8 88,75 50,85" fill="url(#prism-side)" stroke="#7B4FE8" strokeWidth="1" />
      <line x1="12" y1="75" x2="4" y2="62" stroke="#FFB627" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="12" y1="75" x2="3" y2="75" stroke="#00E5A0" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <line x1="12" y1="75" x2="4" y2="88" stroke="#7B4FE8" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <circle cx="50" cy="8" r="3" fill="#00D4FF" opacity="0.8" />
    </svg>
  );
}

const LandingPage = ({ setPage }) => (
  <div className="landing-hero" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{ position: "absolute", width: `${Math.random() * 3 + 1}px`, height: `${Math.random() * 3 + 1}px`, background: i % 3 === 0 ? "#00D4FF" : i % 3 === 1 ? "#FFB627" : "#7B4FE8", borderRadius: "50%", left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.4, animation: `beam ${2 + Math.random() * 3}s ${Math.random() * 2}s ease-in-out infinite` }} />
      ))}
    </div>
    <nav style={{ padding: "20px 60px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e2d5c22", position: "relative", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <PrismLogo size={36} />
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "22px", letterSpacing: "-0.5px" }}>LUM<span style={{ color: "#00D4FF" }}>IQ</span></span>
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <span className="badge badge-cyan">BETA</span>
        <button className="btn-ghost" onClick={() => setPage("setup")}>Get Started →</button>
      </div>
    </nav>
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 40px 60px", textAlign: "center", position: "relative", zIndex: 5 }}>
      <div className="prism-logo" style={{ margin: "0 auto 40px", display: "inline-block" }}><PrismLogo size={100} /></div>
      <div style={{ marginBottom: "16px" }}>
        <span className="badge badge-violet" style={{ fontSize: "11px" }}>⚡ Powered by Groq Ultra-Fast Inference · Llama 3 70B</span>
      </div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(48px, 7vw, 84px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-3px", marginBottom: "24px" }}>
        Data that<br />
        <span style={{ background: "linear-gradient(135deg, #00D4FF 0%, #7B4FE8 50%, #FFB627 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>talks back</span>
      </h1>
      <p style={{ fontSize: "18px", color: "#8892b0", lineHeight: 1.7, maxWidth: "600px", margin: "0 auto 40px", fontWeight: 300 }}>
        LUMIQ transforms raw data into living narratives. Not just charts — <strong style={{ color: "#ccd6f6" }}>decision intelligence</strong>. Ask in plain English. Get answers in milliseconds via Groq.
      </p>
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-primary" style={{ fontSize: "16px", padding: "14px 36px" }} onClick={() => setPage("setup")}>Launch LUMIQ</button>
        <button className="btn-ghost" style={{ padding: "14px 28px" }} onClick={() => setPage("app")}>Skip (no AI)</button>
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", padding: "0 40px 40px" }}>
      {[{ icon: "⬡", label: "Canvas Analytics" }, { icon: "🗣️", label: "Oracle AI Chat" }, { icon: "🔮", label: "Crystal Ball Forecast" }, { icon: "💬", label: "AI Data Filter" }, { icon: "🧬", label: "Data DNA Profiler" }, { icon: "🔬", label: "AI Lab" }, { icon: "🌐", label: "Scenario Forge" }, { icon: "🗃️", label: "Data Explorer" }].map((f) => (
        <div key={f.label} className="data-pill" style={{ padding: "8px 16px", fontSize: "13px" }}><span>{f.icon}</span><span style={{ color: "#ccd6f6" }}>{f.label}</span></div>
      ))}
    </div>
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
      {[
        { icon: "🔮", color: "#7B4FE8", badge: "badge-violet", title: "Crystal Ball Forecast", tag: "Predictive AI", desc: "Linear regression trendlines project future values with confidence bands. Groq explains what the numbers predict in plain English." },
        { icon: "🧬", color: "#00E5A0", badge: "badge-green", title: "Data DNA Profiler", tag: "Column X-Ray", desc: "Deep statistical profile of every column — type detection, completeness, min/max/mean/median, distribution histograms, and data quality scores." },
        { icon: "💬", color: "#00D4FF", badge: "badge-cyan", title: "AI Data Filter", tag: "Natural Language", desc: "Query your data in plain English. LUMIQ translates your questions into precise filters and updates the entire dashboard instantly." },
        { icon: "🔬", color: "#FF6B6B", badge: "badge-cyan", title: "AI Lab", tag: "Deep Analysis", desc: "Correlation heatmaps, Z-score anomaly detection, and AI-powered executive summaries of your statistical findings." },
        { icon: "⚡", color: "#FFB627", badge: "badge-gold", title: "Oracle AI", tag: "Groq-Powered", desc: "Sub-100ms conversational analysis via Groq. Ask anything about your data and get streaming real-time AI responses." },
        { icon: "🌐", color: "#7B4FE8", badge: "badge-violet", title: "Scenario Forge", tag: "What-If Engine", desc: "Simulate alternate scenarios by adjusting variables. Groq models probabilistic outcomes and visualizes the impact." },
        { icon: "🗃️", color: "#00D4FF", badge: "badge-cyan", title: "Interactive Explorer", tag: "50K+ Rows", desc: "Searchable, sortable, paginated data grid built to handle massive datasets without breaking a sweat." },
        { icon: "📄", color: "#00E5A0", badge: "badge-green", title: "AI Narrative", tag: "Auto Reports", desc: "One-click AI-generated executive reports that summarize key metrics, trends, and anomalies from your dataset." },
      ].map((f) => (
        <div key={f.title} className="glass-card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
            <div className="feature-icon" style={{ background: `${f.color}15`, border: `1px solid ${f.color}33` }}>{f.icon}</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px" }}>{f.title}</div>
              <span className={`badge ${f.badge}`}>{f.tag}</span>
            </div>
          </div>
          <p style={{ color: "#8892b0", fontSize: "13px", lineHeight: 1.7 }}>{f.desc}</p>
        </div>
      ))}
    </div>
    <div style={{ textAlign: "center", padding: "40px", borderTop: "1px solid #1e2d5c22" }}>
      <button className="btn-primary" style={{ fontSize: "15px", padding: "14px 40px" }} onClick={() => setPage("setup")}>Start Analyzing for Free →</button>
      <p style={{ marginTop: "12px", fontSize: "12px", color: "#3d4f7c" }}>Free Groq API key at console.groq.com · Llama 3 70B</p>
      <p style={{ marginTop: "24px", fontSize: "11px", color: "#56689d" }}>
        &copy; {new Date().getFullYear()} Saksham Srivastava<br />
        Email: sakshamsrivastava7000@gmail.com
      </p>
    </div>
  </div>
);

const ApiKeySetup = ({ setPage, apiKeyInput, setApiKeyInput, setApiKey }) => (
  <div style={{ maxWidth: "480px", margin: "0 auto", padding: "60px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: "40px" }}>
      <div className="prism-logo" style={{ marginBottom: "20px", display: "inline-block" }}><PrismLogo size={64} /></div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 800, marginBottom: "10px" }}>Connect <span style={{ color: "#00D4FF" }}>Oracle</span></h2>
      <p style={{ color: "#8892b0", fontSize: "14px", lineHeight: 1.6 }}>Enter your free Groq API key to power Oracle. Get one free at <span style={{ color: "#00D4FF" }}>console.groq.com</span></p>
    </div>
    <div className="glass-card" style={{ padding: "28px" }}>
      <label style={{ display: "block", fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Groq API Key</label>
      <input type="password" placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && apiKeyInput.trim()) { setApiKey(apiKeyInput.trim()); setPage("app"); } }}
        style={{ width: "100%", marginBottom: "16px" }} />
      <button className="btn-primary" style={{ width: "100%" }} onClick={() => { setApiKey(apiKeyInput.trim()); setPage("app"); }} disabled={!apiKeyInput.trim()}>Launch LUMIQ →</button>
      <button className="btn-ghost" style={{ width: "100%", marginTop: "10px" }} onClick={() => { setApiKey("demo"); setPage("app"); }}>Continue in Demo Mode</button>
    </div>
    <div style={{ marginTop: "20px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
      {["Free tier", "Sub-100ms inference", "Llama 3 70B", "Privacy-first"].map((t) => (<div key={t} className="data-pill">{t}</div>))}
    </div>
    <div style={{ marginTop: "16px", textAlign: "center" }}>
      <button onClick={() => setPage("landing")} style={{ background: "none", border: "none", color: "#3d4f7c", cursor: "pointer", fontSize: "12px" }}>← Back to home</button>
    </div>
  </div>
);

const AppShell = ({
  apiKey,
  setPage,
  activeDataset,
  setActiveDataset,
  activeTab,
  setActiveTab,
  oracleMessages,
  setOracleMessages,
  oracleInput,
  setOracleInput,
  oracleLoading,
  setOracleLoading,
  narrativeText,
  setNarrativeText,
  narrativeLoading,
  setNarrativeLoading,
  scenarioLoading,
  setScenarioLoading,
  scenarios,
  setScenarios,
  scenarioInput,
  setScenarioInput,
  labAnalysis,
  setLabAnalysis,
  labLoading,
  setLabLoading,
  insights,
  uploadedData,
  setUploadedData,
  uploadError,
  setUploadError,
  chatEndRef,
  fileInputRef,
  callGroq
}) => {
  const ds = activeDataset;
  const [selectedMetric, setSelectedMetric] = useState("");
  const [chartType, setChartType] = useState("bar");

  // Data Explorer State
  const [sortConfig, setSortConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageIdx, setPageIdx] = useState(0);
  const rowsPerPage = 10;

  // AI Data Querying State
  const [nlFilterQuery, setNlFilterQuery] = useState("");
  const [nlFilterLoading, setNlFilterLoading] = useState(false);
  const [nlFilterError, setNlFilterError] = useState("");
  const [activeNlFilter, setActiveNlFilter] = useState(null);

  // Crystal Ball Forecasting State
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [forecastNarrative, setForecastNarrative] = useState("");
  const [forecastLoading, setForecastLoading] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reset pagination/sort/filters when dataset changes
  useEffect(() => {
    setSortConfig(null);
    setSearchQuery("");
    setPageIdx(0);
    setNlFilterQuery("");
    setNlFilterError("");
    setActiveNlFilter(null);
    setForecastEnabled(false);
    setForecastNarrative("");
  }, [activeDataset]);

  const runForecast = async (metricName, regression) => {
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
      });
    } catch (e) {
      setForecastNarrative("Failed to generate forecast narrative: " + e.message);
    }
    setForecastLoading(false);
  };

  const applyNlFilter = async () => {
    if (!nlFilterQuery.trim() || nlFilterLoading) return;
    setNlFilterLoading(true);
    setNlFilterError("");

    if (!apiKey || apiKey === "demo") {
      setNlFilterError("AI Filtering requires a connected Groq API key.");
      setNlFilterLoading(false);
      return;
    }

    try {
      const prompt = `You are a strict data filtering assistant. I have a JSON array of objects with columns: ${ds.columns.join(', ')}.
The user wants to filter the data: "${nlFilterQuery}"

Write ONLY a JavaScript arrow function that takes a 'row' object and returns a boolean. 
DO NOT wrap it in markdown block quotes. DO NOT write any explanations. Just the literal code.
Ensure you convert strings to lowercase for case-insensitive matches if checking text.
Example 1: row => row.revenue > 1000 && row.region === 'West'
Example 2: row => String(row.status).toLowerCase() === 'active'`;

      let code = "";
      // callGroq takes a callback and streams text, accumulating into `code`
      await callGroq(apiKey, [{ role: "user", content: prompt }], (text) => {
        code = text;
      });

      code = code.replace(/```javascript/g, "").replace(/```js/g, "").replace(/```/g, "").trim();

      // Safely parse the arrow function
      const fn = new Function('return (' + code + ')')();

      setActiveNlFilter({ query: nlFilterQuery, fn, code });
      setPageIdx(0);
      setNlFilterQuery("");
    } catch (e) {
      setNlFilterError("Failed to interpret your query into a valid filter.");
      console.error("NL Filter Error:", e);
    }
    setNlFilterLoading(false);
  };

  const clearNlFilter = () => {
    setActiveNlFilter(null);
    setNlFilterError("");
    setPageIdx(0);
  };

  // Compute filtered and sorted data
  const processedData = useMemo(() => {
    if (!ds) return [];
    let result = ds.data;

    // AI Natural Language Filter
    if (activeNlFilter && activeNlFilter.fn) {
      try {
        result = result.filter(activeNlFilter.fn);
      } catch (e) {
        console.error("Failed to execute NL filter:", e);
      }
    }

    // Fast text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [ds, sortConfig, searchQuery]);

  const totalPages = Math.ceil((processedData?.length || 0) / rowsPerPage);
  const paginatedData = processedData.slice(pageIdx * rowsPerPage, (pageIdx + 1) * rowsPerPage);

  const handleSort = (key) => {
    let dir = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.dir === 'asc') dir = 'desc';
    else if (sortConfig && sortConfig.key === key && sortConfig.dir === 'desc') {
      setSortConfig(null);
      return;
    }
    setSortConfig({ key, dir });
  };

  const numericCols = ds ? ds.columns.filter((c) => typeof ds.data[0]?.[c] === "number") : [];
  const metric = selectedMetric || numericCols[0] || "";
  const totalVal = processedData ? processedData.reduce((s, r) => s + (r[numericCols[0]] || 0), 0) : 0;
  const avgVal = processedData && processedData.length ? totalVal / processedData.length : 0;
  const maxVal = processedData ? processedData.reduce((mx, r) => { const v = r[numericCols[0]] || 0; return v > mx ? v : mx; }, -Infinity) : 0;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    if (!file.name.endsWith(".csv")) { setUploadError("Please upload a CSV file."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
        const data = lines.slice(1).map((line) => {
          const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
          return Object.fromEntries(headers.map((h, i) => { const v = vals[i]; return [h, isNaN(v) || v === "" ? v : parseFloat(v)]; }));
        }).filter((row) => Object.values(row).some((v) => v !== "" && v !== undefined));
        const dataset = { name: file.name.replace(".csv", ""), icon: "📁", description: `${data.length} rows • ${headers.length} columns`, columns: headers, data };
        setUploadedData(dataset);
        setActiveDataset(dataset);
        setActiveTab("canvas");
      } catch { setUploadError("Could not parse CSV. Please check the format."); }
    };
    reader.readAsText(file);
  };

  const sendOracleMessage = async () => {
    if (!oracleInput.trim() || oracleLoading) return;
    const userMsg = oracleInput.trim();
    setOracleInput("");
    setOracleMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setOracleLoading(true);
    const systemPrompt = `You are Oracle, LUMIQ's elite AI data analyst — brilliant, direct, proactively insightful.\nDataset: ${ds ? ds.name : "No dataset loaded"}\n${ds ? `Columns: ${ds.columns.join(", ")}\nSample (first 5 rows): ${JSON.stringify(ds.data.slice(0, 5))}\nTotal rows: ${ds.data.length}` : "No dataset loaded — tell the user to select one."}\nStyle: answer directly with real numbers, explain WHY it matters, use → for implications, • for key points, end with one sharp follow-up. Under 220 words.`;
    const msgs = [{ role: "system", content: systemPrompt }, ...oracleMessages.filter(m => !m.streaming).map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMsg }];
    try {
      setOracleMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
      if (apiKey && apiKey !== "demo") {
        await callGroq(apiKey, msgs, (text) => {
          setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: text, streaming: true }; return u; });
        });
      } else {
        const demo = `I'm running in demo mode — connect a real Groq API key to get live AI analysis!\n\nBased on the data structure I can see:\n• Your dataset has ${ds?.data.length || 0} rows across ${ds?.columns.length || 0} columns\n→ Key numeric metrics: ${ds?.columns.filter(c => typeof ds.data[0]?.[c] === 'number').join(", ") || "none detected"}\n\nWith a real Groq key, I'd give you deep analysis of this question instantly. Get yours free at console.groq.com`;
        let current = "";
        for (const char of demo) { await new Promise(r => setTimeout(r, 15)); current += char; setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: current, streaming: true }; return u; }); }
      }
      setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], streaming: false }; return u; });
    } catch (err) {
      setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `⚠ Groq error: ${err.message}. Check your API key.`, streaming: false }; return u; });
    }
    setOracleLoading(false);
  };

  const generateNarrative = async () => {
    if (!ds) return;
    setNarrativeLoading(true); setNarrativeText("");
    const prompt = `You are a senior business analyst. Write a DECISION BRIEF for:\nDataset: ${ds.name}\nColumns: ${ds.columns.join(", ")}\nData (first 8 rows): ${JSON.stringify(ds.data.slice(0, 8))}\nTotal: ${ds.data.length} rows\n\nFormat:\nHEADLINE: [one sentence]\n\nWHAT HAPPENED: [2-3 sentences with real numbers]\n\nWHY IT MATTERS: [business implication]\n\nTHE RISK: [what could go wrong]\n\nRECOMMENDED ACTION: [one concrete next step]\n\nUnder 280 words. Be direct.`;
    try {
      if (apiKey && apiKey !== "demo") {
        await callGroq(apiKey, [{ role: "user", content: prompt }], (text) => setNarrativeText(text));
      } else {
        const demo = `HEADLINE: Dataset loaded successfully — connect Groq API for AI-generated decision briefs.\n\nWHAT HAPPENED: Your dataset "${ds.name}" contains ${ds.data.length} rows and ${ds.columns.length} columns (${ds.columns.join(", ")}). The data has been parsed and is ready for analysis.\n\nWHY IT MATTERS: With a real Groq API key, Oracle will analyze actual patterns, trends, and anomalies in your data and write executive-ready briefs in under 2 seconds.\n\nTHE RISK: Without AI analysis, you may miss non-obvious correlations and leading indicators buried in the data.\n\nRECOMMENDED ACTION: Get a free Groq API key at console.groq.com and reconnect Oracle to unlock full narrative intelligence.`;
        let current = "";
        for (const char of demo) { await new Promise(r => setTimeout(r, 8)); current += char; setNarrativeText(current); }
      }
    } catch (err) { setNarrativeText(`Error: ${err.message}`); }
    setNarrativeLoading(false);
  };

  const runScenario = async () => {
    if (!ds || !scenarioInput.trim()) return;
    setScenarioLoading(true); setScenarios([]);
    const isScenario = /what if|if we|suppose|assume|scenario|increase|decrease|double|halve|drop|rise|grow|shrink|change|impact|affect/i.test(scenarioInput);
    const prompt = isScenario
      ? `Quantitative strategist. Scenario: "${scenarioInput}"\nDataset: ${ds.name}, columns: ${ds.columns.join(", ")}, sample: ${JSON.stringify(ds.data.slice(0, 5))}, total: ${ds.data.length} rows\nReturn ONLY valid JSON array, no markdown:\n[{"label":"Optimistic","probability":25,"impact":"+X%","description":"...","key_driver":"..."},{"label":"Base Case","probability":55,"impact":"+X%","description":"...","key_driver":"..."},{"label":"Pessimistic","probability":20,"impact":"-X%","description":"...","key_driver":"..."}]`
      : `Expert data analyst. Question: "${scenarioInput}"\nDataset: ${ds.name}, columns: ${ds.columns.join(", ")}, sample (10 rows): ${JSON.stringify(ds.data.slice(0, 10))}, total: ${ds.data.length} rows\nReturn ONLY valid JSON array, no markdown:\n[{"label":"Overview","probability":100,"impact":"—","description":"Direct answer using actual data","key_driver":"context"},{"label":"Key Insight","probability":100,"impact":"—","description":"Most important finding","key_driver":"primary signal"},{"label":"What To Watch","probability":100,"impact":"—","description":"Critical risk or variable","key_driver":"risk factor"}]`;
    try {
      let result = "";
      if (apiKey && apiKey !== "demo") {
        result = await callGroq(apiKey, [{ role: "user", content: prompt }], () => { });
      } else {
        result = JSON.stringify([
          { label: "Demo Mode", probability: 0, impact: "\u2014", description: "Connect a Groq API key to get real AI scenario analysis. Get yours free at console.groq.com", key_driver: "Groq API required" },
          { label: "Dataset Ready", probability: 100, impact: "\u2014", description: `Your "${ds.name}" dataset with ${ds.data.length} rows is loaded and ready for analysis.`, key_driver: "Data loaded successfully" },
          { label: "Next Step", probability: 100, impact: "\u2014", description: "Add your Groq API key in Settings \u2192 the Oracle will analyze your exact scenario with real data.", key_driver: "API key setup" },
        ]);
      }
      const match = result.replace(/```json|```/g, "").trim().match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON in response");
      setScenarios(JSON.parse(match[0]));
    } catch (e) {
      setScenarios([{ label: "Error", probability: 0, impact: "N/A", description: `Could not process: ${e.message}`, key_driver: "Error" }]);
    }
    setScenarioLoading(false);
  };

  const runDeepDive = async () => {
    if (!apiKey || apiKey === "demo") return;
    setLabLoading(true);
    setLabAnalysis(null);

    try {
      // 1. Calculate Correlation Matrix
      const matrix = [];
      for (let i = 0; i < numericCols.length; i++) {
        const row = [];
        for (let j = 0; i < numericCols.length && j < numericCols.length; j++) {
          if (i === j) row.push(1);
          else {
            const valsI = ds.data.map(d => d[numericCols[i]] || 0);
            const valsJ = ds.data.map(d => d[numericCols[j]] || 0);
            row.push(calcPearsonCorrelation(valsI, valsJ));
          }
        }
        matrix.push(row);
      }

      // 2. Find Top Anomalies across all metrics
      let allAnomalies = [];
      numericCols.forEach(col => {
        const vals = ds.data.map(d => d[col] || 0);
        const { anomalies } = getAnomalies(vals, 2.8); // High threshold
        anomalies.forEach(a => {
          allAnomalies.push({ metric: col, rowIdx: a.index, value: a.value, zScore: a.zScore });
        });
      });
      allAnomalies.sort((a, b) => b.zScore - a.zScore);
      const topAnomalies = allAnomalies.slice(0, 5);

      // 3. Find strongest correlations (positive or negative)
      const strongCorrelations = [];
      for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
          const val = matrix[i][j];
          if (Math.abs(val) > 0.6) {
            strongCorrelations.push({ col1: numericCols[i], col2: numericCols[j], val });
          }
        }
      }

      // 4. Send to Groq for interpretation
      const prompt = `Act as an expert Data Scientist. I have analyzed the dataset "${ds.name}" and found these statistical patterns. 
Explain what they mean in plain, non-technical business English.

STRONGEST CORRELATIONS (1 = perfect positive, -1 = perfect negative):
${strongCorrelations.length ? strongCorrelations.map(c => `- ${c.col1} vs ${c.col2}: ${c.val.toFixed(2)}`).join('\n') : "None detected above 0.6"}

TOP ANOMALIES (Z-Score > 2.8):
${topAnomalies.length ? topAnomalies.map(a => `- Row #${a.rowIdx}: ${a.metric} was ${a.value.toFixed(1)} (Z-score: ${a.zScore.toFixed(1)})`).join('\n') : "No significant anomalies found."}

Provide a short "Executive Summary" paragraph, then a "Key Findings" bulleted list. Do NOT output markdown code blocks, just raw text with markdown formatting (bold/italics).`;

      const result = await callGroq(apiKey, [{ role: "user", content: prompt }], () => { });

      setLabAnalysis({
        matrix,
        columns: numericCols,
        anomalies: topAnomalies,
        analysisText: result
      });
    } catch (e) {
      setLabAnalysis({ error: e.message });
    }
    setLabLoading(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div className="sidebar-overlay" style={{ display: isMobileMenuOpen ? "block" : "none" }} onClick={() => setIsMobileMenuOpen(false)} />
      <aside className={`app-sidebar ${isMobileMenuOpen ? "open" : ""}`} style={{ width: "220px", background: "#050914", borderRight: "1px solid #1e2d5c", display: "flex", flexDirection: "column", padding: "16px 12px", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", paddingLeft: "4px" }}>
          <PrismLogo size={28} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "17px" }}>LUM<span style={{ color: "#00D4FF" }}>IQ</span></span>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#3d4f7c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", paddingLeft: "4px" }}>Workspace</div>
          {[{ id: "canvas", icon: "⬡", label: "Canvas" }, { id: "oracle", icon: "🔮", label: "Oracle AI" }, { id: "narrative", icon: "📄", label: "Narrative" }, { id: "scenario", icon: "🌐", label: "Scenario Forge" }, { id: "ailab", icon: "🔬", label: "AI Lab" }, { id: "datadna", icon: "🧬", label: "Data DNA" }, { id: "data", icon: "🗃️", label: "Data Manager" }].map((t) => (
            <div key={t.id} className={`sidebar-link ${activeTab === t.id ? "active" : ""} `} onClick={() => { setActiveTab(t.id); setIsMobileMenuOpen(false); }}>
              <span style={{ fontSize: "16px" }}>{t.icon}</span><span>{t.label}</span>
              {t.id === "oracle" && <span className="badge badge-violet" style={{ marginLeft: "auto", fontSize: "9px" }}>AI</span>}
              {t.id === "ailab" && <span className="badge badge-cyan" style={{ marginLeft: "auto", fontSize: "9px" }}>NEW</span>}
              {t.id === "datadna" && <span className="badge badge-green" style={{ marginLeft: "auto", fontSize: "9px" }}>NEW</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#3d4f7c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", paddingLeft: "4px" }}>Datasets</div>
          {Object.values(SAMPLE_DATASETS).map((d) => (
            <div key={d.name} className={`sidebar-link ${activeDataset?.name === d.name ? "active" : ""}`} onClick={() => { setActiveDataset(d); setIsMobileMenuOpen(false); }} style={{ fontSize: "12px" }}>
              <span>{d.icon}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
            </div>
          ))}
          {uploadedData && (
            <div className={`sidebar-link ${activeDataset?.name === uploadedData.name ? "active" : ""} `} onClick={() => { setActiveDataset(uploadedData); setIsMobileMenuOpen(false); }} style={{ fontSize: "12px" }}>
              <span>📁</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{uploadedData.name}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #1e2d5c" }}>
          <div className="sidebar-link" onClick={() => setPage("setup")} style={{ fontSize: "12px" }}>⚙ API Settings</div>
          <div className="sidebar-link" onClick={() => setPage("landing")} style={{ fontSize: "12px" }}>← Landing Page</div>
          <div style={{ fontSize: "10px", paddingLeft: "4px", marginTop: "8px", marginBottom: "16px" }}>
            {apiKey && apiKey !== "demo" ? <span style={{ color: "#00E5A0" }}>● Groq connected</span> : <span style={{ color: "#FFB627" }}>● Demo mode</span>}
          </div>
          <div style={{ fontSize: "10px", paddingLeft: "4px", color: "#56689d", marginTop: "8px", lineHeight: 1.4 }}>
            &copy; {new Date().getFullYear()} Saksham Srivastava
            <br />
            Email: sakshamsrivastava7000@gmail.com
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", background: "#070c1e" }} className="app-main grid-bg">
        <div style={{ background: "#050914ee", backdropFilter: "blur(10px)", borderBottom: "1px solid #1e2d5c", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "70%" }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
            <div style={{ display: "flex", gap: "4px" }} className="top-tabs">
              {[{ id: "canvas", label: "Canvas" }, { id: "oracle", label: "Oracle" }, { id: "narrative", label: "Narrative" }, { id: "scenario", label: "Scenario Forge" }, { id: "ailab", label: "AI Lab" }, { id: "datadna", label: "Data DNA" }, { id: "data", label: "Data" }].map((t) => (
                <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""} `} onClick={() => setActiveTab(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {ds && <div className="data-pill">{ds.icon} {ds.name} · {ds.data.length} rows</div>}
            {(!apiKey || apiKey === "demo") && <button className="btn-ghost" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setPage("setup")}>Connect Groq ⚡</button>}
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {activeTab === "canvas" && (
            <div style={{ animation: "fadeSlide 0.3s ease" }}>
              {!ds ? (
                <div style={{ textAlign: "center", padding: "80px 20px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>⬡</div>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", marginBottom: "10px" }}>Select a Dataset</h3>
                  <p style={{ color: "#8892b0", fontSize: "14px" }}>Choose a sample dataset from the sidebar or upload your own CSV in Data Manager</p>
                </div>
              ) : (
                <>
                  {/* AI Natural Language Filter Bar */}
                  <div className="glass-card" style={{ padding: "16px 24px", marginBottom: "24px", borderLeft: "3px solid #7B4FE8" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{ fontSize: "20px", marginTop: "2px" }}>💬</div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                          AI Data Filter
                          <span className="badge badge-violet" style={{ fontSize: "9px" }}>Groq Powered</span>
                        </h3>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            className="oracle-input"
                            style={{ flex: 1, padding: "10px 14px", fontSize: "13px" }}
                            placeholder="e.g., 'Show me rows where Revenue is over 1000 and the month is November'"
                            value={nlFilterQuery}
                            onChange={(e) => setNlFilterQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyNlFilter()}
                            disabled={nlFilterLoading}
                          />
                          <button
                            className="btn-primary"
                            style={{ padding: "10px 20px" }}
                            onClick={applyNlFilter}
                            disabled={nlFilterLoading || !nlFilterQuery.trim()}
                          >
                            {nlFilterLoading ? "Thinking..." : "Filter"}
                          </button>

                          {activeNlFilter && (
                            <button className="btn-ghost" onClick={clearNlFilter}>Clear Filter</button>
                          )}
                        </div>

                        {nlFilterError && <div style={{ color: "#FF3C3C", fontSize: "12px", marginTop: "8px" }}>{nlFilterError}</div>}

                        {activeNlFilter && (
                          <div style={{ marginTop: "12px", padding: "10px", background: "#050914", borderRadius: "8px", border: "1px solid #1e2d5c", fontSize: "11px" }}>
                            <div style={{ color: "#00E5A0", marginBottom: "4px" }}>✓ Filter Applied: "{activeNlFilter.query}"</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", color: "#8892b0", overflowX: "auto" }}>
                              <span style={{ color: "#7B4FE8" }}>Executed Code:</span> {activeNlFilter.code}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                    <div className="metric-card cyan">
                      <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>Total · {numericCols[0]}</div>
                      <div className="stat-number">{totalVal >= 1e6 ? `${(totalVal / 1e6).toFixed(1)} M` : totalVal >= 1000 ? `${(totalVal / 1000).toFixed(0)} K` : totalVal.toFixed(0)}</div>
                      <MiniLineChart data={processedData} yKey={numericCols[0]} color="#00D4FF" />
                    </div>
                    <div className="metric-card gold">
                      <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>Average</div>
                      <div className="stat-number">{avgVal >= 1e6 ? `${(avgVal / 1e6).toFixed(2)}M` : avgVal >= 1000 ? `${(avgVal / 1000).toFixed(1)}K` : avgVal.toFixed(1)}</div>
                      <MiniBarChart data={processedData} xKey={ds.columns[0]} yKey={numericCols[0]} color="#FFB627" />
                    </div>
                    <div className="metric-card violet">
                      <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>Peak Value</div>
                      <div className="stat-number">{maxVal >= 1e6 ? `${(maxVal / 1e6).toFixed(2)}M` : maxVal >= 1000 ? `${(maxVal / 1000).toFixed(0)}K` : maxVal.toFixed(0)}</div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        {numericCols.slice(0, 3).map((c, i) => {
                          const colVals = processedData.map(r => r[c] || 0);
                          const colAvg = colVals.reduce((a, b) => a + b, 0) / (colVals.length || 1);
                          let colMax = -Infinity;
                          for (let i = 0; i < colVals.length; i++) {
                            if (colVals[i] > colMax) colMax = colVals[i];
                          }
                          if (colMax === -Infinity) colMax = 0;

                          return (
                            <DonutChart key={c} value={colAvg} max={colMax} color={["#7B4FE8", "#00D4FF", "#00E5A0"][i]} label={c.length > 10 ? c.slice(0, 8) + "…" : c} />
                          );
                        })}
                      </div>

                    </div>
                    <div className="metric-card green">
                      <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>Filtered Rows</div>
                      <div className="stat-number">{processedData.length} <span style={{ fontSize: "12px", color: "#8892b0", fontWeight: "400" }}>/ {ds.data.length}</span></div>
                      <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {ds.columns.slice(0, 4).map((c) => <span key={c} className="data-pill" style={{ fontSize: "10px" }}>{c}</span>)}
                        {ds.columns.length > 4 && <span className="data-pill" style={{ fontSize: "10px" }}>+{ds.columns.length - 4}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px", marginBottom: "24px" }}>
                    <div className="glass-card" style={{ padding: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700 }}>Visualization</h3>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <select value={metric} onChange={(e) => setSelectedMetric(e.target.value)}>{numericCols.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                          <select value={chartType} onChange={(e) => setChartType(e.target.value)}><option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option></select>
                          <button
                            className={forecastEnabled ? "btn-primary" : "btn-ghost"}
                            style={{ fontSize: "11px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "4px" }}
                            onClick={() => {
                              const next = !forecastEnabled;
                              setForecastEnabled(next);
                              if (next) {
                                const rawVals = processedData.map(d => d[metric] || 0);
                                const reg = calcLinearRegression(rawVals);
                                runForecast(metric, reg);
                              } else {
                                setForecastNarrative("");
                              }
                            }}
                          >
                            🔮 {forecastEnabled ? "Forecasting ON" : "Crystal Ball"}
                          </button>
                        </div>
                      </div>
                      <div style={{ position: "relative", height: "260px" }}>
                        {(() => {
                          const rawVals = processedData.map((d) => d[metric] || 0);
                          const vals = downsample(rawVals, 60);
                          const regression = forecastEnabled ? calcLinearRegression(rawVals) : null;
                          const forecastVals = regression ? regression.forecast : [];
                          const allVals = forecastEnabled ? [...vals, ...forecastVals] : vals;
                          let globalMax = -Infinity, globalMin = Infinity;
                          for (const v of allVals) { if (v > globalMax) globalMax = v; if (v < globalMin) globalMin = v; }
                          if (forecastEnabled && regression) {
                            for (let i = 0; i < forecastVals.length; i++) {
                              const upper = forecastVals[i] + regression.confidence[i];
                              const lower = forecastVals[i] - regression.confidence[i];
                              if (upper > globalMax) globalMax = upper;
                              if (lower < globalMin) globalMin = lower;
                            }
                          }
                          const maxV = globalMax; const minV = globalMin; const range = maxV - minV || 1;
                          const padL = 14; const padR = 2; const padT = 5; const padB = 14;
                          const totalPts = forecastEnabled ? vals.length + forecastVals.length : vals.length;
                          const w = 120; const chartW = w - padL - padR;
                          const h = 100; const chartH = h - padT - padB;
                          const yTicks = 5;
                          const pts = vals.map((v, i) => `${padL + (i / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((v - minV) / range) * chartH}`).join(" ");
                          const xLabelCount = Math.min(6, vals.length);
                          const totalRows = processedData.length;

                          // Forecast points for the dashed line
                          let forecastPts = "";
                          let confidenceArea = "";
                          if (forecastEnabled && forecastVals.length > 0) {
                            const startIdx = vals.length - 1;
                            const lastRealPt = `${padL + (startIdx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((vals[startIdx] - minV) / range) * chartH}`;
                            const fPts = forecastVals.map((v, i) => {
                              const idx = vals.length + i;
                              return `${padL + (idx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((v - minV) / range) * chartH}`;
                            });
                            forecastPts = `${lastRealPt} ${fPts.join(" ")}`;

                            // Confidence band polygon
                            const upperPts = forecastVals.map((v, i) => {
                              const idx = vals.length + i;
                              const upper = v + regression.confidence[i];
                              return `${padL + (idx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((upper - minV) / range) * chartH}`;
                            });
                            const lowerPts = [...forecastVals].reverse().map((v, i) => {
                              const origIdx = forecastVals.length - 1 - i;
                              const idx = vals.length + origIdx;
                              const lower = v - regression.confidence[origIdx];
                              return `${padL + (idx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((lower - minV) / range) * chartH}`;
                            });
                            confidenceArea = [...upperPts, ...lowerPts].join(" ");
                          }

                          return (
                            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.35" />
                                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.02" />
                                </linearGradient>
                              </defs>
                              {/* Y-axis grid lines + labels */}
                              {Array.from({ length: yTicks + 1 }).map((_, i) => {
                                const frac = i / yTicks;
                                const yPos = padT + chartH * (1 - frac);
                                const val = minV + range * frac;
                                return (
                                  <g key={i}>
                                    <line x1={padL} y1={yPos} x2={w - padR} y2={yPos} stroke="#1e2d5c" strokeWidth="0.2" />
                                    <text x={padL - 1} y={yPos + 1} textAnchor="end" fill="#3d4f7c" fontSize="3" fontFamily="DM Mono">{fmtNum(val)}</text>
                                  </g>
                                );
                              })}
                              {/* Forecast boundary line */}
                              {forecastEnabled && vals.length > 0 && (
                                <line
                                  x1={padL + ((vals.length - 1) / Math.max(totalPts - 1, 1)) * chartW}
                                  y1={padT}
                                  x2={padL + ((vals.length - 1) / Math.max(totalPts - 1, 1)) * chartW}
                                  y2={padT + chartH}
                                  stroke="#FFB627"
                                  strokeWidth="0.3"
                                  strokeDasharray="1,1"
                                />
                              )}
                              {/* Confidence band */}
                              {forecastEnabled && confidenceArea && (
                                <polygon points={confidenceArea} fill="#7B4FE8" opacity="0.15" />
                              )}
                              {/* Chart data */}
                              {chartType === "bar" ? vals.map((v, i) => {
                                const bH = ((v - minV) / range) * chartH;
                                const gap = 0.4;
                                const bW = Math.max(chartW / totalPts - gap, 0.5);
                                const x = padL + (i / totalPts) * chartW + gap / 2;
                                return <rect key={i} x={x} y={padT + chartH - bH} width={bW} height={bH} fill="#00D4FF" opacity={0.65 + (i / vals.length) * 0.35} rx="0.3" />;
                              }) : (
                                <>
                                  <polyline points={`${padL},${padT + chartH} ${pts} ${padL + ((vals.length - 1) / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH}`} fill={chartType === "area" ? "url(#chart-fill)" : "none"} stroke="none" />
                                  <polyline points={pts} fill="none" stroke="#00D4FF" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                                  {vals.length <= 80 && vals.map((v, i) => {
                                    const px = padL + (i / Math.max(totalPts - 1, 1)) * chartW;
                                    const py = padT + chartH - ((v - minV) / range) * chartH;
                                    return <circle key={i} cx={px} cy={py} r="0.6" fill="#00D4FF" />;
                                  })}
                                </>
                              )}
                              {/* Forecast dashed line + points */}
                              {forecastEnabled && forecastPts && (
                                <>
                                  <polyline points={forecastPts} fill="none" stroke="#FFB627" strokeWidth="0.8" strokeDasharray="1.5,1" strokeLinecap="round" />
                                  {forecastVals.map((v, i) => {
                                    const idx = vals.length + i;
                                    const px = padL + (idx / Math.max(totalPts - 1, 1)) * chartW;
                                    const py = padT + chartH - ((v - minV) / range) * chartH;
                                    return <circle key={`f${i}`} cx={px} cy={py} r="0.8" fill="#FFB627" stroke="#050914" strokeWidth="0.3" />;
                                  })}
                                  <text x={w - padR} y={padT + 2} textAnchor="end" fill="#FFB627" fontSize="2.5" fontFamily="DM Mono">
                                    🔮 Forecast ({forecastVals.length} pts) | R²={regression?.r2.toFixed(2)}
                                  </text>
                                </>
                              )}
                              {/* Forecast bars */}
                              {forecastEnabled && chartType === "bar" && forecastVals.map((v, i) => {
                                const bH = ((v - minV) / range) * chartH;
                                const gap = 0.4;
                                const idx = vals.length + i;
                                const bW = Math.max(chartW / totalPts - gap, 0.5);
                                const x = padL + (idx / totalPts) * chartW + gap / 2;
                                return <rect key={`fb${i}`} x={x} y={padT + chartH - bH} width={bW} height={bH} fill="#FFB627" opacity="0.6" rx="0.3" strokeDasharray="1,0.5" stroke="#FFB627" strokeWidth="0.15" />;
                              })}
                              {/* X-axis labels */}
                              {Array.from({ length: xLabelCount }).map((_, i) => {
                                const dataIdx = Math.floor((i / Math.max(xLabelCount - 1, 1)) * (totalRows - 1));
                                const px = padL + (i / Math.max(xLabelCount - 1, 1)) * (chartW * (vals.length / totalPts));
                                const label = totalRows > 100 ? `#${dataIdx + 1}` : String(ds.data[dataIdx]?.[ds.columns[0]] || "").slice(0, 6);
                                return <text key={i} x={px} y={h - 1} textAnchor="middle" fill="#3d4f7c" fontSize="3" fontFamily="DM Mono">{label}</text>;
                              })}
                              {/* Dataset info */}
                              {totalRows > 60 && <text x={w - padR} y={padT + 4} textAnchor="end" fill="#3d4f7c44" fontSize="3" fontFamily="DM Mono">{totalRows.toLocaleString()} rows (avg per bucket)</text>}
                            </svg>
                          );
                        })()}
                      </div>

                      {/* Forecast Narrative */}
                      {forecastEnabled && (
                        <div style={{ marginTop: "16px", padding: "14px", background: "#0a0f22", borderRadius: "10px", border: "1px solid #FFB62744" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "16px" }}>🔮</span>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px" }}>Crystal Ball Forecast</span>
                            <span className="badge badge-gold" style={{ fontSize: "9px" }}>{forecastLoading ? "Analyzing..." : "AI Insight"}</span>
                          </div>
                          <p style={{ fontSize: "12px", color: "#ccd6f6", lineHeight: 1.6 }}>{forecastNarrative || "Generating forecast..."}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#8892b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Auto Insights</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {insights.length > 0 ? insights.map((ins, i) => (
                          <div key={i} className="insight-card" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              <span style={{ fontSize: "18px" }}>{ins.type === "trend_up" ? "📈" : "📉"}</span>
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Syne', sans-serif", marginBottom: "4px" }}>{ins.title}</div>
                                <p style={{ fontSize: "11px", color: "#8892b0", lineHeight: 1.5 }}>{ins.description}</p>
                              </div>
                            </div>
                          </div>
                        )) : <div style={{ textAlign: "center", padding: "20px", color: "#3d4f7c", fontSize: "12px" }}>No significant trends detected</div>}
                      </div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700 }}>Interactive Data Explorer</h3>
                      <input
                        type="text"
                        placeholder="Search dataset..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: "6px 12px", fontSize: "12px", width: "200px" }}
                      />
                    </div>
                    <div style={{ overflowX: "auto", minHeight: "300px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr>
                            {ds.columns.map((col) => (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                style={{ padding: "8px 12px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#8892b0", borderBottom: "1px solid #1e2d5c", textTransform: "uppercase", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
                              >
                                {col}
                                {sortConfig?.key === col && (
                                  <span style={{ marginLeft: "4px", color: "#00D4FF" }}>
                                    {sortConfig.dir === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedData.length > 0 ? paginatedData.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #1e2d5c11" }}>
                              {ds.columns.map((col) => (
                                <td key={col} style={{ padding: "8px 12px", color: typeof row[col] === "number" ? "#00D4FF" : "#ccd6f6", fontFamily: typeof row[col] === "number" ? "'DM Mono', monospace" : "inherit", fontSize: "12px", whiteSpace: "nowrap" }}>
                                  {typeof row[col] === "number" ? (row[col] >= 1000 ? row[col].toLocaleString() : row[col].toFixed(1)) : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={ds.columns.length} style={{ textAlign: "center", padding: "40px", color: "#8892b0" }}>
                                No results found for "{searchQuery}"
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #1e2d5c33" }}>
                      <div style={{ fontSize: "11px", color: "#8892b0" }}>
                        Showing {paginatedData.length > 0 ? pageIdx * rowsPerPage + 1 : 0} to {Math.min((pageIdx + 1) * rowsPerPage, processedData.length)} of {processedData.length} entries
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn-ghost"
                          style={{ padding: "4px 12px", fontSize: "11px" }}
                          disabled={pageIdx === 0}
                          onClick={() => setPageIdx(p => Math.max(0, p - 1))}
                        >
                          Previous
                        </button>
                        <span style={{ fontSize: "11px", color: "#ccd6f6", display: "flex", alignItems: "center" }}>
                          Page {pageIdx + 1} of {Math.max(1, totalPages)}
                        </span>
                        <button
                          className="btn-ghost"
                          style={{ padding: "4px 12px", fontSize: "11px" }}
                          disabled={pageIdx >= totalPages - 1}
                          onClick={() => setPageIdx(p => Math.min(totalPages - 1, p + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "oracle" && (
            <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #00D4FF1a, #7B4FE81a)", border: "1px solid #00D4FF33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🔮</div>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800 }}>Oracle AI</h2>
                  <span className="badge badge-violet">Groq · Llama 3.3 70B</span>
                  {(!apiKey || apiKey === "demo") && <span className="badge badge-gold">Demo Mode</span>}
                </div>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>Ask anything about your data. Oracle streams answers via Groq in real-time.{!ds && <span style={{ color: "#FFB627" }}> Select a dataset first.</span>}</p>
              </div>
              <div style={{ background: "#050914", border: "1px solid #1e2d5c", borderRadius: "16px", height: "420px", overflow: "auto", padding: "20px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {oracleMessages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", color: "#3d4f7c" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔮</div>
                    <p style={{ fontSize: "14px" }}>Oracle is ready. Ask your first question.</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "16px" }}>
                      {["Why did revenue peak in November?", "What's the biggest risk in this data?", "Which metric should I focus on?"].map((q) => (
                        <button key={q} className="btn-ghost" style={{ fontSize: "11px", padding: "6px 12px" }} onClick={() => setOracleInput(q)}>{q}</button>
                      ))}
                    </div>
                  </div>
                ) : oracleMessages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#3d4f7c", marginBottom: "4px", textAlign: msg.role === "user" ? "right" : "left" }}>{msg.role === "user" ? "YOU" : "ORACLE"}</div>
                    <div className={msg.role === "user" ? "chat-bubble-user" : `chat-bubble-oracle ${msg.streaming ? "streaming-cursor" : ""}`}>{msg.content || (msg.streaming ? "" : "...")}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <textarea className="oracle-input" value={oracleInput} onChange={(e) => setOracleInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendOracleMessage(); } }} placeholder="Ask Oracle anything about your data..." rows={2} style={{ flex: 1 }} disabled={oracleLoading} />
                <button className="btn-primary" onClick={sendOracleMessage} disabled={oracleLoading || !oracleInput.trim()} style={{ alignSelf: "flex-end", padding: "14px 20px" }}>{oracleLoading ? "..." : "→"}</button>
              </div>
              {(!apiKey || apiKey === "demo") && (
                <div style={{ marginTop: "12px", padding: "12px 16px", background: "#FFB6271a", border: "1px solid #FFB62733", borderRadius: "8px", fontSize: "12px", color: "#FFB627" }}>
                  ⚡ Demo mode — <button onClick={() => setPage("setup")} style={{ background: "none", border: "none", color: "#FFB627", cursor: "pointer", textDecoration: "underline", fontSize: "12px" }}>Connect your free Groq API key</button> for real AI responses
                </div>
              )}
            </div>
          )}

          {activeTab === "narrative" && (
            <div style={{ maxWidth: "760px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Decision Brief Generator</h2>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>LUMIQ generates executive-grade decision briefs via Groq — your data becomes a story that drives action.</p>
              </div>
              <button className="btn-primary" onClick={generateNarrative} disabled={narrativeLoading || !ds} style={{ marginBottom: "20px" }}>{narrativeLoading ? "Oracle is writing..." : "Generate Decision Brief"}</button>
              {!ds && <div style={{ color: "#FFB627", fontSize: "13px", marginBottom: "16px" }}>⚠ Select a dataset from the sidebar first</div>}
              {narrativeText && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span className="badge badge-gold">DECISION BRIEF</span>
                    <span style={{ fontSize: "11px", color: "#3d4f7c", fontFamily: "'DM Mono', monospace" }}>{ds?.name} · Generated by Oracle via Groq</span>
                  </div>
                  <div className="narrative-box">{narrativeText}{narrativeLoading && <span style={{ animation: "blink 0.8s infinite", color: "#FFB627" }}>▋</span>}</div>
                  <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                    <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(narrativeText)}>Copy Brief</button>
                    <button className="btn-ghost" onClick={generateNarrative}>Regenerate</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "scenario" && (
            <div style={{ maxWidth: "780px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Scenario Forge</h2>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>Ask any question about your data, or describe a what-if scenario. Oracle models probabilistic outcomes via Groq.</p>
              </div>
              <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Your Question or Hypothesis</label>
                <textarea className="oracle-input" style={{ width: "100%", marginBottom: "14px" }} rows={3} placeholder='e.g. "What is this dataset about?" or "What if loan defaults increase 20%?" or "Which metric best predicts churn?"' value={scenarioInput} onChange={(e) => setScenarioInput(e.target.value)} disabled={scenarioLoading} />
                <button className="btn-primary" onClick={runScenario} disabled={scenarioLoading || !scenarioInput.trim() || !ds}>{scenarioLoading ? "Analyzing..." : "Run Analysis"}</button>
                {!ds && <span style={{ color: "#FFB627", fontSize: "12px", marginLeft: "12px" }}>Select a dataset first</span>}
              </div>
              {scenarios.length > 0 && (
                <div>
                  <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="badge badge-violet">ORACLE ANALYSIS</span>
                    <span style={{ fontSize: "11px", color: "#3d4f7c" }}>{scenarioInput.slice(0, 60)}{scenarioInput.length > 60 ? "..." : ""}</span>
                  </div>
                  {scenarios.map((s, i) => {
                    const colorMap = { Optimistic: "#00E5A0", "Base Case": "#00D4FF", Pessimistic: "#FFB627", Overview: "#00D4FF", "Key Insight": "#7B4FE8", "What To Watch": "#FFB627", "Demo Mode": "#8892b0", "Dataset Ready": "#00E5A0", "Next Step": "#00D4FF" };
                    const color = colorMap[s.label] || "#8892b0";
                    return (
                      <div key={i} className="scenario-card" style={{ borderLeft: `3px solid ${color}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color }}>{s.label}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "20px", fontWeight: 500, color }}>{s.impact}</span>
                          </div>
                          {s.probability > 0 && <div style={{ textAlign: "right" }}><div style={{ fontFamily: "'DM Mono', monospace", fontSize: "22px", fontWeight: 500, color }}>{s.probability}%</div><div style={{ fontSize: "10px", color: "#8892b0" }}>probability</div></div>}
                        </div>
                        {s.probability > 0 && <div style={{ background: "#1e2d5c", borderRadius: "4px", height: "4px", marginBottom: "12px" }}><div style={{ background: color, width: `${s.probability}%`, height: "100%", borderRadius: "4px" }} /></div>}
                        <p style={{ fontSize: "13px", color: "#ccd6f6", lineHeight: 1.6, marginBottom: "8px" }}>{s.description}</p>
                        <div style={{ fontSize: "11px", color: "#8892b0" }}><span style={{ color: "#3d4f7c" }}>Key driver: </span>{s.key_driver}</div>
                      </div>
                    );
                  })}
                  <button className="btn-ghost" style={{ marginTop: "16px" }} onClick={() => setScenarios([])}>Clear</button>
                </div>
              )}
            </div>
          )}

          {activeTab === "ailab" && (
            <div style={{ maxWidth: "900px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
              <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>AI Data Lab</h2>
                  <p style={{ color: "#8892b0", fontSize: "13px" }}>Deep statistical analysis and Groq-powered interpretations.</p>
                </div>
                <button className="btn-primary" onClick={runDeepDive} disabled={labLoading || !ds}>
                  {labLoading ? "Analyzing..." : "Run Deep Dive"}
                </button>
              </div>

              {!ds && <div style={{ color: "#FFB627", fontSize: "13px", marginBottom: "16px" }}>⚠ Select a dataset from the sidebar first</div>}

              {labAnalysis && !labAnalysis.error && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                  <div className="glass-card" style={{ padding: "24px" }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>Correlation Matrix</h3>
                    <p style={{ fontSize: "11px", color: "#8892b0", marginBottom: "20px" }}>Identifies how strongly numeric columns are related to each other. <span style={{ color: "rgba(0, 212, 255, 1)" }}>Blue = Positive</span>, <span style={{ color: "rgba(255, 60, 60, 1)" }}>Red = Negative</span></p>
                    <div style={{ overflowX: "auto", paddingBottom: "20px" }}>
                      <HeatmapChart matrix={labAnalysis.matrix} columns={labAnalysis.columns} />
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: "24px" }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>Anomaly Detection</h3>
                    <p style={{ fontSize: "11px", color: "#8892b0", marginBottom: "20px" }}>Highlights top statistical outliers (Z-Score &gt; 2.8) across your dataset. Anomalies are shown in <span style={{ color: "#FF3C3C", fontWeight: "bold" }}>Red</span>.</p>
                    <div style={{ height: "200px" }}>
                      {labAnalysis.anomalies.length > 0 ? (
                        <AnomalyScatterChart
                          data={ds.data}
                          metric={labAnalysis.anomalies[0].metric}
                          anomalies={labAnalysis.anomalies.filter(a => a.metric === labAnalysis.anomalies[0].metric)}
                        />
                      ) : (
                        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8892b0", fontSize: "12px" }}>No extreme anomalies detected.</div>
                      )}
                    </div>
                    {labAnalysis.anomalies.length > 0 && (
                      <div style={{ marginTop: "12px", fontSize: "11px", color: "#ccd6f6" }}>
                        Currently viewing anomalous metric: <span className="data-pill">{labAnalysis.anomalies[0].metric}</span>
                      </div>
                    )}
                  </div>

                  <div className="glass-card" style={{ padding: "24px", gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                      <span className="badge badge-violet">AI INTERPRETATION</span>
                      <span style={{ fontSize: "11px", color: "#3d4f7c", fontFamily: "'DM Mono', monospace" }}>Powered by Groq</span>
                    </div>
                    <div className="narrative-box" style={{ borderRadius: "12px", borderLeft: "3px solid #7B4FE8" }}>{labAnalysis.analysisText}</div>
                  </div>
                </div>
              )}

              {labAnalysis?.error && (
                <div style={{ padding: "20px", background: "#ff444411", color: "#ff4444", border: "1px solid #ff444444", borderRadius: "12px" }}>
                  <strong>Analysis Failed:</strong> {labAnalysis.error}. Make sure your Groq API key is valid.
                </div>
              )}
            </div>
          )}

          {activeTab === "datadna" && (
            <div style={{ animation: "fadeSlide 0.3s ease" }}>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                  🧬 Data DNA
                  <span className="badge badge-green" style={{ fontSize: "10px" }}>Column Profiler</span>
                </h2>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>Deep statistical X-ray of every column in your dataset.</p>
              </div>

              {!ds ? (
                <div style={{ textAlign: "center", padding: "80px 20px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧬</div>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", marginBottom: "10px" }}>Select a Dataset</h3>
                  <p style={{ color: "#8892b0", fontSize: "14px" }}>Choose a dataset from the sidebar to see its DNA profile</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {ds.columns.map((colName) => {
                    const p = profileColumn(ds.data, colName);
                    const qualityColor = p.qualityScore >= 80 ? "#00E5A0" : p.qualityScore >= 50 ? "#FFB627" : "#FF3C3C";
                    const qualityPct = p.qualityScore / 100;
                    const r = 22; const circ = 2 * Math.PI * r;
                    const histMax = p.histogram ? Math.max(...p.histogram, 1) : 1;

                    return (
                      <div key={colName} className="glass-card" style={{ padding: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                          <div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{colName}</div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <span className={`badge ${p.type === "Numeric" ? "badge-cyan" : "badge-violet"}`} style={{ fontSize: "9px" }}>{p.type}</span>
                              <span className="badge" style={{ fontSize: "9px", background: "#1a2244", color: "#8892b0" }}>{p.uniqueCount} unique</span>
                            </div>
                          </div>
                          {/* Quality Score Donut */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <svg width="52" height="52" viewBox="0 0 52 52">
                              <circle cx="26" cy="26" r={r} fill="none" stroke="#1a2244" strokeWidth="5" />
                              <circle cx="26" cy="26" r={r} fill="none" stroke={qualityColor} strokeWidth="5"
                                strokeDasharray={circ} strokeDashoffset={circ * (1 - qualityPct)}
                                strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: "stroke-dashoffset 1s ease" }} />
                              <text x="26" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{p.qualityScore}</text>
                            </svg>
                            <span style={{ fontSize: "8px", color: "#8892b0", marginTop: "2px" }}>Quality</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px", fontSize: "11px" }}>
                          <div style={{ color: "#8892b0" }}>Completeness</div>
                          <div style={{ color: "#ccd6f6", textAlign: "right" }}>{p.completeness}%</div>
                          <div style={{ color: "#8892b0" }}>Non-null</div>
                          <div style={{ color: "#ccd6f6", textAlign: "right" }}>{p.nonNull.toLocaleString()} / {p.total.toLocaleString()}</div>
                          {p.type === "Numeric" && (
                            <>
                              <div style={{ color: "#8892b0" }}>Min / Max</div>
                              <div style={{ color: "#ccd6f6", textAlign: "right" }}>{fmtNum(p.min)} — {fmtNum(p.max)}</div>
                              <div style={{ color: "#8892b0" }}>Mean</div>
                              <div style={{ color: "#00D4FF", textAlign: "right", fontWeight: 600 }}>{fmtNum(p.mean)}</div>
                              <div style={{ color: "#8892b0" }}>Median</div>
                              <div style={{ color: "#ccd6f6", textAlign: "right" }}>{fmtNum(p.median)}</div>
                              <div style={{ color: "#8892b0" }}>Std Dev</div>
                              <div style={{ color: "#ccd6f6", textAlign: "right" }}>{fmtNum(p.stdDev)}</div>
                            </>
                          )}
                          {p.type === "Categorical" && p.topValues && (
                            <>
                              <div style={{ color: "#8892b0", gridColumn: "1 / -1", marginTop: "4px", fontWeight: 600 }}>Top Values</div>
                              {p.topValues.map((tv) => (
                                <>
                                  <div style={{ color: "#ccd6f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tv.val}</div>
                                  <div style={{ color: "#7B4FE8", textAlign: "right" }}>{tv.count} ({tv.pct}%)</div>
                                </>
                              ))}
                            </>
                          )}
                        </div>

                        {/* Histogram */}
                        {p.histogram && p.histogram.length > 0 && (
                          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "40px", borderTop: "1px solid #1e2d5c", paddingTop: "8px" }}>
                            {p.histogram.map((count, i) => {
                              const barH = (count / histMax) * 30;
                              return (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "30px" }}>
                                  <div style={{ width: "100%", height: `${Math.max(barH, 1)}px`, background: `linear-gradient(to top, ${p.type === "Numeric" ? "#00D4FF88" : "#7B4FE888"}, ${p.type === "Numeric" ? "#00D4FF" : "#7B4FE8"})`, borderRadius: "2px 2px 0 0", transition: "height 0.3s ease" }} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "data" && (
            <div style={{ maxWidth: "780px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Data Manager</h2>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>Upload your own CSV or choose from sample datasets</p>
              </div>
              <div className="upload-zone" style={{ marginBottom: "24px" }} onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} accept=".csv" style={{ display: "none" }} onChange={handleFileUpload} />
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📂</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>Drop your CSV here</div>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>or click to browse files</p>
                {uploadError && <p style={{ color: "#ff4444", fontSize: "12px", marginTop: "10px" }}>{uploadError}</p>}
                {uploadedData && <p style={{ color: "#00E5A0", fontSize: "12px", marginTop: "10px" }}>✓ Loaded: {uploadedData.name} ({uploadedData.data.length} rows)</p>}
              </div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "14px", color: "#8892b0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sample Datasets</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                {Object.values(SAMPLE_DATASETS).map((d) => (
                  <div key={d.name} className={`glass-card`} style={{ padding: "20px", cursor: "pointer", transition: "all 0.2s", borderColor: activeDataset?.name === d.name ? "#00D4FF44" : "#1e2d5c" }} onClick={() => { setActiveDataset(d); setActiveTab("canvas"); }}>
                    <div style={{ fontSize: "28px", marginBottom: "10px" }}>{d.icon}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{d.name}</div>
                    <p style={{ color: "#8892b0", fontSize: "12px", marginBottom: "12px" }}>{d.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{d.columns.slice(0, 3).map((c) => <span key={c} className="data-pill" style={{ fontSize: "10px" }}>{c}</span>)}</div>
                    {activeDataset?.name === d.name && <div style={{ marginTop: "10px" }}><span className="badge badge-cyan">Active</span></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
