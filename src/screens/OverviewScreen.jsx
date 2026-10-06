import FilterBar from "../components/FilterBar.jsx";
import MetricTiles from "../components/MetricTiles.jsx";
import InsightsPanel from "../components/InsightsPanel.jsx";
import DataTable from "../components/DataTable.jsx";
import MainChart from "../charts/MainChart.jsx";

// The Overview: AI filter bar, metric tiles, main chart with
// Forecast, Auto Insights and the data table. All state is owned by
// the shell (passed in), so filters and sorting survive tab switches.
export default function OverviewScreen(props) {
  const {
    ds, apiKey, setPage,
    nlFilter, processedData, insights,
    metric, metricRule, setSelectedMetric, chartType, setChartType, numericCols,
    headlineVal, avgVal, medianVal, maxVal,
    forecast, forecastTime,
    sortConfig, handleSort, searchQuery, setSearchQuery,
    paginatedData, pageIdx, setPageIdx, totalPages, rowsPerPage,
  } = props;

  if (!ds) {
    return (
      <div style={{ animation: "fadeSlide 0.3s ease" }}>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⬡</div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", marginBottom: "10px" }}>Select a Dataset</h3>
          <p style={{ color: "#8892b0", fontSize: "14px" }}>Choose a sample dataset from the sidebar or upload your own CSV in Files</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeSlide 0.3s ease" }}>
      {/* AI Natural Language Filter Bar */}
      <FilterBar
        apiKey={apiKey}
        setPage={setPage}
        nlFilterQuery={nlFilter.nlFilterQuery}
        setNlFilterQuery={nlFilter.setNlFilterQuery}
        nlFilterLoading={nlFilter.nlFilterLoading}
        nlFilterError={nlFilter.nlFilterError}
        activeNlFilter={nlFilter.activeNlFilter}
        applyNlFilter={nlFilter.applyNlFilter}
        clearNlFilter={nlFilter.clearNlFilter}
      />

      <MetricTiles
        ds={ds}
        processedData={processedData}
        metric={metric}
        metricRule={metricRule}
        headlineVal={headlineVal}
        avgVal={avgVal}
        medianVal={medianVal}
        maxVal={maxVal}
        numericCols={numericCols}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px", marginBottom: "24px" }}>
        <MainChart
          ds={ds}
          processedData={processedData}
          numericCols={numericCols}
          metric={metric}
          setSelectedMetric={setSelectedMetric}
          chartType={chartType}
          setChartType={setChartType}
          forecastTime={forecastTime}
          forecastEnabled={forecast.forecastEnabled}
          setForecastEnabled={forecast.setForecastEnabled}
          forecastNarrative={forecast.forecastNarrative}
          setForecastNarrative={forecast.setForecastNarrative}
          forecastLoading={forecast.forecastLoading}
          runForecast={forecast.runForecast}
          forecastAbortRef={forecast.forecastAbortRef}
        />
        <InsightsPanel insights={insights} />
      </div>

      <DataTable
        ds={ds}
        processedData={processedData}
        paginatedData={paginatedData}
        sortConfig={sortConfig}
        handleSort={handleSort}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        pageIdx={pageIdx}
        setPageIdx={setPageIdx}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
      />
    </div>
  );
}
