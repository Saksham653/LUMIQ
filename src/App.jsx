import { useState, useEffect, useRef, useMemo } from "react";
import { applyFilterPlan } from "./lib/filterPlan.js";
import { sum as sumValues, mean as meanValues, max as maxValues, median as medianValue } from "./lib/stats.js";
import { SAMPLE_DATASETS } from "./data/sampleDatasets.js";
import { numericColumns } from "./data/dataset.js";
import { aggregationRule } from "./data/columnTypes.js";
import { computeInsights, forecastTimeColumn } from "./engine/insights.js";
import { readStoredApiKey } from "./lib/apiKeyStorage.js";
import { css } from "./lib/appStyles.js";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import LandingPage from "./screens/LandingPage.jsx";
import ApiKeySetup from "./screens/ApiKeySetup.jsx";
import OverviewScreen from "./screens/OverviewScreen.jsx";
import AskScreen from "./screens/AskScreen.jsx";
import ReportScreen from "./screens/ReportScreen.jsx";
import WhatIfScreen from "./screens/WhatIfScreen.jsx";
import DataHealthScreen from "./screens/DataHealthScreen.jsx";
import ColumnDetailsScreen from "./screens/ColumnDetailsScreen.jsx";
import FilesScreen from "./screens/FilesScreen.jsx";
import { useOracleChat } from "./hooks/useOracleChat.js";
import { useNarrative } from "./hooks/useNarrative.js";
import { useScenario } from "./hooks/useScenario.js";
import { useDeepDive } from "./hooks/useDeepDive.js";
import { useNlFilter } from "./hooks/useNlFilter.js";
import { useForecast } from "./hooks/useForecast.js";
import { usePersistence } from "./hooks/usePersistence.js";
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
  const [askContext, setAskContext] = useState([]); // follow-up context (B5-3)
  const [uploadedDatasets, setUploadedDatasets] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const addUploadedDataset = (d) => setUploadedDatasets((prev) => [...prev.filter((x) => x.id !== d.id), d]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [oracleMessages]);
  // Reset lab analysis when dataset changes
  useEffect(() => {
    if (activeDataset) {
      setLabAnalysis(null);
      setAskContext([]); // a new dataset is a new topic
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

  // Saves and restores work between visits (F16); storageOk turns
  // false when the browser blocks storage.
  const { storageOk, deleteEverything } = usePersistence({
    activeDataset, setActiveDataset, activeTab, setActiveTab,
    uploadedDatasets, setUploadedDatasets, oracleMessages, setOracleMessages, setAskContext,
  });






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
        <AppShell {...{
          apiKey, setPage, activeDataset, setActiveDataset, activeTab, setActiveTab,
          oracleMessages, setOracleMessages, oracleInput, setOracleInput, oracleLoading, setOracleLoading,
          askContext, setAskContext, narrativeText, setNarrativeText, narrativeLoading, setNarrativeLoading,
          scenarioLoading, setScenarioLoading, scenarios, setScenarios, scenarioInput, setScenarioInput,
          labAnalysis, setLabAnalysis, labLoading, setLabLoading, uploadedDatasets, addUploadedDataset,
          uploadError, setUploadError, chatEndRef, fileInputRef, storageOk, deleteEverything,
        }} />
      )}
    </div>
  );
}

// ─── Sub-Components (Moved outside to prevent focus loss) ──────────────────

