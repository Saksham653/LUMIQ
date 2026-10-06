import MiniLineChart from "../charts/MiniLineChart.jsx";
import MiniBarChart from "../charts/MiniBarChart.jsx";
import DonutChart from "../charts/DonutChart.jsx";
import { formatTileValue } from "../data/columnTypes.js";
import { mean as meanValues, max as maxValues } from "../lib/stats.js";

// The four Overview tiles. They follow the metric picked in the
// chart dropdown (F9) and its aggregation rule; blank cells stay
// blank in every figure.
export default function MetricTiles({ ds, processedData, metric, metricRule, headlineVal, avgVal, medianVal, maxVal, numericCols }) {
  return (
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
  );
}
