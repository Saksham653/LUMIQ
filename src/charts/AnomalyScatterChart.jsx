import { numericValues, isNumber } from "../lib/stats.js";
import { fmtNum } from "../lib/format.js";

export default function AnomalyScatterChart({ data, metric, anomalies }) {
  // Blank cells are not plotted (and never plotted as 0); numeric
  // cells keep their original row index on the x-axis.
  const rawVals = data.map((d) => d[metric]);
  const numeric = numericValues(rawVals);
  if (numeric.length === 0) return <svg viewBox="0 0 400 200" style={{ width: "100%", height: "100%" }} />;
  const maxV = Math.max(...numeric); const minV = Math.min(...numeric); const range = maxV - minV || 1;
  const w = 400; const h = 200;
  const padL = 40; const padT = 20; const padB = 30; const padR = 20;
  const chartW = w - padL - padR; const chartH = h - padT - padB;

  // Create a fast lookup set for anomaly row indices (rowIdx is the
  // original row position, so blanks never shift the highlight)
  const anomalySet = new Set(anomalies.map(a => a.rowIdx ?? a.index));
  // Downsample normal points if dataset is huge, but ALWAYS draw anomalies precisely
  const drawPoints = [];
  const MAX_POINTS = 500;
  const step = Math.max(1, Math.floor(rawVals.length / MAX_POINTS));

  for (let i = 0; i < rawVals.length; i++) {
    if (!isNumber(rawVals[i])) continue; // blank cell — nothing to plot
    const isAnomaly = anomalySet.has(i);
    if (isAnomaly || i % step === 0) {
      drawPoints.push({
        index: i,
        val: rawVals[i],
        isAnomaly
      });
    }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const yPos = padT + chartH * (1 - frac);
        const val = minV + range * frac;
        return (
          <g key={i}>
            <line x1={padL} y1={yPos} x2={w - padR} y2={yPos} stroke="#1e2d5c" strokeWidth="0.5" />
            <text x={padL - 4} y={yPos + 3} textAnchor="end" fill="#8892b0" fontSize="10" fontFamily="DM Mono">{fmtNum(val)}</text>
          </g>
        );
      })}
      {/* Points */}
      {drawPoints.map((pt, i) => {
        const px = padL + (pt.index / Math.max(rawVals.length - 1, 1)) * chartW;
        const py = padT + chartH - ((pt.val - minV) / range) * chartH;
        return (
          <circle key={i} cx={px} cy={py} r={pt.isAnomaly ? 4 : Math.max(1.5, 300 / drawPoints.length)}
            fill={pt.isAnomaly ? "#FF3C3C" : "#00D4FF"}
            opacity={pt.isAnomaly ? 0.9 : 0.4}
            stroke={pt.isAnomaly ? "#FF8888" : "none"} />
        );
      })}
    </svg>
  );
}
