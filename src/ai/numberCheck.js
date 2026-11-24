// Checks every number an AI answer states against the result table
// it was given. A number counts as verified when some table value
// matches it at the precision the answer used (so 4.68M matches
// 4,677,000, and 20% matches 19.99).
//
// Answers can come in any of LUMIQ's languages, so the reader follows the
// answer's number format (see ../lib/numberFormat.js):
// - Western and Indian grouping with commas, decimal dot: 4,677,000 and
//   46,77,000 (the default, for English, Hindi, Japanese, Chinese, Hebrew);
// - decimal comma with dot or space grouping: 4.677.000 or 4 677 000 and
//   4,68 (Spanish, French, German);
// - big-number words in every language: K, M, B, million, lakh, crore,
//   लाख, करोड़, mil, millones, Md, milliards, Mio., Mrd., 万, 億, 亿, 兆;
// - percentages written 45% or 45 %; a currency sign before or after the
//   number is simply not part of it.
// Japanese and Chinese dates such as 12月 or 2024年 are not checked.

import { resolveNumberFormat } from "../lib/numberFormat.js";

// Thousands may be grouped with a thin, no-break or narrow no-break space
// before exactly three digits ("780 000", as some models write them); an
// ordinary space still separates two numbers, except in French-style
// formats, where it is the usual grouping.
const GROUP_SPACES = "   ";

// Units after a number, longest first, with what they multiply by. करोड़ may
// be typed with the single letter ड़ or as ड plus the nukta sign.
const UNITS = [
  ["mil\\s?M(?![\\p{L}])", 1e9],
  ["mil\\s+millones", 1e9],
  ["milliards?", 1e9],
  ["milliarden", 1e9],
  ["billions?", 1e9],
  ["mrd\\.?", 1e9],
  ["md(?![\\p{L}])", 1e9],
  ["bn", 1e9],
  ["millones", 1e6],
  ["millón", 1e6],
  ["millionen", 1e6],
  ["millions?", 1e6],
  ["mio\\.?", 1e6],
  ["crores?", 1e7],
  ["करो(?:\\u095c|\\u0921\\u093c)", 1e7],
  ["lakhs?", 1e5],
  ["लाख", 1e5],
  ["thousand", 1e3],
  ["tsd\\.?", 1e3],
  ["mil(?![\\p{L}])", 1e3],
  ["万亿", 1e12],
  ["兆", 1e12],
  ["億", 1e8],
  ["亿", 1e8],
  ["万", 1e4],
  ["千", 1e3],
  ["k(?![\\p{L}])", 1e3],
  ["m(?![\\p{L}])", 1e6],
  ["b(?![\\p{L}])", 1e9],
];
const UNIT_PATTERN = UNITS.map(([pattern]) => pattern).join("|");
const UNIT_MATCHERS = UNITS.map(([pattern, scale]) => [new RegExp(`^(?:${pattern})$`, "iu"), scale]);
const CJK_DATE_AFTER = /^[月日年時时分秒号號]/;

// Canonical names for the units the tests and the UI care about.
function unitName(word) {
  const w = word.toLowerCase();
  if (w === "लाख" || w.startsWith("lakh")) return "lakh";
  if (w.startsWith("करो") || w.startsWith("crore")) return "crore";
  return w.replace(/\s+/g, " ");
}

function unitScale(word) {
  for (const [re, scale] of UNIT_MATCHERS) if (re.test(word)) return scale;
  return 1;
}

// How an answer's numbers are written: decimal dot or comma, and whether
// an ordinary space groups thousands. Options are a format from
// resolveNumberFormat, or { language, style }; none means the default.
function readFormat(options) {
  if (!options) return { comma: false, spaceGroups: false };
  const format = options.decimal ? options : resolveNumberFormat(options.language, options.style);
  return { comma: format.decimal === ",", spaceGroups: format.style === "space-comma" };
}

const regexCache = new Map();

