// Column types are decided from ALL non-blank values of a column,
// never from the first row alone. Types: number, percent, money,
// date, text. Numeric cells accept Indian and Western grouping,
// currency symbols and percent signs; blanks stay null.

import { isBlank } from "../lib/stats.js";

export const NUMERIC_TYPES = Object.freeze(["number", "percent", "money"]);

// A few bad cells must not demote a whole numeric column; cells that
// do not parse become null (blank) instead.
const NUMERIC_SHARE = 0.8;
const DATE_SHARE = 0.9;

const CURRENCY_RE = /[₹$€£¥￥₪₩₽₺₫฿₱]/;
// The yen sign is shared by Japan and China; these say which one a file
// means: "1,200円" and "JPY 1,200" are yen, "1,200元", "RMB 1,200" and
// "CNY 1,200" are yuan. They are kept so the app can write JP¥ or CN¥.
const YEN_CLUE_RE = /\s*(円|元|JPY|CNY|RMB)\s*/i;
const YEN_CLUES = { "円": "JPY", jpy: "JPY", "元": "CNY", cny: "CNY", rmb: "CNY" };

// Parses one cell as a number if it looks like one:
// "1,20,000" → 120000, "120,000" → 120000, "₹1,200" → 1200 (money),
// "1,200円" → 1200 (money in yen),
// "12.5%" → 12.5 (percent), "-3.4" → -3.4. Returns null otherwise.
export function parseNumericString(raw) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { value: raw, kind: "number", symbol: null } : null;
  }
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const hasPercent = /%$/.test(s);
  const clue = (s.match(YEN_CLUE_RE) || [null, null])[1];
  const currency = clue ? YEN_CLUES[clue.toLowerCase()] || YEN_CLUES[clue] : undefined;
  let symbol = (s.match(CURRENCY_RE) || [null])[0];
  if (symbol === "￥" || (currency && !symbol)) symbol = "¥";
  let core = s.replace(/%$/, "").replace(YEN_CLUE_RE, "").replace(CURRENCY_RE, "").trim();
  // Digits with optional grouping commas and one decimal point. The
  // comma positions are not checked, so both 1,234,567 and 1,20,000
  // parse; anything with letters or other symbols does not.
  if (!/^[-+]?[\d,]*\.?\d+$/.test(core)) return null;
  const value = Number(core.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const parsed = { value, kind: hasPercent ? "percent" : symbol ? "money" : "number", symbol };
  if (currency) parsed.currency = currency;
  return parsed;
}

const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}([T ].+)?$/, // 2024-01-31, ISO timestamps
  /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/, // 31/01/2024, 1-31-24
  /^\d{4}[/.]\d{1,2}[/.]\d{1,2}$/, // 2024/01/31
];

export function looksLikeDate(raw) {
  return typeof raw === "string" && DATE_PATTERNS.some((re) => re.test(raw.trim()));
}

// Decides every column's type by voting over all non-blank cells.
export function detectColumnTypes(rows, columns) {
  const result = {};
  for (const col of columns) {
    let total = 0;
    let dates = 0;
    const kinds = { number: 0, percent: 0, money: 0 };
    let symbol = null;
    let currency = null;
    for (const row of rows) {
      const v = row?.[col];
      if (isBlank(v)) continue;
      total++;
      const parsed = parseNumericString(v);
      if (parsed) {
        kinds[parsed.kind]++;
        if (!symbol && parsed.symbol) symbol = parsed.symbol;
        if (!currency && parsed.currency) currency = parsed.currency;
      } else if (looksLikeDate(v)) {
        dates++;
      }
    }
    const numeric = kinds.number + kinds.percent + kinds.money;
    if (total === 0) {
      result[col] = { type: "text" };
    } else if (numeric / total >= NUMERIC_SHARE) {
      // Sub-type by majority of the parsed cells
      const type =
        kinds.percent >= kinds.money && kinds.percent >= kinds.number
          ? "percent"
          : kinds.money >= kinds.number
            ? "money"
            : "number";
      result[col] = symbol ? { type, symbol, ...(currency ? { currency } : {}) } : { type };
    } else if (dates / total >= DATE_SHARE) {
      result[col] = { type: "date" };
    } else {
      result[col] = { type: "text" };
    }
  }
  return result;
}

// Canonical cell values: numeric columns hold numbers (or null for
// blanks and unparsable cells), everything else holds trimmed strings
// (or null for blanks). The original look is reconstructed from the
// column type by formatCell.
export function coerceRows(rows, columns, columnTypes) {
  return rows.map((row) => {
    const out = {};
    for (const col of columns) {
      const v = row?.[col];
      if (isBlank(v)) {
        out[col] = null;
        continue;
      }
      if (NUMERIC_TYPES.includes(columnTypes[col]?.type)) {
        const parsed = parseNumericString(v);
        out[col] = parsed ? parsed.value : null;
      } else {
        out[col] = typeof v === "string" ? v.trim() : v;
      }
    }
    return out;
  });
}

function formatNumber(v) {
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// Renders a canonical cell for display; blanks render as an empty
// string, never as 0 or "null".
export function formatCell(value, typeInfo) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "number") return String(value);
  const type = typeInfo?.type;
  if (type === "percent") return `${formatNumber(value)}%`;
  if (type === "money") return `${typeInfo?.symbol || ""}${formatNumber(value)}`;
  return formatNumber(value);
}

// Tile formatting: percent and averaged (rate-like) values keep one
// decimal (12.5, never 13), money carries its symbol, counts and
// other summed amounts show no decimals. Large values compress to
// K / M as before.
export function formatTileValue(value, typeInfo, rule = "sum") {
  if (value === null || value === undefined) return "—";
  const type = typeInfo?.type;
  const wantsDecimal = type === "percent" || rule === "avg";
  const abs = Math.abs(value);
  let core;
  if (abs >= 1e6) core = `${(value / 1e6).toFixed(wantsDecimal ? 2 : 1)}M`;
  else if (abs >= 1000) core = `${(value / 1000).toFixed(wantsDecimal ? 1 : 0)}K`;
  else core = wantsDecimal ? value.toFixed(1) : String(Math.round(value));
  if (type === "percent") return `${core}%`;
  if (type === "money") return `${typeInfo?.symbol || ""}${core}`;
  return core;
}

const AVERAGE_NAME_RE = /rate|margin|ratio|pct|avg|score|nps/i;

// How to total a number column: percent columns and rate-like names
// are averaged (summing a margin is meaningless); amounts are summed.
export function aggregationRule(colName, typeInfo) {
  if (typeInfo?.type === "percent" || AVERAGE_NAME_RE.test(String(colName))) return "avg";
  return "sum";
}
