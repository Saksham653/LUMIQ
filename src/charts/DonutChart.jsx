export default function DonutChart({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 28; const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1a2244" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{(pct * 100).toFixed(0)}%</text>
      </svg>
      <span style={{ fontSize: "12px", color: "#8892b0", textAlign: "center" }}>{label}</span>
    </div>
  );
}
