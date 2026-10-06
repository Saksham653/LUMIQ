import KeyNudge from "./KeyNudge.jsx";

// The AI Data Filter bar on the Overview.
export default function FilterBar({ apiKey, setPage, nlFilterQuery, setNlFilterQuery, nlFilterLoading, nlFilterError, activeNlFilter, applyNlFilter, clearNlFilter }) {
  return (
    <div className="glass-card" style={{ padding: "16px 24px", marginBottom: "24px", borderLeft: "3px solid #7B4FE8" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ fontSize: "20px", marginTop: "2px" }}>💬</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            AI Data Filter
            <span className="badge badge-violet" style={{ fontSize: "12px" }}>Groq Powered</span>
          </h3>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              className="oracle-input"
              style={{ flex: 1, padding: "10px 14px", fontSize: "13px" }}
              aria-label="AI data filter request" placeholder="e.g., 'Show me rows where Revenue is over 1000 and the month is November'"
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
            <div style={{ marginTop: "12px", padding: "10px", background: "#050914", borderRadius: "8px", border: "1px solid #1e2d5c", fontSize: "12px" }}>
              <div style={{ color: "#00E5A0", marginBottom: "4px" }}>✓ Filter Applied: "{activeNlFilter.query}"</div>
              <div style={{ color: "#8892b0" }}>
                <span style={{ color: "#a78bfa" }}>Showing rows where:</span> {activeNlFilter.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
