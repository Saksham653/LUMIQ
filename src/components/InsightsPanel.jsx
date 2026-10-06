// The Auto Insights column on the Overview.
export default function InsightsPanel({ insights }) {
  return (
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
  );
}
