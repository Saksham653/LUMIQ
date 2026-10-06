import { useMemo, useState } from "react";
import { computeWhatIf, describeWhatIf } from "../engine/whatIf.js";
import { numericColumns } from "../data/dataset.js";
import { formatCell } from "../data/columnTypes.js";
import { callGroq } from "../ai/client.js";
import { collectCandidates, verifyNumbers } from "../ai/numberCheck.js";
import RichText from "../components/RichText.jsx";
import KeyNudge from "../components/KeyNudge.jsx";

// What-if is a calculator (F14): the engine recalculates before and
// after on all rows. It works with no key; a key only buys a short
// AI wording of the finished table, checked by the number checker.
export default function WhatIfScreen({ ds, apiKey, setPage }) {
  const numericCols = numericColumns(ds || { columns: [] });
  const textCols = (ds?.columns || []).filter((c) => (ds.columnTypes?.[c]?.type || "text") === "text");
  const [measure, setMeasure] = useState("");
  const [changeText, setChangeText] = useState("+10");
  const [groupColumn, setGroupColumn] = useState("");
  const [groupValue, setGroupValue] = useState("");
  const [result, setResult] = useState(null);
  const [explain, setExplain] = useState(null); // { text, candidates, unverified } | { error }
  const [explaining, setExplaining] = useState(false);

  const activeMeasure = measure || numericCols[0] || "";
  const groupValues = useMemo(() => {
    if (!ds || !groupColumn) return [];
    return [...new Set(ds.data.map((r) => r?.[groupColumn]).filter((v) => v != null && v !== ""))].map(String);
  }, [ds, groupColumn]);
  const typeInfo = ds?.columnTypes?.[activeMeasure];

  const run = () => {
    const changePct = parseFloat(changeText);
    if (!ds || !activeMeasure || !Number.isFinite(changePct)) return;
    const params = { measure: activeMeasure, changePct, groupColumn: groupColumn || undefined, groupValue: groupValue || undefined };
    setExplain(null);
    setResult({ params, ...computeWhatIf(ds, params) });
  };

  const explainIt = async () => {
    if (!result || explaining || !apiKey || apiKey === "demo") return;
    setExplaining(true);
    setExplain(null);
    const table = [...result.rows, result.total];
    try {
      // Only the finished before/after table leaves the browser.
      const prompt = `A what-if change was calculated in the browser: ${describeWhatIf(result.params)} (the ${result.rule === "avg" ? "average" : "total"} of ${result.params.measure}).\nBefore/after table (JSON): ${JSON.stringify(table)}\n\nExplain the change in 2-3 plain sentences using ONLY numbers from the table (you may round). No markdown headings.`;
      const text = await callGroq(apiKey, [{ role: "user", content: prompt }], null);
      const candidates = collectCandidates(table, [result.params.changePct]);
      setExplain({ text, candidates, unverified: verifyNumbers(text, candidates).unverified });
    } catch (e) {
      setExplain({ error: e.message });
    }
    setExplaining(false);
  };

  const cell = (v) => (v == null ? "—" : formatCell(Math.round((v + Number.EPSILON) * 100) / 100, typeInfo));

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>What-if</h2>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>A calculator, not a guess: pick a measure and a change, and the browser recalculates every row. No key needed.</p>
      </div>
      {!ds ? (
        <div style={{ color: "#FFB627", fontSize: "13px" }}>⚠ Select a dataset from the sidebar first</div>
      ) : (
        <>
          <div className="glass-card" style={{ padding: "24px", marginBottom: "20px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ fontSize: "12px", color: "#8892b0", display: "flex", flexDirection: "column", gap: "6px" }}>
              Measure
              <select value={activeMeasure} onChange={(e) => setMeasure(e.target.value)}>{numericCols.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </label>
            <label style={{ fontSize: "12px", color: "#8892b0", display: "flex", flexDirection: "column", gap: "6px" }}>
              Change (%)
              <input type="text" value={changeText} onChange={(e) => setChangeText(e.target.value)} style={{ width: "90px", padding: "8px 12px" }} placeholder="+10" />
            </label>
            <label style={{ fontSize: "12px", color: "#8892b0", display: "flex", flexDirection: "column", gap: "6px" }}>
              Only in (optional)
              <select value={groupColumn} onChange={(e) => { setGroupColumn(e.target.value); setGroupValue(""); }}>
                <option value="">whole dataset</option>
                {textCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {groupColumn && (
              <label style={{ fontSize: "12px", color: "#8892b0", display: "flex", flexDirection: "column", gap: "6px" }}>
                Value
                <select value={groupValue} onChange={(e) => setGroupValue(e.target.value)}>
                  <option value="">pick…</option>
                  {groupValues.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            )}
            <button className="btn-primary" onClick={run} disabled={!Number.isFinite(parseFloat(changeText)) || !activeMeasure || (!!groupColumn && !groupValue)}>Apply change</button>
          </div>

          {result && (
            <div className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                <span className="badge badge-cyan">WHAT-IF</span>
                <span style={{ fontSize: "12px", color: "#8892b0" }}>{describeWhatIf(result.params)} · {result.rule === "avg" ? "averages" : "totals"} recalculated on all rows</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>{[result.params.groupColumn || "Scope", "Before", "After", "Change"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 12px", color: "#8892b0", fontFamily: "'DM Mono', monospace", fontSize: "12px", textTransform: "uppercase", borderBottom: "1px solid #1e2d5c" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[...result.rows, result.total].map((r) => (
                    <tr key={r.group} style={{ borderBottom: "1px solid #1e2d5c33", fontWeight: r.group === "Total" ? 700 : 400 }}>
                      <td style={{ padding: "6px 12px", color: "#ccd6f6" }}>{r.group}</td>
                      <td style={{ padding: "6px 12px", color: "#ccd6f6", fontFamily: "'DM Mono', monospace" }}>{cell(r.before)}</td>
                      <td style={{ padding: "6px 12px", color: "#00D4FF", fontFamily: "'DM Mono', monospace" }}>{cell(r.after)}</td>
                      <td style={{ padding: "6px 12px", color: r.diff >= 0 ? "#00E5A0" : "#FFB627", fontFamily: "'DM Mono', monospace" }}>{r.diff >= 0 ? "+" : ""}{cell(r.diff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: "14px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                {apiKey && apiKey !== "demo"
                  ? <button className="btn-ghost" onClick={explainIt} disabled={explaining}>{explaining ? "Explaining…" : "Explain this"}</button>
                  : <KeyNudge setPage={setPage} />}
              </div>
              {explain?.error && <div style={{ color: "#FF3C3C", fontSize: "12px", marginTop: "10px" }}>{explain.error}</div>}
              {explain?.text && (
                <div className="narrative-box" style={{ marginTop: "12px" }}>
                  <RichText text={explain.text} candidates={explain.candidates} />
                  {explain.unverified > 0 && <div style={{ fontSize: "12px", color: "#FFB627", marginTop: "6px" }}>⚠ {explain.unverified} number{explain.unverified === 1 ? "" : "s"} could not be matched to the table</div>}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
