import { useMemo } from "react";
import KeyNudge from "../components/KeyNudge.jsx";
import RichText from "../components/RichText.jsx";
import { buildReportData, reportCandidates } from "../engine/reportData.js";
import { formatTileValue } from "../data/columnTypes.js";
import { verifyNumbers } from "../ai/numberCheck.js";

// One printable page (F17): engine-computed headline numbers, each
// with a footnote saying how it was calculated, plus the AI summary
// when a key exists (checked by the number checker).
export default function ReportScreen({ ds, apiKey, setPage, narrativeText, narrativeLoading, generateNarrative, narrativeAbortRef }) {
  const report = useMemo(() => (ds ? buildReportData(ds) : null), [ds]);
  const candidates = useMemo(() => (report ? reportCandidates(report) : []), [report]);
  const summaryCheck = useMemo(
    () => (narrativeText && candidates.length ? verifyNumbers(narrativeText, candidates) : null),
    [narrativeText, candidates]
  );
  const hasKey = apiKey && apiKey !== "demo";

  return (
    <div className="report-page" style={{ maxWidth: "760px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>Report</h2>
          <p style={{ color: "#8892b0", fontSize: "13px" }}>One page. Every number is calculated by the engine and carries a footnote saying how.</p>
        </div>
        <button className="btn-ghost" onClick={() => window.print()} disabled={!ds}>🖨 Print or save as PDF</button>
      </div>

      {!ds ? (
        <div style={{ color: "#FFB627", fontSize: "13px" }}>⚠ Select a dataset from the sidebar first</div>
      ) : (
        <>
          <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <span className="badge badge-gold">REPORT</span>
              <span style={{ fontSize: "12px", color: "#8892b0", fontFamily: "'DM Mono', monospace" }}>{ds.name} · calculated in your browser</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
              {report.items.map((item, i) => (
                <div key={item.label}>
                  <div style={{ fontSize: "12px", color: "#8892b0", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{item.label}<sup style={{ color: "#00D4FF" }}> {i + 1}</sup></div>
                  <div className="stat-number" style={{ fontSize: "22px" }}>
                    {formatTileValue(item.value, item.typeInfo, item.label.startsWith("Average") ? "avg" : "sum")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>Summary</h3>
            {!hasKey && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "13px", color: "#8892b0" }}>No AI summary — the numbers and footnotes above are complete without one.</p>
                <KeyNudge setPage={setPage} />
              </div>
            )}
            {hasKey && (
              <>
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <button className="btn-primary" onClick={generateNarrative} disabled={narrativeLoading}>{narrativeLoading ? "Writing…" : narrativeText ? "Regenerate summary" : "Generate summary"}</button>
                  {narrativeLoading && <button className="btn-ghost" onClick={() => narrativeAbortRef.current?.abort()}>⏹ Stop</button>}
                </div>
                {narrativeText && (
                  <div className="narrative-box">
                    <RichText text={narrativeText} candidates={candidates} />
                    {narrativeLoading && <span style={{ animation: "blink 0.8s infinite", color: "#FFB627" }}>▋</span>}
                    {summaryCheck && summaryCheck.unverified > 0 && !narrativeLoading && (
                      <div style={{ fontSize: "12px", color: "#FFB627", marginTop: "8px" }}>⚠ {summaryCheck.unverified} number{summaryCheck.unverified === 1 ? "" : "s"} could not be matched to the calculations above</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>Footnotes — how each number was calculated</h3>
            <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#8892b0", lineHeight: 1.9 }}>
              {report.items.map((item) => (
                <li key={item.label}>{item.footnote}</li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
