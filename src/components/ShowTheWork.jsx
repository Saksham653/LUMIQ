// The proof under an Ask answer: collapsed "Show the work" (steps,
// result table, Based on N of M rows) and "What was sent" (the exact
// prompt text of every request behind the answer).
export default function ShowTheWork({ proof }) {
  return (
    <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: "4px" }}>
      <details style={{ background: "#0a1128", border: "1px solid #1e2d5c", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
        <summary style={{ cursor: "pointer", color: "#8892b0", fontSize: "11px" }}>Show the work</summary>
        <ol style={{ margin: "8px 0 0 18px", color: "#ccd6f6", lineHeight: 1.7, fontSize: "12px" }}>
          {proof.steps.map((s, j) => <li key={j}>{s}</li>)}
        </ol>
        {proof.table.length > 0 && (
          <div style={{ overflowX: "auto", maxHeight: "220px", overflowY: "auto", marginTop: "8px", border: "1px solid #1e2d5c", borderRadius: "6px" }}>
            <table style={{ borderCollapse: "collapse", fontSize: "11px", width: "100%" }}>
              <thead>
                <tr>{Object.keys(proof.table[0]).map((c) => (
                  <th key={c} style={{ textAlign: "left", padding: "4px 10px", color: "#8892b0", fontFamily: "'DM Mono', monospace", fontSize: "10px", borderBottom: "1px solid #1e2d5c", textTransform: "uppercase", whiteSpace: "nowrap" }}>{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {proof.table.map((row, r) => (
                  <tr key={r}>{Object.keys(proof.table[0]).map((c) => (
                    <td key={c} style={{ padding: "4px 10px", color: typeof row[c] === "number" ? "#00D4FF" : "#ccd6f6", fontFamily: typeof row[c] === "number" ? "'DM Mono', monospace" : "inherit", borderBottom: "1px solid #1e2d5c33", whiteSpace: "nowrap" }}>
                      {row[c] == null ? "—" : typeof row[c] === "number" ? row[c].toLocaleString() : String(row[c])}
                    </td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: "8px", fontSize: "10px", color: "#3d4f7c", fontFamily: "'DM Mono', monospace" }}>Based on {proof.rowsUsed} of {proof.totalRows} rows</div>
      </details>
      <details style={{ background: "#0a1128", border: "1px solid #1e2d5c", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
        <summary style={{ cursor: "pointer", color: "#8892b0", fontSize: "11px" }}>What was sent</summary>
        {proof.sent.map((s, j) => (
          <div key={j} style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "10px", color: "#7B4FE8", marginBottom: "4px", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{s.label}</div>
            <pre style={{ whiteSpace: "pre-wrap", background: "#050914", border: "1px solid #1e2d5c", borderRadius: "6px", padding: "8px", fontSize: "10px", color: "#8892b0", fontFamily: "'DM Mono', monospace", maxHeight: "180px", overflow: "auto", margin: 0 }}>{s.text}</pre>
          </div>
        ))}
      </details>
    </div>
  );
}
