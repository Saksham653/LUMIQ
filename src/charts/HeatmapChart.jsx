export default function HeatmapChart({ matrix, columns }) {
  const n = columns.length;
  // Dynamic sizing based on number of columns
  const cellSize = Math.max(20, Math.min(40, 300 / n));
  const w = n * cellSize;
  const h = n * cellSize;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={w + 80} height={h + 80}>
        <g transform={`translate(80, 20)`}>
          {matrix.map((row, i) =>
            row.map((val, j) => {
              // Color mapping: Negative = Orange/Red, Positive = Cyan/Blue, 0 = Dark
              const intensity = Math.abs(val);
              const color = val > 0 ? `rgba(0, 212, 255, ${intensity})` : `rgba(255, 60, 60, ${intensity})`;
              return (
                <g key={`${i}-${j}`}>
                  <rect x={j * cellSize} y={i * cellSize} width={cellSize - 1} height={cellSize - 1} fill={color} stroke="#1e2d5c" strokeWidth="0.5" />
                  {n <= 8 && <text x={j * cellSize + cellSize / 2} y={i * cellSize + cellSize / 2 + 3} textAnchor="middle" fill={intensity > 0.5 ? "#000" : "#8892b0"} fontSize={cellSize * 0.3} fontFamily="DM Mono">{val.toFixed(2)}</text>}
                </g>
              );
            })
          )}
          {/* Labels */}
          {columns.map((c, i) => (
            <text key={`lx-${i}`} x={i * cellSize + cellSize / 2} y={h + 12} textAnchor="end" transform={`rotate(-45 ${i * cellSize + cellSize / 2} ${h + 12})`} fill="#8892b0" fontSize="10">{c.length > 10 ? c.slice(0, 8) + '..' : c}</text>
          ))}
          {columns.map((c, i) => (
            <text key={`ly-${i}`} x={-8} y={i * cellSize + cellSize / 2 + 3} textAnchor="end" fill="#8892b0" fontSize="10">{c.length > 10 ? c.slice(0, 8) + '..' : c}</text>
          ))}
        </g>
      </svg>
    </div>
  );
}
