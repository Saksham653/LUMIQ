import { numericValues } from "../lib/stats.js";
import { downsample } from "../lib/analysis.js";

export default function MiniLineChart({ data, yKey, color = "#FFB627" }) {
  // Rows with a blank value are skipped, not drawn as zeros
  const raw = numericValues(data.map((d) => d[yKey]));
  const vals = downsample(raw, 40);
  if (vals.length === 0) return <div style={{ height: "60px" }} />;
  const max = Math.max(...vals); const min = Math.min(...vals); const range = max - min || 1;
  const w = 200; const h = 60;
  const points = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * w},${h - ((v - min) / range) * (h - 12) - 6}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "60px" }}>
      <defs>
        <linearGradient id={`mini-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={areaPoints} fill={`url(#mini-grad-${color.replace('#', '')})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
