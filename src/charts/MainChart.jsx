import { fmtNum, fitLabel } from "../lib/format.js";
import { downsample } from "../lib/analysis.js";
import { buildForecast } from "../engine/forecast.js";
import { chartSeries } from "../engine/chartSeries.js";

// The Overview's main visualization card: metric and chart-type
// selectors, the Forecast toggle, the SVG chart and the forecast
// narrative box. Moved verbatim from App.jsx.
export default function MainChart({ ds, processedData, numericCols, metric, setSelectedMetric, chartType, setChartType, forecastTime, forecastEnabled, setForecastEnabled, forecastNarrative, setForecastNarrative, forecastLoading, runForecast, forecastAbortRef }) {
  // The self-check shown under the chart (recomputed cheaply here so
  // the narrative box outside the SVG closure can read it)
  const check = forecastEnabled ? buildForecast(chartSeries(ds, processedData, metric, { timeOrdered: !!forecastTime }).values) : null;
  return (
    <div className="glass-card" style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700 }}>Visualization</h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={metric} onChange={(e) => setSelectedMetric(e.target.value)}>{numericCols.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}><option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option></select>
          {forecastTime ? (
            <button
              className={forecastEnabled ? "btn-primary" : "btn-ghost"}
              style={{ fontSize: "11px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => {
                const next = !forecastEnabled;
                setForecastEnabled(next);
                if (next) {
                  // Points in time order (never table order);
                  // blank cells are skipped, not fed in as zeros
                  const fc = buildForecast(chartSeries(ds, processedData, metric, { timeOrdered: true }).values);
                  runForecast(metric, fc);
                } else {
                  forecastAbortRef.current?.abort();
                  setForecastNarrative("");
                }
              }}
            >
              🔮 {forecastEnabled ? "Forecast ON" : "Forecast"}
            </button>
          ) : (
            <button
              className="btn-ghost"
              disabled
              title="Forecast needs a date or month column with at least 8 points"
              style={{ fontSize: "11px", padding: "5px 12px", opacity: 0.4, cursor: "default" }}
            >
              🔮 Forecast
            </button>
          )}
        </div>
      </div>
      <div style={{ position: "relative", height: "260px" }}>
        {(() => {
          // Rows with a blank metric are skipped, never charted
          // as 0. With Forecast on, the series follows the time
          // column — sorting the table cannot change it.
          const series = chartSeries(ds, processedData, metric, { timeOrdered: forecastEnabled && !!forecastTime });
          const rawVals = series.values;
          const vals = downsample(rawVals, 60);
          const regression = forecastEnabled ? buildForecast(rawVals) : null;
          const forecastVals = regression?.ok && !regression.tooIrregular ? regression.forecast : [];
          const allVals = forecastEnabled ? [...vals, ...forecastVals] : vals;
          let globalMax = -Infinity, globalMin = Infinity;
          for (const v of allVals) { if (v > globalMax) globalMax = v; if (v < globalMin) globalMin = v; }
          if (forecastEnabled && regression?.ok && !regression.tooIrregular) {
            for (let i = 0; i < forecastVals.length; i++) {
              const upper = forecastVals[i] + regression.confidence[i];
              const lower = forecastVals[i] - regression.confidence[i];
              if (upper > globalMax) globalMax = upper;
              if (lower < globalMin) globalMin = lower;
            }
          }
          const maxV = globalMax; const minV = globalMin; const range = maxV - minV || 1;
          const padL = 14; const padR = 2; const padT = 5; const padB = 14;
          const totalPts = forecastEnabled ? vals.length + forecastVals.length : vals.length;
          const w = 120; const chartW = w - padL - padR;
          const h = 100; const chartH = h - padT - padB;
          const yTicks = 5;
          const pts = vals.map((v, i) => `${padL + (i / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((v - minV) / range) * chartH}`).join(" ");
          const xLabelCount = Math.min(6, vals.length);
          const totalRows = series.values.length;

          // Forecast points for the dashed line
          let forecastPts = "";
          let confidenceArea = "";
          if (forecastEnabled && forecastVals.length > 0) {
            const startIdx = vals.length - 1;
            const lastRealPt = `${padL + (startIdx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((vals[startIdx] - minV) / range) * chartH}`;
            const fPts = forecastVals.map((v, i) => {
              const idx = vals.length + i;
              return `${padL + (idx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((v - minV) / range) * chartH}`;
            });
            forecastPts = `${lastRealPt} ${fPts.join(" ")}`;

            // Confidence band polygon
            const upperPts = forecastVals.map((v, i) => {
              const idx = vals.length + i;
              const upper = v + regression.confidence[i];
              return `${padL + (idx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((upper - minV) / range) * chartH}`;
            });
            const lowerPts = [...forecastVals].reverse().map((v, i) => {
              const origIdx = forecastVals.length - 1 - i;
              const idx = vals.length + origIdx;
              const lower = v - regression.confidence[origIdx];
              return `${padL + (idx / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH - ((lower - minV) / range) * chartH}`;
            });
            confidenceArea = [...upperPts, ...lowerPts].join(" ");
          }

          return (
            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {/* Y-axis grid lines + labels */}
              {Array.from({ length: yTicks + 1 }).map((_, i) => {
                const frac = i / yTicks;
                const yPos = padT + chartH * (1 - frac);
                const val = minV + range * frac;
                return (
                  <g key={i}>
                    <line x1={padL} y1={yPos} x2={w - padR} y2={yPos} stroke="#1e2d5c" strokeWidth="0.2" />
                    <text x={padL - 1} y={yPos + 1} textAnchor="end" fill="#3d4f7c" fontSize="3" fontFamily="DM Mono">{fmtNum(val)}</text>
                  </g>
                );
              })}
              {/* Forecast boundary line */}
              {forecastEnabled && vals.length > 0 && (
                <line
                  x1={padL + ((vals.length - 1) / Math.max(totalPts - 1, 1)) * chartW}
                  y1={padT}
                  x2={padL + ((vals.length - 1) / Math.max(totalPts - 1, 1)) * chartW}
                  y2={padT + chartH}
                  stroke="#FFB627"
                  strokeWidth="0.3"
                  strokeDasharray="1,1"
                />
              )}
              {/* Confidence band */}
              {forecastEnabled && confidenceArea && (
                <polygon points={confidenceArea} fill="#7B4FE8" opacity="0.15" />
              )}
              {/* Chart data */}
              {chartType === "bar" ? vals.map((v, i) => {
                const bH = ((v - minV) / range) * chartH;
                const gap = 0.4;
                const bW = Math.max(chartW / totalPts - gap, 0.5);
                const x = padL + (i / totalPts) * chartW + gap / 2;
                return <rect key={i} x={x} y={padT + chartH - bH} width={bW} height={bH} fill="#00D4FF" opacity={0.65 + (i / vals.length) * 0.35} rx="0.3" />;
              }) : (
                <>
                  <polyline points={`${padL},${padT + chartH} ${pts} ${padL + ((vals.length - 1) / Math.max(totalPts - 1, 1)) * chartW},${padT + chartH}`} fill={chartType === "area" ? "url(#chart-fill)" : "none"} stroke="none" />
                  <polyline points={pts} fill="none" stroke="#00D4FF" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                  {vals.length <= 80 && vals.map((v, i) => {
                    const px = padL + (i / Math.max(totalPts - 1, 1)) * chartW;
                    const py = padT + chartH - ((v - minV) / range) * chartH;
                    return <circle key={i} cx={px} cy={py} r="0.6" fill="#00D4FF" />;
                  })}
                </>
              )}
              {/* Forecast dashed line + points */}
              {forecastEnabled && forecastPts && (
                <>
                  <polyline points={forecastPts} fill="none" stroke="#FFB627" strokeWidth="0.8" strokeDasharray="1.5,1" strokeLinecap="round" />
                  {forecastVals.map((v, i) => {
                    const idx = vals.length + i;
                    const px = padL + (idx / Math.max(totalPts - 1, 1)) * chartW;
                    const py = padT + chartH - ((v - minV) / range) * chartH;
                    return <circle key={`f${i}`} cx={px} cy={py} r="0.8" fill="#FFB627" stroke="#050914" strokeWidth="0.3" />;
                  })}
                  <text x={w - padR} y={padT + 2} textAnchor="end" fill="#FFB627" fontSize="2.5" fontFamily="DM Mono">
                    <title>R² = {regression?.r2.toFixed(3)}</title>
                    🔮 Forecast ({forecastVals.length} pts) | Fit: {fitLabel(regression?.r2)}
                  </text>
                </>
              )}
              {/* Forecast bars */}
              {forecastEnabled && chartType === "bar" && forecastVals.map((v, i) => {
                const bH = ((v - minV) / range) * chartH;
                const gap = 0.4;
                const idx = vals.length + i;
                const bW = Math.max(chartW / totalPts - gap, 0.5);
                const x = padL + (idx / totalPts) * chartW + gap / 2;
                return <rect key={`fb${i}`} x={x} y={padT + chartH - bH} width={bW} height={bH} fill="#FFB627" opacity="0.6" rx="0.3" strokeDasharray="1,0.5" stroke="#FFB627" strokeWidth="0.15" />;
              })}
              {/* X-axis labels */}
              {Array.from({ length: xLabelCount }).map((_, i) => {
                const dataIdx = Math.floor((i / Math.max(xLabelCount - 1, 1)) * (totalRows - 1));
                const px = padL + (i / Math.max(xLabelCount - 1, 1)) * (chartW * (vals.length / totalPts));
                const label = totalRows > 100 ? `#${dataIdx + 1}` : String(series.labels[dataIdx] || "").slice(0, 6);
                return <text key={i} x={px} y={h - 1} textAnchor="middle" fill="#3d4f7c" fontSize="3" fontFamily="DM Mono">{label}</text>;
              })}
              {/* Dataset info */}
              {totalRows > 60 && <text x={w - padR} y={padT + 4} textAnchor="end" fill="#3d4f7c44" fontSize="3" fontFamily="DM Mono">{totalRows.toLocaleString()} rows (avg per bucket)</text>}
            </svg>
          );
        })()}
      </div>

      {/* Forecast Narrative */}
      {forecastEnabled && (
        <div style={{ marginTop: "16px", padding: "14px", background: "#0a0f22", borderRadius: "10px", border: "1px solid #FFB62744" }}>
          {check?.ok && !check.tooIrregular && (
            <p style={{ fontSize: "12px", color: "#8892b0", marginBottom: "6px" }}>Checked on the last {check.holdoutPoints} points: off by about {check.errorPct}%.</p>
          )}
          {check?.ok && check.tooIrregular && (
            <p style={{ fontSize: "12px", color: "#FFB627", marginBottom: "6px" }}>This data is too irregular for a reliable forecast — on the last {check.holdoutPoints} points the trendline was off by about {check.errorPct}%.</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "16px" }}>🔮</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px" }}>Forecast</span>
            <span className="badge badge-gold" style={{ fontSize: "9px" }}>{forecastLoading ? "Analyzing..." : "AI Insight"}</span>
          </div>
          <p style={{ fontSize: "12px", color: "#ccd6f6", lineHeight: 1.6 }}>{forecastNarrative || "Generating forecast..."}</p>
        </div>
      )}
    </div>
  );
}
