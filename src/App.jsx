import { useState, useEffect, useRef, useMemo } from "react";
import {
  validateFilterPlan,
  applyFilterPlan,
  describeFilterPlan,
  parseFilterPlanReply,
  FILTER_ACTIONS,
} from "./lib/filterPlan.js";
import {
  isNumber,
  numericValues,
  sum as sumValues,
  mean as meanValues,
  max as maxValues,
  median as medianValue,
  numericPairs,
  numericEntries,
} from "./lib/stats.js";
import { createStreamReader } from "./lib/streamReader.js";
import { SAMPLE_DATASETS } from "./data/sampleDatasets.js";
import { datasetFromCsv, numericColumns } from "./data/dataset.js";
import { formatCell, formatTileValue, aggregationRule, NUMERIC_TYPES } from "./data/columnTypes.js";
import { validatePlan } from "./engine/validatePlan.js";
import { runPlan } from "./engine/runPlan.js";
import { buildSchemaSummary, renderSchemaSummary, schemaNumberCandidates } from "./ai/schemaSummary.js";
import {
  buildPlanPrompt,
  buildDescribePrompt,
  buildExplainPrompt,
  parsePlannerReply,
  exampleQuestions,
} from "./ai/oraclePlanner.js";
import { collectCandidates, verifyNumbers } from "./ai/numberCheck.js";
import { computeInsights, forecastTimeColumn, forecastSeries } from "./engine/insights.js";
import { callGroq } from "./ai/client.js";
import { readStoredApiKey, writeStoredApiKey } from "./lib/apiKeyStorage.js";
import { fmtNum } from "./lib/format.js";
import { downsample, calcPearsonCorrelation, getAnomalies, calcLinearRegression, profileColumn } from "./lib/analysis.js";
import MiniBarChart from "./charts/MiniBarChart.jsx";
import MiniLineChart from "./charts/MiniLineChart.jsx";
import DonutChart from "./charts/DonutChart.jsx";
import HeatmapChart from "./charts/HeatmapChart.jsx";
import AnomalyScatterChart from "./charts/AnomalyScatterChart.jsx";
import PrismLogo from "./components/PrismLogo.jsx";
import KeyNudge from "./components/KeyNudge.jsx";
import LandingPage from "./screens/LandingPage.jsx";
import ApiKeySetup from "./screens/ApiKeySetup.jsx";
import FilesScreen from "./screens/FilesScreen.jsx";
import ColumnDetailsScreen from "./screens/ColumnDetailsScreen.jsx";
import DataHealthScreen from "./screens/DataHealthScreen.jsx";
import { useDeepDive } from "./hooks/useDeepDive.js";
import WhatIfScreen from "./screens/WhatIfScreen.jsx";
import { useScenario } from "./hooks/useScenario.js";

// ============================================================
// LUMIQ — Luminous Intelligence Queries (Groq Edition)
// ============================================================

