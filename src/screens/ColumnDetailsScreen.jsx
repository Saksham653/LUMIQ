import { Fragment } from "react";
import { profileColumn } from "../lib/analysis.js";
import { fmtNum } from "../lib/format.js";

export default function ColumnDetailsScreen({ ds }) {
  return (
    <div style={{ animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          🧬 Column details
          <span className="badge badge-green" style={{ fontSize: "10px" }}>Column Profiler</span>
        </h2>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>Deep statistical X-ray of every column in your dataset.</p>
      </div>

      {!ds ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧬</div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", marginBottom: "10px" }}>Select a Dataset</h3>
          <p style={{ color: "#8892b0", fontSize: "14px" }}>Choose a dataset from the sidebar to see its column details</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {ds.columns.map((colName) => {
            const p = profileColumn(ds.data, colName, ds.columnTypes?.[colName]);
            const qualityColor = p.qualityScore >= 80 ? "#00E5A0" : p.qualityScore >= 50 ? "#FFB627" : "#FF3C3C";
            const qualityPct = p.qualityScore / 100;
            const r = 22; const circ = 2 * Math.PI * r;
            const histMax = p.histogram ? Math.max(...p.histogram, 1) : 1;

            return (
              <div key={colName} className="glass-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{colName}</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span className={`badge ${p.type === "Numeric" ? "badge-cyan" : "badge-violet"}`} style={{ fontSize: "9px" }}>{p.type}</span>
                      <span className="badge" style={{ fontSize: "9px", background: "#1a2244", color: "#8892b0" }}>{p.uniqueCount} unique</span>
                    </div>
                  </div>
                  {/* Quality Score Donut */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r={r} fill="none" stroke="#1a2244" strokeWidth="5" />
                      <circle cx="26" cy="26" r={r} fill="none" stroke={qualityColor} strokeWidth="5"
                        strokeDasharray={circ} strokeDashoffset={circ * (1 - qualityPct)}
                        strokeLinecap="round" transform="rotate(-90 26 26)" style={{ transition: "stroke-dashoffset 1s ease" }} />
                      <text x="26" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{p.qualityScore}</text>
                    </svg>
                    <span style={{ fontSize: "8px", color: "#8892b0", marginTop: "2px" }}>Quality</span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px", fontSize: "11px" }}>
                  <div style={{ color: "#8892b0" }}>Completeness</div>
                  <div style={{ color: "#ccd6f6", textAlign: "right" }}>{p.completeness}%</div>
                  <div style={{ color: "#8892b0" }}>Non-null</div>
                  <div style={{ color: "#ccd6f6", textAlign: "right" }}>{p.nonNull.toLocaleString()} / {p.total.toLocaleString()}</div>
                  {p.type === "Numeric" && (
                    <>
                      <div style={{ color: "#8892b0" }}>Min / Max</div>
                      <div style={{ color: "#ccd6f6", textAlign: "right" }}>{fmtNum(p.min)} — {fmtNum(p.max)}</div>
                      <div style={{ color: "#8892b0" }}>Mean</div>
                      <div style={{ color: "#00D4FF", textAlign: "right", fontWeight: 600 }}>{fmtNum(p.mean)}</div>
                      <div style={{ color: "#8892b0" }}>Median</div>
                      <div style={{ color: "#ccd6f6", textAlign: "right" }}>{fmtNum(p.median)}</div>
                      <div style={{ color: "#8892b0" }}>Std Dev</div>
                      <div style={{ color: "#ccd6f6", textAlign: "right" }}>{fmtNum(p.stdDev)}</div>
                    </>
                  )}
                  {p.type === "Categorical" && p.topValues && (
                    <>
                      <div style={{ color: "#8892b0", gridColumn: "1 / -1", marginTop: "4px", fontWeight: 600 }}>Top Values</div>
                      {p.topValues.map((tv) => (
                        <Fragment key={tv.val}>
                          <div style={{ color: "#ccd6f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tv.val}</div>
                          <div style={{ color: "#7B4FE8", textAlign: "right" }}>{tv.count} ({tv.pct}%)</div>
                        </Fragment>
                      ))}
                    </>
                  )}
                </div>

                {/* Histogram */}
                {p.histogram && p.histogram.length > 0 && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "40px", borderTop: "1px solid #1e2d5c", paddingTop: "8px" }}>
                    {p.histogram.map((count, i) => {
                      const barH = (count / histMax) * 30;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "30px" }}>
                          <div style={{ width: "100%", height: `${Math.max(barH, 1)}px`, background: `linear-gradient(to top, ${p.type === "Numeric" ? "#00D4FF88" : "#7B4FE888"}, ${p.type === "Numeric" ? "#00D4FF" : "#7B4FE8"})`, borderRadius: "2px 2px 0 0", transition: "height 0.3s ease" }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
