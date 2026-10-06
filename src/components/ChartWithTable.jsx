import { useState } from "react";

// Accessibility wrapper for every chart (B7-3): a real "View as
// table" toggle, and a text description of the figure for screen
// readers. The table is the same data the chart draws.
const MAX_TABLE_ROWS = 1000;

export default function ChartWithTable({ label, columns, rows, maxHeight = 200, children }) {
  const [asTable, setAsTable] = useState(false);
  const shown = rows.length > MAX_TABLE_ROWS ? rows.slice(0, MAX_TABLE_ROWS) : rows;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
        <button
          className="btn-ghost"
          style={{ fontSize: "12px", padding: "3px 10px" }}
          aria-pressed={asTable}
          onClick={() => setAsTable(!asTable)}
        >
          {asTable ? "📈 View as chart" : "⊞ View as table"}
        </button>
      </div>
      {asTable ? (
        <div style={{ maxHeight: `${maxHeight}px`, overflow: "auto", border: "1px solid #1e2d5c", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <caption style={{ textAlign: "left", padding: "6px 10px", color: "#8892b0", fontSize: "12px" }}>{label}</caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col" style={{ position: "sticky", top: 0, background: "#0b1126", textAlign: "left", padding: "6px 10px", color: "#8892b0", fontFamily: "'DM Mono', monospace", fontSize: "12px", borderBottom: "1px solid #1e2d5c", whiteSpace: "nowrap" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e2d5c33" }}>
                  {r.map((cell, j) => (
                    <td key={j} style={{ padding: "5px 10px", color: typeof cell === "number" ? "#00D4FF" : "#ccd6f6", fontFamily: typeof cell === "number" ? "'DM Mono', monospace" : "inherit", whiteSpace: "nowrap" }}>
                      {cell === null || cell === undefined ? "—" : typeof cell === "number" ? cell.toLocaleString() : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length > MAX_TABLE_ROWS && (
                <tr>
                  <td colSpan={columns.length} style={{ padding: "6px 10px", color: "#8892b0" }}>
                    … and {(rows.length - MAX_TABLE_ROWS).toLocaleString()} more rows — the data table below or the CSV download has them all
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={label}>{children}</div>
      )}
    </div>
  );
}