export default function LumiqApp() {
  const [page, setPage] = useState(() => (readStoredApiKey() ? "app" : "landing"));
  const [apiKey, setApiKey] = useState(readStoredApiKey);
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
  const [uploadedData, setUploadedData] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [oracleMessages]);
  // Reset lab analysis when dataset changes
  useEffect(() => {
    if (activeDataset) {
      setLabAnalysis(null);
    }
  }, [activeDataset]);

  // The demo path: straight to Overview with the Sales sample loaded,
  // so a first visit shows real numbers with no key and no clicks.
  const startDemo = () => {
    if (!activeDataset) {
      setActiveDataset(SAMPLE_DATASETS.sales);
      setActiveTab("canvas");
    }
    setPage("app");
  };

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
      {page === "landing" && <LandingPage setPage={setPage} startDemo={startDemo} />}
      {page === "setup" && (
        <ApiKeySetup
          setPage={setPage}
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          setApiKey={setApiKey}
          startDemo={startDemo}
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

  // In-flight AI requests (F5): the Stop buttons abort these, and a
  // failed Oracle question can be retried.
  const oracleAbortRef = useRef(null);
  const narrativeAbortRef = useRef(null);
  const forecastAbortRef = useRef(null);
  const [oracleLastFailed, setOracleLastFailed] = useState(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reset pagination/sort/filters when dataset changes
  useEffect(() => {
    setSelectedMetric("");
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

  const applyNlFilter = async () => {
    if (!nlFilterQuery.trim() || nlFilterLoading) return;
    if (!apiKey || apiKey === "demo") return; // the KeyNudge under the bar explains
    setNlFilterLoading(true);
    setNlFilterError("");

    try {
      const columnHints = ds.columns
        .map((c) => `${c} (${ds.columnTypes?.[c]?.type || "text"})`)
        .join(", ");
      const prompt = `You translate a user's request into a JSON filter plan for a data table.
Columns: ${columnHints}
User request: "${nlFilterQuery}"

Reply with ONLY a JSON object, no markdown and no explanations, in exactly this shape:
{"logic":"and","conditions":[{"column":"<column name>","action":"<action>","value":<value>}]}

Allowed actions: ${FILTER_ACTIONS.join(", ")}.
Rules:
- "logic" is "and" or "or".
- greater_than and less_than take a number. between takes [low, high]. is_one_of takes an array of values. is_empty takes no value.
- Use only the listed column names, exactly as written.
- If the request cannot be expressed with these actions, reply {"error":"<short reason>"} instead.`;

      // temperature 0: a filter plan should be deterministic JSON
      const reply = await callGroq(apiKey, [{ role: "user", content: prompt }], () => { }, { temperature: 0 });

      // The reply is data, never code: parse it as JSON and check every
      // column and action against the real dataset before using it.
      const parsed = parseFilterPlanReply(reply);
      if (!parsed.ok) {
        setNlFilterError(parsed.error);
        return;
      }
      const checked = validateFilterPlan(parsed.raw, ds.columns);
      if (!checked.ok) {
        setNlFilterError(`Could not apply this filter: ${checked.error}`);
        return;
      }

      setActiveNlFilter({
        query: nlFilterQuery,
        plan: checked.plan,
        description: describeFilterPlan(checked.plan),
      });
      setPageIdx(0);
      setNlFilterQuery("");
    } catch (e) {
      setNlFilterError(e?.message || "The AI filter request failed.");
      console.error("NL Filter Error:", e);
    } finally {
      setNlFilterLoading(false);
    }
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

    // AI Natural Language Filter — a validated plan, never model code
    if (activeNlFilter && activeNlFilter.plan) {
      result = applyFilterPlan(result, activeNlFilter.plan);
    }

    // Fast text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => v != null && String(v).toLowerCase().includes(q))
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
  }, [ds, sortConfig, searchQuery, activeNlFilter]);

  // Auto Insights run on the filtered rows (engine + robust stats),
  // so the AI filter and search change them too.
  const insights = useMemo(() => computeInsights(ds, processedData), [ds, processedData]);

  // Forecast only exists when the dataset has a time column with at
  // least 6 points (same detection as the insights).
  const forecastTime = useMemo(() => forecastTimeColumn(ds), [ds]);

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

  const numericCols = numericColumns(ds);
  const metric = selectedMetric || numericCols[0] || "";
  // Tiles follow the metric picked in the chart dropdown (F9) and the
  // column's aggregation rule: rate-like columns (percent type, or
  // names with rate/margin/ratio/pct/avg/score/nps) are averaged —
  // summing a margin is meaningless — while amounts are summed.
  // Blank cells stay blank: every figure uses real numbers only.
  const metricRule = metric ? aggregationRule(metric, ds?.columnTypes?.[metric]) : "sum";
  const primaryVals = processedData ? processedData.map((r) => r[metric]) : [];
  const totalVal = sumValues(primaryVals);
  const avgVal = meanValues(primaryVals);
  const maxVal = maxValues(primaryVals);
  const medianVal = medianValue(primaryVals);
  const headlineVal = metricRule === "avg" ? avgVal : totalVal;

  // Merges fields into the last (streaming) Oracle message.
  const updateLastOracle = (patch) => {
    setOracleMessages((prev) => {
      const u = [...prev];
      u[u.length - 1] = { ...u[u.length - 1], ...patch };
      return u;
    });
  };

  // The proof flow (F8). 1) The question plus a schema summary — no
  // raw rows — goes to the AI, which returns a JSON calculation plan.
  // 2) The plan is validated (one corrected retry) and the browser
  // runs it on every row. 3) The AI words the result table, streamed.
  // 4) Every number in the wording is checked against that table and
  // unmatched ones are marked. The proof (steps, table, N of M rows,
  // exact prompts sent) is attached to the message.
  const runOracleFlow = async (question, controller) => {
    const summary = buildSchemaSummary(ds);
    const schemaText = renderSchemaSummary(summary);
    const sent = [];

    updateLastOracle({ content: "Planning the calculation…" });
    const planPrompt = buildPlanPrompt(question, schemaText);
    sent.push({ label: "Plan request (schema summary only — no rows)", text: planPrompt });
    const planReply = await callGroq(apiKey, [{ role: "user", content: planPrompt }], null, { signal: controller.signal, temperature: 0 });
    let parsed = parsePlannerReply(planReply);

    // Questions that need no calculation are answered from the
    // summary alone and checked against the summary's own figures.
    if (parsed.kind === "describe") {
      const describePrompt = buildDescribePrompt(question, schemaText);
      sent.push({ label: "Answer request (schema summary only)", text: describePrompt });
      updateLastOracle({ content: "" });
      const answer = await callGroq(apiKey, [{ role: "user", content: describePrompt }], (text) => updateLastOracle({ content: text }), { signal: controller.signal });
      const check = verifyNumbers(answer, schemaNumberCandidates(summary));
      updateLastOracle({
        content: answer,
        segments: check.segments,
        unverified: check.unverified,
        proof: {
          steps: ["No calculation was needed — answered from the dataset summary (column names, types and per-column statistics; no rows were sent)."],
          table: [],
          rowsUsed: ds.data.length,
          totalRows: ds.data.length,
          sent,
        },
      });
      return;
    }

    let checked = parsed.kind === "plan"
      ? validatePlan(parsed.raw, ds.columns, ds.columnTypes)
      : { ok: false, error: parsed.error };
    if (!checked.ok) {
      // One corrected attempt, then decline honestly.
      updateLastOracle({ content: "Correcting the calculation plan…" });
      const retryPrompt = `${planPrompt}\n\nYour previous reply was rejected: ${checked.error}\nReply again with ONLY a corrected JSON object.`;
      sent.push({ label: "Corrected plan request", text: retryPrompt });
      const retryReply = await callGroq(apiKey, [{ role: "user", content: retryPrompt }], null, { signal: controller.signal, temperature: 0 });
      parsed = parsePlannerReply(retryReply);
      checked = parsed.kind === "plan"
        ? validatePlan(parsed.raw, ds.columns, ds.columnTypes)
        : { ok: false, error: parsed.kind === "error" ? parsed.error : "The reply was not a plan." };
      if (!checked.ok) {
        const examples = exampleQuestions(ds);
        updateLastOracle({
          content: `I couldn't work that out from this data.\n\nQuestions I can answer here:\n• ${examples.join("\n• ")}`,
          proof: {
            steps: [`The calculation plan was rejected twice. Last reason: ${checked.error}`],
            table: [],
            rowsUsed: 0,
            totalRows: ds.data.length,
            sent,
          },
        });
        return;
      }
    }

    const result = runPlan(ds.data, ds.columns, checked.plan);
    const explainPrompt = buildExplainPrompt(question, result.steps, result.table, result.rowsUsed, result.totalRows);
    sent.push({ label: "Answer request (steps + result table — no rows)", text: explainPrompt });
    updateLastOracle({ content: "" });
    const answer = await callGroq(apiKey, [{ role: "user", content: explainPrompt }], (text) => updateLastOracle({ content: text }), { signal: controller.signal });
    const candidates = collectCandidates(result.table, [result.rowsUsed, result.totalRows, result.table.length]);
    const check = verifyNumbers(answer, candidates);
    updateLastOracle({
      content: answer,
      segments: check.segments,
      unverified: check.unverified,
      proof: { steps: result.steps, table: result.table, rowsUsed: result.rowsUsed, totalRows: result.totalRows, sent },
    });
  };

  // Pass retryText to re-send a failed question (the Retry button);
  // otherwise the textarea content is sent.
  const sendOracleMessage = async (retryText) => {
    const userMsg = (typeof retryText === "string" ? retryText : oracleInput).trim();
    if (!userMsg || oracleLoading) return;
    if (typeof retryText !== "string") setOracleInput("");
    setOracleLastFailed(null);
    setOracleMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setOracleLoading(true);
    const controller = new AbortController();
    oracleAbortRef.current = controller;
    try {
      setOracleMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
      if (apiKey && apiKey !== "demo") {
        if (!ds) {
          updateLastOracle({ content: "Select a dataset from the sidebar first — I calculate every answer from its rows." });
        } else {
          await runOracleFlow(userMsg, controller);
        }
      } else {
        updateLastOracle({ content: "Add a free Groq key to ask questions in your own words — then I plan the calculation, run it on all your rows in your browser, and show the work under every answer." });
      }
      setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], streaming: false }; return u; });
    } catch (err) {
      if (err.aborted) {
        // Stopped by the user — keep whatever already streamed in
        setOracleMessages((prev) => { const u = [...prev]; const last = u[u.length - 1]; u[u.length - 1] = { role: "assistant", content: last.content ? `${last.content} ⏹` : "⏹ Stopped.", streaming: false }; return u; });
      } else {
        setOracleLastFailed(userMsg);
        setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `⚠ ${err.message}`, streaming: false }; return u; });
      }
    }
    oracleAbortRef.current = null;
    setOracleLoading(false);
  };

  const generateNarrative = async () => {
    if (!ds || !apiKey || apiKey === "demo") return;
    narrativeAbortRef.current?.abort();
    const controller = new AbortController();
    narrativeAbortRef.current = controller;
    setNarrativeLoading(true); setNarrativeText("");
    // The brief sees the schema summary (computed on all rows), never
    // raw rows.
    const prompt = `You are a senior business analyst. Write a DECISION BRIEF from this dataset summary. It was computed on all rows; you have no access to the rows themselves, so use only figures that appear in the summary.\n\n${renderSchemaSummary(buildSchemaSummary(ds))}\n\nFormat:\nHEADLINE: [one sentence]\n\nWHAT HAPPENED: [2-3 sentences with real numbers from the summary]\n\nWHY IT MATTERS: [business implication]\n\nTHE RISK: [what could go wrong]\n\nRECOMMENDED ACTION: [one concrete next step]\n\nUnder 280 words. Be direct.`;
    try {
      await callGroq(apiKey, [{ role: "user", content: prompt }], (text) => setNarrativeText(text), { signal: controller.signal });
    } catch (err) {
      if (narrativeAbortRef.current === controller && !err.aborted) {
        setNarrativeText(`Error: ${err.message} Use Generate / Regenerate to retry.`);
      }
    }
    if (narrativeAbortRef.current === controller) {
      setNarrativeLoading(false);
      narrativeAbortRef.current = null;
    }
  };

  const { runScenario } = useScenario({ apiKey, ds, scenarioInput, setScenarios, setScenarioLoading });

  const { runDeepDive } = useDeepDive({ apiKey, ds, setLabAnalysis, setLabLoading });

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
          {[{ id: "canvas", icon: "⬡", label: "Overview" }, { id: "oracle", icon: "🔮", label: "Ask" }, { id: "narrative", icon: "📄", label: "Report" }, { id: "scenario", icon: "🌐", label: "What-if" }, { id: "ailab", icon: "🔬", label: "Data health" }, { id: "datadna", icon: "🧬", label: "Column details" }, { id: "data", icon: "🗃️", label: "Files" }].map((t) => (
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
              {[{ id: "canvas", label: "Overview" }, { id: "oracle", label: "Ask" }, { id: "narrative", label: "Report" }, { id: "scenario", label: "What-if" }, { id: "ailab", label: "Data health" }, { id: "datadna", label: "Column details" }, { id: "data", label: "Files" }].map((t) => (
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
                  <p style={{ color: "#8892b0", fontSize: "14px" }}>Choose a sample dataset from the sidebar or upload your own CSV in Files</p>
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
                            disabled={nlFilterLoading || !nlFilterQuery.trim() || !apiKey || apiKey === "demo"}
                          >
                            {nlFilterLoading ? "Thinking..." : "Filter"}
                          </button>

                          {activeNlFilter && (
                            <button className="btn-ghost" onClick={clearNlFilter}>Clear Filter</button>
                          )}
                        </div>

                        {nlFilterError && <div style={{ color: "#FF3C3C", fontSize: "12px", marginTop: "8px" }}>{nlFilterError}</div>}
                        {(!apiKey || apiKey === "demo") && <div style={{ marginTop: "10px" }}><KeyNudge setPage={setPage} /></div>}

                        {activeNlFilter && (
                          <div style={{ marginTop: "12px", padding: "10px", background: "#050914", borderRadius: "8px", border: "1px solid #1e2d5c", fontSize: "11px" }}>
                            <div style={{ color: "#00E5A0", marginBottom: "4px" }}>✓ Filter Applied: "{activeNlFilter.query}"</div>
                            <div style={{ color: "#8892b0" }}>
                              <span style={{ color: "#7B4FE8" }}>Showing rows where:</span> {activeNlFilter.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                    <div className="metric-card cyan">
                      <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>{metricRule === "avg" ? "Average" : "Total"} · {metric}</div>
                      <div className="stat-number">{formatTileValue(headlineVal, ds.columnTypes?.[metric], metricRule)}</div>
                      <MiniLineChart data={processedData} yKey={metric} color="#00D4FF" />
                    </div>
                    <div className="metric-card gold">
                      <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>{metricRule === "avg" ? "Median" : "Average"}</div>
                      <div className="stat-number">{formatTileValue(metricRule === "avg" ? medianVal : avgVal, ds.columnTypes?.[metric], "avg")}</div>
                      <MiniBarChart data={processedData} xKey={ds.columns[0]} yKey={metric} color="#FFB627" />
                    </div>
                    <div className="metric-card violet">
                      <div style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>Peak Value</div>
                      <div className="stat-number">{formatTileValue(maxVal, ds.columnTypes?.[metric], metricRule)}</div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        {numericCols.slice(0, 3).map((c, i) => {
                          // Blank cells are skipped in both average and max
                          const colVals = processedData.map(r => r[c]);
                          const colAvg = meanValues(colVals) ?? 0;
                          const colMax = maxValues(colVals) ?? 0;

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
                          {forecastTime ? (
                            <button
                              className={forecastEnabled ? "btn-primary" : "btn-ghost"}
                              style={{ fontSize: "11px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "4px" }}
                              onClick={() => {
                                const next = !forecastEnabled;
                                setForecastEnabled(next);
                                if (next) {
                                  // Points in time order (never table order);
                                  // blank cells are skipped, not fed in as zeros
                                  const rawVals = forecastSeries(ds, processedData, metric) || [];
                                  const reg = calcLinearRegression(rawVals);
                                  runForecast(metric, reg);
                                } else {
                                  forecastAbortRef.current?.abort();
                                  setForecastNarrative("");
                                }
                              }}
                            >
                              🔮 {forecastEnabled ? "Forecast ON" : "Forecast"}
                            </button>
                          ) : (
                            <button
                              className="btn-ghost"
                              disabled
                              title="Forecast needs a date or month column"
                              style={{ fontSize: "11px", padding: "5px 12px", opacity: 0.4, cursor: "default" }}
                            >
                              🔮 Forecast
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ position: "relative", height: "260px" }}>
                        {(() => {
                          // Rows with a blank metric are skipped, never charted
                          // as 0. With Forecast on, the series follows the time
                          // column — sorting the table cannot change it.
                          const rawVals = forecastEnabled && forecastTime
                            ? (forecastSeries(ds, processedData, metric) || [])
                            : numericValues(processedData.map((d) => d[metric]));
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
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px" }}>Forecast</span>
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
                              <span style={{ fontSize: "18px" }}>{{ trend_up: "📈", trend_down: "📉", top: "🏆", unusual: "⚠️" }[ins.type] || "✨"}</span>
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Syne', sans-serif", marginBottom: "4px" }}>{ins.title}</div>
                                <p style={{ fontSize: "11px", color: "#8892b0", lineHeight: 1.5 }}>{ins.description}</p>
                              </div>
                            </div>
                          </div>
                        )) : <div style={{ textAlign: "center", padding: "20px", color: "#3d4f7c", fontSize: "12px" }}>Not enough data for automatic insights</div>}
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
                                  {formatCell(row[col], ds.columnTypes?.[col])}
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
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800 }}>Ask</h2>
                  <span className="badge badge-violet">Groq · Llama 3.3 70B</span>
                  {(!apiKey || apiKey === "demo") && <span className="badge badge-gold">Demo Mode</span>}
                </div>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>Ask questions about your data. Every number is calculated from all your rows.{!ds && <span style={{ color: "#FFB627" }}> Select a dataset first.</span>}</p>
              </div>
              <div style={{ background: "#050914", border: "1px solid #1e2d5c", borderRadius: "16px", height: "420px", overflow: "auto", padding: "20px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {oracleMessages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", color: "#3d4f7c" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔮</div>
                    <p style={{ fontSize: "14px" }}>Oracle is ready. Ask your first question.</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "16px" }}>
                      {(ds ? exampleQuestions(ds) : []).map((q) => (
                        <button key={q} className="btn-ghost" style={{ fontSize: "11px", padding: "6px 12px" }} onClick={() => setOracleInput(q)}>{q}</button>
                      ))}
                    </div>
                  </div>
                ) : oracleMessages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#3d4f7c", marginBottom: "4px", textAlign: msg.role === "user" ? "right" : "left" }}>{msg.role === "user" ? "YOU" : "ORACLE"}</div>
                    <div className={msg.role === "user" ? "chat-bubble-user" : `chat-bubble-oracle ${msg.streaming ? "streaming-cursor" : ""}`}>
                      {msg.segments
                        ? msg.segments.map((s, j) =>
                          s.number !== undefined && !s.verified ? (
                            <span key={j} title="Not verified — this number does not match the calculation" style={{ color: "#FFB627", borderBottom: "1px dashed #FFB627" }}>{s.text}<sup style={{ fontSize: "9px" }}>?</sup></span>
                          ) : (
                            <span key={j}>{s.text}</span>
                          )
                        )
                        : (msg.content || (msg.streaming ? "" : "..."))}
                    </div>
                    {msg.unverified > 0 && !msg.streaming && (
                      <div style={{ fontSize: "10px", color: "#FFB627" }}>⚠ {msg.unverified} number{msg.unverified === 1 ? "" : "s"} marked <sup>?</sup> could not be matched to the calculation</div>
                    )}
                    {msg.proof && !msg.streaming && (
                      <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <details style={{ background: "#0a1128", border: "1px solid #1e2d5c", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
                          <summary style={{ cursor: "pointer", color: "#8892b0", fontSize: "11px" }}>Show the work</summary>
                          <ol style={{ margin: "8px 0 0 18px", color: "#ccd6f6", lineHeight: 1.7, fontSize: "12px" }}>
                            {msg.proof.steps.map((s, j) => <li key={j}>{s}</li>)}
                          </ol>
                          {msg.proof.table.length > 0 && (
                            <div style={{ overflowX: "auto", maxHeight: "220px", overflowY: "auto", marginTop: "8px", border: "1px solid #1e2d5c", borderRadius: "6px" }}>
                              <table style={{ borderCollapse: "collapse", fontSize: "11px", width: "100%" }}>
                                <thead>
                                  <tr>{Object.keys(msg.proof.table[0]).map((c) => (
                                    <th key={c} style={{ textAlign: "left", padding: "4px 10px", color: "#8892b0", fontFamily: "'DM Mono', monospace", fontSize: "10px", borderBottom: "1px solid #1e2d5c", textTransform: "uppercase", whiteSpace: "nowrap" }}>{c}</th>
                                  ))}</tr>
                                </thead>
                                <tbody>
                                  {msg.proof.table.map((row, r) => (
                                    <tr key={r}>{Object.keys(msg.proof.table[0]).map((c) => (
                                      <td key={c} style={{ padding: "4px 10px", color: typeof row[c] === "number" ? "#00D4FF" : "#ccd6f6", fontFamily: typeof row[c] === "number" ? "'DM Mono', monospace" : "inherit", borderBottom: "1px solid #1e2d5c33", whiteSpace: "nowrap" }}>
                                        {row[c] == null ? "—" : typeof row[c] === "number" ? row[c].toLocaleString() : String(row[c])}
                                      </td>
                                    ))}</tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <div style={{ marginTop: "8px", fontSize: "10px", color: "#3d4f7c", fontFamily: "'DM Mono', monospace" }}>Based on {msg.proof.rowsUsed} of {msg.proof.totalRows} rows</div>
                        </details>
                        <details style={{ background: "#0a1128", border: "1px solid #1e2d5c", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
                          <summary style={{ cursor: "pointer", color: "#8892b0", fontSize: "11px" }}>What was sent</summary>
                          {msg.proof.sent.map((s, j) => (
                            <div key={j} style={{ marginTop: "8px" }}>
                              <div style={{ fontSize: "10px", color: "#7B4FE8", marginBottom: "4px", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{s.label}</div>
                              <pre style={{ whiteSpace: "pre-wrap", background: "#050914", border: "1px solid #1e2d5c", borderRadius: "6px", padding: "8px", fontSize: "10px", color: "#8892b0", fontFamily: "'DM Mono', monospace", maxHeight: "180px", overflow: "auto", margin: 0 }}>{s.text}</pre>
                            </div>
                          ))}
                        </details>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <textarea className="oracle-input" value={oracleInput} onChange={(e) => setOracleInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendOracleMessage(); } }} placeholder="Ask Oracle anything about your data..." rows={2} style={{ flex: 1 }} disabled={oracleLoading} />
                {oracleLoading && apiKey && apiKey !== "demo" && (
                  <button className="btn-ghost" onClick={() => oracleAbortRef.current?.abort()} style={{ alignSelf: "flex-end", padding: "14px 16px" }}>⏹ Stop</button>
                )}
                <button className="btn-primary" onClick={() => sendOracleMessage()} disabled={oracleLoading || !oracleInput.trim()} style={{ alignSelf: "flex-end", padding: "14px 20px" }}>{oracleLoading ? "..." : "→"}</button>
              </div>
              {oracleLastFailed && !oracleLoading && (
                <div style={{ marginTop: "10px" }}>
                  <button className="btn-ghost" style={{ fontSize: "12px" }} onClick={() => sendOracleMessage(oracleLastFailed)}>↻ Retry last question</button>
                </div>
              )}
              <p style={{ fontSize: "11px", color: "#3d4f7c", marginTop: "8px" }}>Each question is answered on its own. Include the full detail, for example "revenue by region for 2026".</p>
              {(!apiKey || apiKey === "demo") && (
                <div style={{ marginTop: "12px" }}>
                  <KeyNudge setPage={setPage} />
                </div>
              )}
            </div>
          )}

          {activeTab === "narrative" && (
            <div style={{ maxWidth: "760px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Report</h2>
                <p style={{ color: "#8892b0", fontSize: "13px" }}>LUMIQ generates executive-grade decision briefs via Groq — your data becomes a story that drives action.</p>
              </div>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={generateNarrative} disabled={narrativeLoading || !ds || !apiKey || apiKey === "demo"}>{narrativeLoading ? "Oracle is writing..." : "Generate Decision Brief"}</button>
                {narrativeLoading && apiKey && apiKey !== "demo" && (
                  <button className="btn-ghost" onClick={() => narrativeAbortRef.current?.abort()}>⏹ Stop</button>
                )}
                {(!apiKey || apiKey === "demo") && <KeyNudge setPage={setPage} />}
              </div>
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

          {activeTab === "scenario" && <WhatIfScreen ds={ds} apiKey={apiKey} setPage={setPage} scenarios={scenarios} setScenarios={setScenarios} scenarioInput={scenarioInput} setScenarioInput={setScenarioInput} scenarioLoading={scenarioLoading} runScenario={runScenario} />}

          {activeTab === "ailab" && <DataHealthScreen ds={ds} setPage={setPage} labAnalysis={labAnalysis} labLoading={labLoading} runDeepDive={runDeepDive} />}

          {activeTab === "datadna" && <ColumnDetailsScreen ds={ds} />}

          {activeTab === "data" && <FilesScreen activeDataset={activeDataset} setActiveDataset={setActiveDataset} setActiveTab={setActiveTab} uploadedData={uploadedData} setUploadedData={setUploadedData} uploadError={uploadError} setUploadError={setUploadError} fileInputRef={fileInputRef} />}
        </div>
      </main>
    </div>
  );
};
