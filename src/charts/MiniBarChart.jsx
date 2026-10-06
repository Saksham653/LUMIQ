import { numericValues } from "../lib/stats.js";
import { downsample } from "../lib/analysis.js";

export default function MiniBarChart({ data, xKey, yKey, color = "#00D4FF" }) {
  // Rows with a blank value are skipped, not drawn as zero bars
  const raw = numericValues(data.map((d) => d[yKey]));
  const vals = downsample(raw, 24);
  if (vals.length === 0) return <div style={{ height: "60px", padding: "4px 0" }} />;
  const max = Math.max(...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "60px", padding: "4px 0" }}>
      {vals.map((v, i) => {
        const h = ((v - min) / range) * 52;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "52px" }}>
            <div style={{ width: "100%", height: `${Math.max(h, 1)}px`, background: `linear-gradient(to top, ${color}88, ${color})`, borderRadius: "2px 2px 0 0", transition: "height 0.3s ease" }} />
          </div>
        );
      })}
    </div>
  );
}
