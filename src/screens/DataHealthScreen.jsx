import { useMemo } from "react";
import HeatmapChart from "../charts/HeatmapChart.jsx";
import AnomalyScatterChart from "../charts/AnomalyScatterChart.jsx";
import KeyNudge from "../components/KeyNudge.jsx";
import RichText from "../components/RichText.jsx";
import ColumnCards from "../components/ColumnCards.jsx";
import ChartWithTable from "../components/ChartWithTable.jsx";
import { computeHealth } from "../engine/dataHealth.js";
import { isNumber } from "../lib/stats.js";

// One Data health screen (F15): the overall score with every lost
// point listed in plain words, one card per column, and the
// correlation / unusual-value charts below.
export default function DataHealthScreen({ ds, setPage, labAnalysis, labLoading, runDeepDive }) {
  const health = useMemo(() => (ds ? computeHealth(ds) : null), [ds]);
  const scoreColor = health ? (health.score >= 80 ? "#00E5A0" : health.score >= 50 ? "#FFB627" : "#FF3C3C") : "#8892b0";

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Data health</h2>
          <p style={{ color: "#8892b0", fontSize: "13px" }}>One score, every lost point explained — plus a profile of each column and the statistical deep dive.</p>
        </div>
        <button className="btn-primary" onClick={runDeepDive} disabled={labLoading || !ds}>
          {labLoading ? "Analyzing..." : "Run Deep Dive"}
        </button>
      </div>

      {!ds && <div style={{ color: "#FFB627", fontSize: "13px", marginBottom: "16px" }}>⚠ Select a dataset from the sidebar first</div>}

      {health && (
        <div className="glass-card" style={{ padding: "24px", marginBottom: "20px", display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center", minWidth: "120px" }}>
            <div className="stat-number" style={{ fontSize: "44px", color: scoreColor, WebkitTextFillColor: scoreColor }}>{health.score}</div>
            <div style={{ fontSize: "12px", color: "#8892b0", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>Health score</div>
          </div>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={{ fontSize: "12px", color: "#8892b0", marginBottom: "8px" }}>Built from four checks: empty cells, repeated rows, mixed types and unusual values.</div>
            {health.deductions.length === 0 ? (
              <div style={{ fontSize: "13px", color: "#00E5A0" }}>No points lost — this file passes all four checks.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#ccd6f6", fontSize: "13px", lineHeight: 1.8 }}>
                {health.deductions.map((d, i) => (
                  <li key={i}><span style={{ color: "#FFB627", fontFamily: "'DM Mono', monospace" }}>−{d.points}</span>: {d.text}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {ds && (
        <div style={{ marginBottom: "20px" }}>
          <ColumnCards ds={ds} />
        </div>
      )}

      {labAnalysis && !labAnalysis.error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>Correlation Matrix</h3>
            <p style={{ fontSize: "12px", color: "#8892b0", marginBottom: "20px" }}>Identifies how strongly numeric columns are related to each other. <span style={{ color: "rgba(0, 212, 255, 1)" }}>Blue = Positive</span>, <span style={{ color: "rgba(255, 60, 60, 1)" }}>Red = Negative</span></p>
            <div style={{ overflowX: "auto", paddingBottom: "20px" }}>
              <ChartWithTable
                label={`Correlation heatmap of ${labAnalysis.columns.length} numeric columns`}
                columns={["", ...labAnalysis.columns]}
                rows={labAnalysis.matrix.map((row, i) => [labAnalysis.columns[i], ...row.map((v) => Math.round(v * 100) / 100)])}
                maxHeight={240}
              >
                <HeatmapChart matrix={labAnalysis.matrix} columns={labAnalysis.columns} />
              </ChartWithTable>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>Anomaly Detection</h3>
            <p style={{ fontSize: "12px", color: "#8892b0", marginBottom: "20px" }}>Highlights top statistical outliers (Z-Score &gt; 2.8) across your dataset. Anomalies are shown in <span style={{ color: "#FF3C3C", fontWeight: "bold" }}>Red</span>.</p>
            <div>
              {labAnalysis.anomalies.length > 0 ? (() => {
                const metric = labAnalysis.anomalies[0].metric;
                const metricAnoms = labAnalysis.anomalies.filter(a => a.metric === metric);
                const normals = ds.data.filter(r => isNumber(r[metric])).length - metricAnoms.length;
                return (
                  <ChartWithTable
                    label={`Scatter of ${metric} with ${metricAnoms.length} unusual value${metricAnoms.length === 1 ? "" : "s"} highlighted among ${normals} normal points`}
                    columns={["Row", metric]}
                    rows={metricAnoms.map(a => [(a.rowIdx ?? a.index) + 1, ds.data[a.rowIdx ?? a.index]?.[metric] ?? null])}
                    maxHeight={200}
                  >
                    <div style={{ height: "200px" }}>
                      <AnomalyScatterChart data={ds.data} metric={metric} anomalies={metricAnoms} />
                    </div>
                  </ChartWithTable>
                );
              })() : (
                <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8892b0", fontSize: "12px" }}>No extreme anomalies detected.</div>
              )}
            </div>
            {labAnalysis.anomalies.length > 0 && (
              <div style={{ marginTop: "12px", fontSize: "12px", color: "#ccd6f6" }}>
                Currently viewing anomalous metric: <span className="data-pill">{labAnalysis.anomalies[0].metric}</span>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <span className="badge badge-violet">AI INTERPRETATION</span>
              <span style={{ fontSize: "12px", color: "#8892b0", fontFamily: "'DM Mono', monospace" }}>Powered by Groq</span>
            </div>
            {labAnalysis.analysisText
              ? <div className="narrative-box" style={{ borderRadius: "12px", borderLeft: "3px solid #7B4FE8" }}><RichText text={labAnalysis.analysisText} /></div>
              : <KeyNudge setPage={setPage} />}
          </div>
        </div>
      )}

      {labAnalysis?.error && (
        <div style={{ padding: "20px", background: "#ff444411", color: "#ff4444", border: "1px solid #ff444444", borderRadius: "12px" }}>
          <strong>Analysis Failed:</strong> {labAnalysis.error}. Make sure your Groq API key is valid.
        </div>
      )}
    </div>
  );
}
