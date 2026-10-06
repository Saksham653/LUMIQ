import { useMemo } from "react";
import { COLUMN_TYPE_CHOICES, overrideColumnType, previewWarnings } from "../data/uploadPreview.js";

// The pre-load check for an uploaded file: name, counts, the first
// 10 rows, each column's detected type with a dropdown to change it,
// plain warnings, and Load / Cancel.
export default function UploadPreview({ preview, types, setTypes, onLoad, onCancel }) {
  const warnings = useMemo(() => previewWarnings(preview, types), [preview, types]);
  const sample = preview.rows.slice(0, 10);

  return (
    <div className="glass-card" style={{ padding: "20px", marginBottom: "24px", borderLeft: "3px solid #00D4FF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "20px" }}>📄</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "15px" }}>{preview.name}</span>
        <span className="data-pill">{preview.rowCount} rows · {preview.columns.length} columns</span>
      </div>
      <p style={{ color: "#8892b0", fontSize: "12px", marginBottom: "12px" }}>Check the detected column types below — nothing is loaded yet.</p>

      {warnings.length > 0 && (
        <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#FFB627" }}>⚠ {w.text}</div>
          ))}
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid #1e2d5c", borderRadius: "8px", marginBottom: "14px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              {preview.columns.map((col) => (
                <th key={col} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #1e2d5c", whiteSpace: "nowrap", verticalAlign: "top" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#8892b0", textTransform: "uppercase", marginBottom: "6px" }}>{col}</div>
                  <select
                    aria-label={`Type of ${col}`}
                    value={types[col]?.type || "text"}
                    onChange={(e) => setTypes(overrideColumnType(types, col, e.target.value))}
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                  >
                    {COLUMN_TYPE_CHOICES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.map((row, r) => (
              <tr key={r} style={{ borderBottom: "1px solid #1e2d5c11" }}>
                {preview.columns.map((col) => (
                  <td key={col} style={{ padding: "6px 12px", color: "#ccd6f6", whiteSpace: "nowrap", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row?.[col] == null ? "" : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.rowCount > 10 && <p style={{ fontSize: "12px", color: "#8892b0", marginBottom: "12px" }}>Showing the first 10 of {preview.rowCount} rows.</p>}

      <div style={{ display: "flex", gap: "10px" }}>
        <button className="btn-primary" onClick={onLoad}>Load</button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
