import MiniLineChart from "../charts/MiniLineChart.jsx";
import MiniBarChart from "../charts/MiniBarChart.jsx";
import DonutChart from "../charts/DonutChart.jsx";
import ChartWithTable from "./ChartWithTable.jsx";
import { formatTileValue } from "../data/columnTypes.js";
import { mean as meanValues, max as maxValues, numericValues } from "../lib/stats.js";

// The four Overview tiles. They follow the metric picked in the
// chart dropdown (F9) and its aggregation rule; blank cells stay
// blank in every figure. Every mini chart has a table twin (B7-3).
export default function MetricTiles({ ds, processedData, metric, metricRule, headlineVal, avgVal, medianVal, maxVal, numericCols }) {
  const metricVals = numericValues(processedData.map((r) => r[metric]));
  const metricRows = metricVals.map((v, i) => [i + 1, v]);
  const donutData = numericCols.slice(0, 3).map((c) => {
    // Blank cells are skipped in both average and max
    const colVals = processedData.map((r) => r[c]);
    return { column: c, avg: meanValues(colVals) ?? 0, max: maxValues(colVals) ?? 0 };
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
      <div className="metric-card cyan">
        <div style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>{metricRule === "avg" ? "Average" : "Total"} · {metric}</div>
        <div className="stat-number">{formatTileValue(headlineVal, ds.columnTypes?.[metric], metricRule)}</div>
        <ChartWithTable label={`Line sparkline of ${metric}, ${metricVals.length} filled-in values`} columns={["#", metric]} rows={metricRows} maxHeight={150}>
          <MiniLineChart data={processedData} yKey={metric} color="#00D4FF" />
        </ChartWithTable>
      </div>
      <div className="metric-card gold">
        <div style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>{metricRule === "avg" ? "Median" : "Average"}</div>
        <div className="stat-number">{formatTileValue(metricRule === "avg" ? medianVal : avgVal, ds.columnTypes?.[metric], "avg")}</div>
        <ChartWithTable label={`Bar sparkline of ${metric}, ${metricVals.length} filled-in values`} columns={["#", metric]} rows={metricRows} maxHeight={150}>
          <MiniBarChart data={processedData} xKey={ds.columns[0]} yKey={metric} color="#FFB627" />
        </ChartWithTable>
      </div>
      <div className="metric-card violet">
        <div style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>Peak Value</div>
        <div className="stat-number">{formatTileValue(maxVal, ds.columnTypes?.[metric], metricRule)}</div>
        <ChartWithTable
          label={`Average against maximum for ${donutData.map((d) => d.column).join(", ")}`}
          columns={["Column", "Average", "Max"]}
          rows={donutData.map((d) => [d.column, Math.round(d.avg * 100) / 100, d.max])}
          maxHeight={150}
        >
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            {donutData.map((d, i) => (
              <DonutChart key={d.column} value={d.avg} max={d.max} color={["#7B4FE8", "#00D4FF", "#00E5A0"][i]} label={d.column.length > 10 ? d.column.slice(0, 8) + "…" : d.column} />
            ))}
          </div>
        </ChartWithTable>
      </div>
      <div className="metric-card green">
        <div style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase" }}>Filtered Rows</div>
        <div className="stat-number">{processedData.length.toLocaleString()} <span style={{ fontSize: "12px", color: "#8892b0", fontWeight: "400" }}>/ {ds.data.length.toLocaleString()}</span></div>
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {ds.columns.slice(0, 4).map((c) => <span key={c} className="data-pill" style={{ fontSize: "12px" }}>{c}</span>)}
          {ds.columns.length > 4 && <span className="data-pill" style={{ fontSize: "12px" }}>+{ds.columns.length - 4}</span>}
        </div>
      </div>
    </div>
  );
}
