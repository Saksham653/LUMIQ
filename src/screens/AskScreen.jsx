import KeyNudge from "../components/KeyNudge.jsx";
import ShowTheWork from "../components/ShowTheWork.jsx";
import { exampleQuestions } from "../ai/oraclePlanner.js";

export default function AskScreen({ ds, apiKey, setPage, oracleMessages, oracleInput, setOracleInput, oracleLoading, sendOracleMessage, oracleAbortRef, oracleLastFailed, chatEndRef }) {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeSlide 0.3s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #00D4FF1a, #7B4FE81a)", border: "1px solid #00D4FF33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🔮</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 800 }}>Ask</h2>
          <span className="badge badge-violet">Groq · Llama 3.3 70B</span>
          {(!apiKey || apiKey === "demo") && <span className="badge badge-gold">Demo Mode</span>}
        </div>
        <p style={{ color: "#8892b0", fontSize: "13px" }}>Ask questions about your data. Every number is calculated from all your rows.{!ds && <span style={{ color: "#FFB627" }}> Select a dataset first.</span>}</p>
      </div>
      <div style={{ background: "#050914", border: "1px solid #1e2d5c", borderRadius: "16px", height: "420px", overflow: "auto", padding: "20px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {oracleMessages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "#3d4f7c" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔮</div>
            <p style={{ fontSize: "14px" }}>Oracle is ready. Ask your first question.</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "16px" }}>
              {(ds ? exampleQuestions(ds) : []).map((q) => (
                <button key={q} className="btn-ghost" style={{ fontSize: "11px", padding: "6px 12px" }} onClick={() => setOracleInput(q)}>{q}</button>
              ))}
            </div>
          </div>
        ) : oracleMessages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "10px", fontFamily: "'DM Mono', monospace", color: "#3d4f7c", marginBottom: "4px", textAlign: msg.role === "user" ? "right" : "left" }}>{msg.role === "user" ? "YOU" : "ORACLE"}</div>
            <div className={msg.role === "user" ? "chat-bubble-user" : `chat-bubble-oracle ${msg.streaming ? "streaming-cursor" : ""}`}>
              {msg.segments
                ? msg.segments.map((s, j) =>
                  s.number !== undefined && !s.verified ? (
                    <span key={j} title="Not verified — this number does not match the calculation" style={{ color: "#FFB627", borderBottom: "1px dashed #FFB627" }}>{s.text}<sup style={{ fontSize: "9px" }}>?</sup></span>
                  ) : (
                    <span key={j}>{s.text}</span>
                  )
                )
                : (msg.content || (msg.streaming ? "" : "..."))}
            </div>
            {msg.unverified > 0 && !msg.streaming && (
              <div style={{ fontSize: "10px", color: "#FFB627" }}>⚠ {msg.unverified} number{msg.unverified === 1 ? "" : "s"} marked <sup>?</sup> could not be matched to the calculation</div>
            )}
            {msg.proof && !msg.streaming && <ShowTheWork proof={msg.proof} />}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <textarea className="oracle-input" value={oracleInput} onChange={(e) => setOracleInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendOracleMessage(); } }} placeholder="Ask Oracle anything about your data..." rows={2} style={{ flex: 1 }} disabled={oracleLoading} />
        {oracleLoading && apiKey && apiKey !== "demo" && (
          <button className="btn-ghost" onClick={() => oracleAbortRef.current?.abort()} style={{ alignSelf: "flex-end", padding: "14px 16px" }}>⏹ Stop</button>
        )}
        <button className="btn-primary" onClick={() => sendOracleMessage()} disabled={oracleLoading || !oracleInput.trim()} style={{ alignSelf: "flex-end", padding: "14px 20px" }}>{oracleLoading ? "..." : "→"}</button>
      </div>
      {oracleLastFailed && !oracleLoading && (
        <div style={{ marginTop: "10px" }}>
          <button className="btn-ghost" style={{ fontSize: "12px" }} onClick={() => sendOracleMessage(oracleLastFailed)}>↻ Retry last question</button>
        </div>
      )}
      <p style={{ fontSize: "11px", color: "#3d4f7c", marginTop: "8px" }}>Each question is answered on its own. Include the full detail, for example "revenue by region for 2026".</p>
      {(!apiKey || apiKey === "demo") && (
        <div style={{ marginTop: "12px" }}>
          <KeyNudge setPage={setPage} />
        </div>
      )}
    </div>
  );
}
