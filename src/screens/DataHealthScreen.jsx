import HeatmapChart from "../charts/HeatmapChart.jsx";
import AnomalyScatterChart from "../charts/AnomalyScatterChart.jsx";
import KeyNudge from "../components/KeyNudge.jsx";

export default function DataHealthScreen({ ds, setPage, labAnalysis, labLoading, runDeepDive }) {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Data health</h2>
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
            {labAnalysis.analysisText
              ? <div className="narrative-box" style={{ borderRadius: "12px", borderLeft: "3px solid #7B4FE8" }}>{labAnalysis.analysisText}</div>
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
