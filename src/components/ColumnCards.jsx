import { Fragment } from "react";
import { profileColumn } from "../lib/analysis.js";
import { fmtNum } from "../lib/format.js";

// One card per column: type, completeness, stats and a small
// histogram. The per-column quality donut is gone — the overall
// Data health score above explains every lost point instead.
export default function ColumnCards({ ds }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
      {ds.columns.map((colName) => {
        const p = profileColumn(ds.data, colName, ds.columnTypes?.[colName]);
        const histMax = p.histogram ? Math.max(...p.histogram, 1) : 1;

        return (
          <div key={colName} className="glass-card" style={{ padding: "20px" }}>
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>{colName}</div>
              <div style={{ display: "flex", gap: "6px" }}>
                <span className={`badge ${p.type === "Numeric" ? "badge-cyan" : "badge-violet"}`} style={{ fontSize: "12px" }}>{p.type}</span>
                <span className="badge" style={{ fontSize: "12px", background: "#1a2244", color: "#8892b0" }}>{p.uniqueCount} unique</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "12px", fontSize: "12px" }}>
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
                      <div style={{ color: "#a78bfa", textAlign: "right" }}>{tv.count} ({tv.pct}%)</div>
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
  );
}
