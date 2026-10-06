import { isNumber } from "./stats.js";

// Plain words for a regression fit: "strong" (R² 0.7 and above),
// "moderate" (0.4 to 0.7), "weak" (below 0.4). The exact R² is shown
// only in hover tooltips.
export function fitLabel(r2) {
  if (!isNumber(r2)) return "weak";
  if (r2 >= 0.7) return "strong";
  if (r2 >= 0.4) return "moderate";
  return "weak";
}

// Format numbers for axis labels; blanks and missing stats show as "—"
export function fmtNum(v) {
  if (!isNumber(v)) return "—";
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}
