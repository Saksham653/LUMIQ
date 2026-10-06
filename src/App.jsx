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
import ReportScreen from "./screens/ReportScreen.jsx";
import { useNarrative } from "./hooks/useNarrative.js";
import AskScreen from "./screens/AskScreen.jsx";
import { useOracleChat } from "./hooks/useOracleChat.js";
import OverviewScreen from "./screens/OverviewScreen.jsx";
import { useNlFilter } from "./hooks/useNlFilter.js";
import { useForecast } from "./hooks/useForecast.js";

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

  // AI filter + Forecast state and runners (hooks keep them at shell
  // level so they survive tab switches)
  const nlFilter = useNlFilter({ apiKey, ds, setPageIdx });
  const forecast = useForecast({ apiKey });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reset pagination/sort/filters when dataset changes
  useEffect(() => {
    setSelectedMetric("");
    setSortConfig(null);
    setSearchQuery("");
    setPageIdx(0);
    nlFilter.setNlFilterQuery("");
    nlFilter.setNlFilterError("");
    nlFilter.setActiveNlFilter(null);
    forecast.setForecastEnabled(false);
    forecast.setForecastNarrative("");
  }, [activeDataset]);

  // Compute filtered and sorted data
  const processedData = useMemo(() => {
    if (!ds) return [];
    let result = ds.data;

    // AI Natural Language Filter — a validated plan, never model code
    if (nlFilter.activeNlFilter && nlFilter.activeNlFilter.plan) {
      result = applyFilterPlan(result, nlFilter.activeNlFilter.plan);
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
  }, [ds, sortConfig, searchQuery, nlFilter.activeNlFilter]);

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

  const { sendOracleMessage, oracleAbortRef, oracleLastFailed } = useOracleChat({ apiKey, ds, oracleInput, setOracleInput, oracleLoading, setOracleLoading, setOracleMessages });

  const { generateNarrative, narrativeAbortRef } = useNarrative({ apiKey, ds, setNarrativeText, setNarrativeLoading });

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
          {activeTab === "canvas" && <OverviewScreen ds={ds} apiKey={apiKey} setPage={setPage} nlFilter={nlFilter} processedData={processedData} insights={insights} metric={metric} metricRule={metricRule} setSelectedMetric={setSelectedMetric} chartType={chartType} setChartType={setChartType} numericCols={numericCols} headlineVal={headlineVal} avgVal={avgVal} medianVal={medianVal} maxVal={maxVal} forecast={forecast} forecastTime={forecastTime} sortConfig={sortConfig} handleSort={handleSort} searchQuery={searchQuery} setSearchQuery={setSearchQuery} paginatedData={paginatedData} pageIdx={pageIdx} setPageIdx={setPageIdx} totalPages={totalPages} rowsPerPage={rowsPerPage} />}

          {activeTab === "oracle" && <AskScreen ds={ds} apiKey={apiKey} setPage={setPage} oracleMessages={oracleMessages} oracleInput={oracleInput} setOracleInput={setOracleInput} oracleLoading={oracleLoading} sendOracleMessage={sendOracleMessage} oracleAbortRef={oracleAbortRef} oracleLastFailed={oracleLastFailed} chatEndRef={chatEndRef} />}

          {activeTab === "narrative" && <ReportScreen ds={ds} apiKey={apiKey} setPage={setPage} narrativeText={narrativeText} narrativeLoading={narrativeLoading} generateNarrative={generateNarrative} narrativeAbortRef={narrativeAbortRef} />}

          {activeTab === "scenario" && <WhatIfScreen ds={ds} apiKey={apiKey} setPage={setPage} scenarios={scenarios} setScenarios={setScenarios} scenarioInput={scenarioInput} setScenarioInput={setScenarioInput} scenarioLoading={scenarioLoading} runScenario={runScenario} />}

          {activeTab === "ailab" && <DataHealthScreen ds={ds} setPage={setPage} labAnalysis={labAnalysis} labLoading={labLoading} runDeepDive={runDeepDive} />}

          {activeTab === "datadna" && <ColumnDetailsScreen ds={ds} />}

          {activeTab === "data" && <FilesScreen activeDataset={activeDataset} setActiveDataset={setActiveDataset} setActiveTab={setActiveTab} uploadedData={uploadedData} setUploadedData={setUploadedData} uploadError={uploadError} setUploadError={setUploadError} fileInputRef={fileInputRef} />}
        </div>
      </main>
    </div>
  );
};
