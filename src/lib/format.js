import { isNumber } from "./stats.js";

// Format numbers for axis labels; blanks and missing stats show as "—"
export function fmtNum(v) {
  if (!isNumber(v)) return "—";
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}