function numberRegex({ comma, spaceGroups }) {
  const key = `${comma}|${spaceGroups}`;
  if (regexCache.has(key)) return regexCache.get(key);
  const spaces = spaceGroups ? `${GROUP_SPACES} ` : GROUP_SPACES;
  const group = `[${spaces}](?=\\d{3}(?!\\d))`;
  // Decimal dot: commas group anywhere (1,234,567 and 1,20,000). Decimal
  // comma: dots group before exactly three digits, and a lone final dot
  // before one or two digits is read as a decimal point written by habit.
  const body = comma
    ? `\\d(?:\\d|\\.(?=\\d{3}(?!\\d))|${group})*(?:,\\d+|\\.\\d{1,2}(?!\\d))?`
    : `\\d(?:\\d|,(?=\\d)|${group})*(?:\\.\\d+)?`;
  // The guards reject digits glued to Latin letters ("W2", "ab12") or a
  // further decimal part ("1.2.3"), but allow an ordinary sentence period or
  // comma right after a number or unit ("…was 4.68M.", "…mit 712.000, am…").
  // \w stays ASCII, so Japanese and Chinese text right next to a number is
  // fine ("12か月", "468万です").
  // A sign counts only after a space, an opening bracket or the start, so a
  // range ("10-20") or a Hebrew prefix ("ב-12", "in 12") is not negative.
  const sign = `(?:(?<![^\\s(\\[{=:])[-+\\u2212])?`;
  const re = new RegExp(
    `(?<![\\w.])${sign}${body}(?:[\\s\\u00a0\\u202f]*(${UNIT_PATTERN})|([\\s\\u00a0\\u202f]?%))?(?!\\w|[.,]\\d)`,
    "giu"
  );
  regexCache.set(key, re);
  return re;
}

// The digits of a match, as a JavaScript number with how many decimals the
// answer showed.
function readDigits(core, { comma }) {
  let s = core.replace(new RegExp(`[${GROUP_SPACES} ]`, "g"), "").replace("−", "-");
  if (comma) {
    const decimalDot = !s.includes(",") && /\.\d{1,2}$/.test(s);
    s = decimalDot ? s : s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  return { value: Number(s), decimals: (s.split(".")[1] || "").length };
}

// Every extracted number carries a tolerance of half a step of its
// last shown digit: "3.4K" → ±50, "45%" → ±0.5, "4,677,000" → ±0.5.
export function extractNumbers(text, options) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  const format = readFormat(options);
  for (const m of text.matchAll(numberRegex(format))) {
    const raw = m[0];
    if (CJK_DATE_AFTER.test(text.slice(m.index + raw.length))) continue;
    const unitWord = m[1] || "";
    const core = raw.slice(0, raw.length - (unitWord ? unitWord.length : 0)).replace(/[\s  ]*%?$/, "");
    const { value: base, decimals } = readDigits(core.trim(), format);
    if (!Number.isFinite(base)) continue;
    const scale = unitWord ? unitScale(unitWord) : 1;
    const halfStep = 0.5 * Math.pow(10, -decimals);
    out.push({
      index: m.index,
      length: raw.length,
      raw,
      value: base * scale,
      tolerance: halfStep * scale,
      unit: unitWord ? unitName(unitWord) : m[2] ? "%" : null,
    });
  }
  return out;
}

// Values an answer may legitimately quote: every cell of the result
// table (numbers inside text cells like "2024-Q1" count too) plus any
// extras such as rowsUsed, total rows and the number of result rows.
export function collectCandidates(table, extras = []) {
  const out = [];
  for (const row of table || []) {
    for (const v of Object.values(row || {})) {
      if (typeof v === "number" && Number.isFinite(v)) out.push(v);
      else if (typeof v === "string") for (const n of extractNumbers(v)) out.push(n.value);
    }
  }
  for (const e of extras) {
    if (typeof e === "number" && Number.isFinite(e)) out.push(e);
  }
  return out;
}

// Splits the answer into segments so the UI can mark each number.
// Joining segment texts always reproduces the input text exactly.
// `options` names the answer's number format (see extractNumbers).
export function verifyNumbers(text, candidates, options) {
  const numbers = extractNumbers(text, options);
  const segments = [];
  let pos = 0;
  let unverified = 0;
  for (const n of numbers) {
    const verified = candidates.some((c) => Math.abs(c - n.value) <= n.tolerance + 1e-9);
    if (!verified) unverified++;
    if (n.index > pos) segments.push({ text: text.slice(pos, n.index) });
    segments.push({ text: n.raw, number: n.value, verified });
    pos = n.index + n.length;
  }
  if (pos < (text || "").length) segments.push({ text: text.slice(pos) });
  return { segments, checked: numbers.length, unverified };
}
