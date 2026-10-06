import { formatCell } from "../data/columnTypes.js";
import { downloadCsv } from "../lib/exportData.js";

// The Interactive Data Explorer: sortable, searchable, paginated.
export default function DataTable({ ds, processedData, paginatedData, sortConfig, handleSort, searchQuery, setSearchQuery, pageIdx, setPageIdx, totalPages, rowsPerPage }) {
  return (
    <div className="glass-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 700 }}>Interactive Data Explorer</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-ghost" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => downloadCsv(`${ds.name}-filtered.csv`, ds.columns, processedData)}>⬇ Download filtered data (CSV)</button>
          <input
            type="text"
            placeholder="Search dataset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "12px", width: "200px" }}
          />
        </div>
      </div>
      <div style={{ overflowX: "auto", minHeight: "300px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr>
              {ds.columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  style={{ padding: "8px 12px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#8892b0", borderBottom: "1px solid #1e2d5c", textTransform: "uppercase", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
                >
                  {col}
                  {sortConfig?.key === col && (
                    <span style={{ marginLeft: "4px", color: "#00D4FF" }}>
                      {sortConfig.dir === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? paginatedData.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e2d5c11" }}>
                {ds.columns.map((col) => (
                  <td key={col} style={{ padding: "8px 12px", color: typeof row[col] === "number" ? "#00D4FF" : "#ccd6f6", fontFamily: typeof row[col] === "number" ? "'DM Mono', monospace" : "inherit", fontSize: "12px", whiteSpace: "nowrap" }}>
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
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #1e2d5c33" }}>
        <div style={{ fontSize: "11px", color: "#8892b0" }}>
          Showing {paginatedData.length > 0 ? pageIdx * rowsPerPage + 1 : 0} to {Math.min((pageIdx + 1) * rowsPerPage, processedData.length)} of {processedData.length} entries
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn-ghost"
            style={{ padding: "4px 12px", fontSize: "11px" }}
            disabled={pageIdx === 0}
            onClick={() => setPageIdx(p => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: "11px", color: "#ccd6f6", display: "flex", alignItems: "center" }}>
            Page {pageIdx + 1} of {Math.max(1, totalPages)}
          </span>
          <button
            className="btn-ghost"
            style={{ padding: "4px 12px", fontSize: "11px" }}
            disabled={pageIdx >= totalPages - 1}
            onClick={() => setPageIdx(p => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