const AppShell = ({
  apiKey, setPage, activeDataset, setActiveDataset, activeTab, setActiveTab,
  oracleMessages, setOracleMessages, oracleInput, setOracleInput, oracleLoading, setOracleLoading,
  askContext, setAskContext, narrativeText, setNarrativeText, narrativeLoading, setNarrativeLoading,
  scenarioLoading, setScenarioLoading, scenarios, setScenarios, scenarioInput, setScenarioInput,
  labAnalysis, setLabAnalysis, labLoading, setLabLoading, uploadedDatasets, addUploadedDataset,
  uploadError, setUploadError, chatEndRef, fileInputRef, storageOk, deleteEverything,
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

  const { sendOracleMessage, oracleAbortRef, oracleLastFailed, clearContext, contextActive } = useOracleChat({ apiKey, ds, oracleInput, setOracleInput, oracleLoading, setOracleLoading, setOracleMessages, askContext, setAskContext });

  const { generateNarrative, narrativeAbortRef } = useNarrative({ apiKey, ds, setNarrativeText, setNarrativeLoading });

  const { runScenario } = useScenario({ apiKey, ds, scenarioInput, setScenarios, setScenarioLoading });

  const { runDeepDive } = useDeepDive({ apiKey, ds, setLabAnalysis, setLabLoading });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div className="sidebar-overlay" style={{ display: isMobileMenuOpen ? "block" : "none" }} onClick={() => setIsMobileMenuOpen(false)} />
      <Sidebar apiKey={apiKey} setPage={setPage} activeTab={activeTab} setActiveTab={setActiveTab} activeDataset={activeDataset} setActiveDataset={setActiveDataset} uploadedDatasets={uploadedDatasets} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main style={{ flex: 1, overflow: "auto", background: "#070c1e" }} className="app-main grid-bg">
        <TopBar ds={ds} apiKey={apiKey} setPage={setPage} activeTab={activeTab} setActiveTab={setActiveTab} setIsMobileMenuOpen={setIsMobileMenuOpen} storageOk={storageOk} />

        <div style={{ padding: "24px" }}>
          {activeTab === "canvas" && <ErrorBoundary onRecover={() => setActiveTab("canvas")}><OverviewScreen ds={ds} apiKey={apiKey} setPage={setPage} nlFilter={nlFilter} processedData={processedData} insights={insights} metric={metric} metricRule={metricRule} setSelectedMetric={setSelectedMetric} chartType={chartType} setChartType={setChartType} numericCols={numericCols} headlineVal={headlineVal} avgVal={avgVal} medianVal={medianVal} maxVal={maxVal} forecast={forecast} forecastTime={forecastTime} sortConfig={sortConfig} handleSort={handleSort} searchQuery={searchQuery} setSearchQuery={setSearchQuery} paginatedData={paginatedData} pageIdx={pageIdx} setPageIdx={setPageIdx} totalPages={totalPages} rowsPerPage={rowsPerPage} /></ErrorBoundary>}

          {activeTab === "oracle" && <ErrorBoundary onRecover={() => setActiveTab("canvas")}><AskScreen ds={ds} apiKey={apiKey} setPage={setPage} oracleMessages={oracleMessages} oracleInput={oracleInput} setOracleInput={setOracleInput} oracleLoading={oracleLoading} sendOracleMessage={sendOracleMessage} oracleAbortRef={oracleAbortRef} oracleLastFailed={oracleLastFailed} chatEndRef={chatEndRef} clearContext={clearContext} contextActive={contextActive} /></ErrorBoundary>}

          {activeTab === "narrative" && <ErrorBoundary onRecover={() => setActiveTab("canvas")}><ReportScreen ds={ds} apiKey={apiKey} setPage={setPage} narrativeText={narrativeText} narrativeLoading={narrativeLoading} generateNarrative={generateNarrative} narrativeAbortRef={narrativeAbortRef} /></ErrorBoundary>}

          {activeTab === "scenario" && <ErrorBoundary onRecover={() => setActiveTab("canvas")}><WhatIfScreen ds={ds} apiKey={apiKey} setPage={setPage} scenarios={scenarios} setScenarios={setScenarios} scenarioInput={scenarioInput} setScenarioInput={setScenarioInput} scenarioLoading={scenarioLoading} runScenario={runScenario} /></ErrorBoundary>}

          {activeTab === "ailab" && <ErrorBoundary onRecover={() => setActiveTab("canvas")}><DataHealthScreen ds={ds} setPage={setPage} labAnalysis={labAnalysis} labLoading={labLoading} runDeepDive={runDeepDive} /></ErrorBoundary>}

          {activeTab === "datadna" && <ErrorBoundary onRecover={() => setActiveTab("canvas")}><ColumnDetailsScreen ds={ds} /></ErrorBoundary>}

          {activeTab === "data" && <ErrorBoundary onRecover={() => setActiveTab("canvas")}><FilesScreen activeDataset={activeDataset} setActiveDataset={setActiveDataset} setActiveTab={setActiveTab} uploadedDatasets={uploadedDatasets} addUploadedDataset={addUploadedDataset} deleteEverything={deleteEverything} uploadError={uploadError} setUploadError={setUploadError} fileInputRef={fileInputRef} /></ErrorBoundary>}
        </div>
      </main>
    </div>
  );
};
