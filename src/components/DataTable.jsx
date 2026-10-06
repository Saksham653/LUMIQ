import { formatCell } from "../data/columnTypes.js";
import { downloadCsv } from "../lib/exportData.js";
import WindowedRows from "./WindowedRows.jsx";

const ROW_HEIGHT = 33;

// The Interactive Data Explorer: sortable, searchable, windowed —
// only the rows near the viewport exist in the DOM (F13), so even
// 100,000 rows scroll without freezing.
export default function DataTable({ ds, processedData, sortConfig, handleSort, searchQuery, setSearchQuery }) {
  const headerCell = (col) => (
    <th key={col} style={{ position: "sticky", top: 0, zIndex: 1, background: "#0b1126", padding: "0", borderBottom: "1px solid #1e2d5c" }}>
      <button
        onClick={() => handleSort(col)}
        aria-label={`Sort by ${col}`}
        style={{ width: "100%", padding: "8px 12px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#8892b0", textTransform: "uppercase", whiteSpace: "nowrap", cursor: "pointer", background: "none", border: "none" }}
      >
        {col}
        {sortConfig?.key === col && (
          <span style={{ marginLeft: "4px", color: "#00D4FF" }}>
            {sortConfig.dir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );

  return (
    <div className="glass-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700 }}>Interactive Data Explorer</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-ghost" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => downloadCsv(`${ds.name}-filtered.csv`, ds.columns, processedData)}>⬇ Download filtered data (CSV)</button>
          <input
            type="text"
            placeholder="Search dataset..."
            aria-label="Search dataset"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "12px", width: "200px" }}
          />
        </div>
      </div>
      <WindowedRows
        count={processedData.length}
        rowHeight={ROW_HEIGHT}
        height={420}
        renderTable={({ start, end, topPad, bottomPad }) => (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>{ds.columns.map(headerCell)}</tr>
            </thead>
            <tbody>
              {topPad > 0 && (
                <tr aria-hidden="true" style={{ height: `${topPad}px` }}>
                  <td colSpan={ds.columns.length} style={{ padding: 0, border: 0 }} />
                </tr>
              )}
              {processedData.length > 0 ? processedData.slice(start, end).map((row, i) => (
                <tr key={start + i} style={{ height: `${ROW_HEIGHT}px`, borderBottom: "1px solid #1e2d5c11" }}>
                  {ds.columns.map((col) => (
                    <td key={col} style={{ padding: "0 12px", color: typeof row[col] === "number" ? "#00D4FF" : "#ccd6f6", fontFamily: typeof row[col] === "number" ? "'DM Mono', monospace" : "inherit", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {formatCell(row[col], ds.columnTypes?.[col])}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={ds.columns.length} style={{ textAlign: "center", padding: "40px", color: "#8892b0" }}>
                    No results found for "{searchQuery}"
                  </td>
                </tr>
              )}
              {bottomPad > 0 && (
                <tr aria-hidden="true" style={{ height: `${bottomPad}px` }}>
                  <td colSpan={ds.columns.length} style={{ padding: 0, border: 0 }} />
                </tr>
              )}
            </tbody>
          </table>
        )}
      />
      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #1e2d5c33", fontSize: "12px", color: "#8892b0" }}>
        Showing {processedData.length.toLocaleString()} of {ds.data.length.toLocaleString()} rows — scroll the table to see more
      </div>
    </div>
  );
}
