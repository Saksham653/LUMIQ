import KeyNudge from "../components/KeyNudge.jsx";

export default function WhatIfScreen({ ds, apiKey, setPage, scenarios, setScenarios, scenarioInput, setScenarioInput, scenarioLoading, runScenario }) {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>What-if</h2>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>Ask any question about your data, or describe a what-if scenario. Oracle reasons from your dataset summary — it does not invent probabilities.</p>
      </div>
      <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#8892b0", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Your Question or Hypothesis</label>
        <textarea className="oracle-input" style={{ width: "100%", marginBottom: "14px" }} rows={3} placeholder='e.g. "What is this dataset about?" or "What if loan defaults increase 20%?" or "Which metric best predicts churn?"' value={scenarioInput} onChange={(e) => setScenarioInput(e.target.value)} disabled={scenarioLoading} />
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={runScenario} disabled={scenarioLoading || !scenarioInput.trim() || !ds || !apiKey || apiKey === "demo"}>{scenarioLoading ? "Analyzing..." : "Run Analysis"}</button>
          {!ds && <span style={{ color: "#FFB627", fontSize: "12px" }}>Select a dataset first</span>}
          {(!apiKey || apiKey === "demo") && <KeyNudge setPage={setPage} />}
        </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color }}>{s.label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "20px", fontWeight: 500, color }}>{s.impact}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#ccd6f6", lineHeight: 1.6, marginBottom: "8px" }}>{s.description}</p>
                <div style={{ fontSize: "11px", color: "#8892b0" }}><span style={{ color: "#3d4f7c" }}>Key driver: </span>{s.key_driver}</div>
              </div>
            );
          })}
          <button className="btn-ghost" style={{ marginTop: "16px" }} onClick={() => setScenarios([])}>Clear</button>
        </div>
      )}
    </div>
  );
}
