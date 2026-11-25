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
// - big-number words in every language: K, M, B, million, lakh (lac),
//   crore, लाख, करोड़, mil, millones, Md, milliards, Mio., Mrd., 万, 億, 亿, 兆;
// - Devanagari digits read like 0-9: ७,१२,००० is 712,000;
// - percentages written 45% or 45 %; a currency sign before or after the
//   number is simply not part of it.
// Japanese and Chinese dates such as 12月 or 2024年 are not checked.
//
// Row names. When the candidates say which row of the table each value
// comes from ({ value, label }, see collectLabelledCandidates), a number the
// answer ties to a row must match a value of THAT row: "October 1,200 and
// September 900" fails when the table says October 900 and September 1,200.
// The answer is read clause by clause (a clause ends at . ! ? ; । 。 or a new
// line, and at a comma unless the comma comes straight after a row name, as
// in "In October, revenue was 900"):
// - in a clause that starts with a row name, a number is tied to the row
//   names said since the number before it ("December beat February with
//   712,000" may match either month);
// - it is not tied when no row name came since the number before it, or
//   when the next thing after it is a row name with no number of its own
//   ("Electronics took 51.1% ahead of Fashion");
// - a clause that starts with a number ("1,200 in October and 900 in
//   September"), a number inside a row name (the 2024 of "2024-Q1") and a
//   sentence that names no row are checked the old way, against every value.
// A tied number may also match a value that belongs to no row (rows used,
// total rows). Row names are matched as written in the table, or with a
// capital first letter; English months also match their short or long form
// ("Dec" and "December"). Candidates given as plain numbers behave exactly
// as before.

import { resolveNumberFormat } from "../lib/numberFormat.js";

// Thousands may be grouped with a thin, no-break or narrow no-break space
// before exactly three digits ("780 000", as some models write them); an
// ordinary space still separates two numbers, except in French-style
// formats, where it is the usual grouping.
const GROUP_SPACES = "   ";

// Units after a number, longest first, with what they multiply by. करोड़ may
// be typed with the single letter ड़, as ड plus the nukta sign, or as plain ड.
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
  ["करो(?:\\u095c|\\u0921\\u093c?)", 1e7],
  ["lakhs?", 1e5],
  ["lacs?", 1e5],
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
  if (w === "लाख" || w.startsWith("lakh") || /^lacs?$/.test(w)) return "lakh";
  if (w.startsWith("करो") || w.startsWith("crore")) return "crore";
  return w.replace(/\s+/g, " ");
}

function unitScale(word) {
  for (const [re, scale] of UNIT_MATCHERS) if (re.test(word)) return scale;
  return 1;
}

// Devanagari digits ०-९ read as 0-9. Each is one UTF-16 unit, like the digit
// it stands for, so every position in the text stays where it was.
const DEVANAGARI_ZERO = 0x0966;
function asciiDigits(text) {
  return text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - DEVANAGARI_ZERO));
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
// `raw` is the number exactly as the text writes it (Devanagari digits
// included), so the UI can mark it in place.
export function extractNumbers(text, options) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  const format = readFormat(options);
  const scan = asciiDigits(text);
  for (const m of scan.matchAll(numberRegex(format))) {
    const found = m[0];
    if (CJK_DATE_AFTER.test(scan.slice(m.index + found.length))) continue;
    const unitWord = m[1] || "";
    const core = found.slice(0, found.length - (unitWord ? unitWord.length : 0)).replace(/[\s  ]*%?$/, "");
    const { value: base, decimals } = readDigits(core.trim(), format);
    if (!Number.isFinite(base)) continue;
    const scale = unitWord ? unitScale(unitWord) : 1;
    const halfStep = 0.5 * Math.pow(10, -decimals);
    out.push({
      index: m.index,
      length: found.length,
      raw: text.slice(m.index, m.index + found.length),
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

// A text that can name a row in an answer: at least two characters with a
// letter in them, and not just a number ("Oct", "North", "2024-Q1", "दिल्ली";
// not "2024-10-01", "45%" or "4.68M").
function rowNames(label) {
  const out = [];
  for (const item of Array.isArray(label) ? label : [label]) {
    if (typeof item !== "string") continue;
    const name = item.replace(/\s+/g, " ").trim();
    if (name.length < 2 || !/\p{L}/u.test(name) || out.includes(name)) continue;
    const numbers = extractNumbers(name);
    if (numbers.length === 1 && numbers[0].raw === name) continue;
    out.push(name);
  }
  return out;
}

// The same values as collectCandidates, each with the name of the row it
// comes from: { value, label }, where label is the row's name (a string),
// its names when the table was grouped by more than one column (an array),
// or null when the row has none. Extras belong to no row and stay plain
// numbers. verifyNumbers then holds a number the answer ties to a row to
// that row's values.
export function collectLabelledCandidates(table, extras = []) {
  const out = [];
  for (const row of table || []) {
    const cells = Object.values(row || {});
    const names = rowNames(cells);
    const label = names.length === 0 ? null : names.length === 1 ? names[0] : names;
    for (const v of cells) {
      if (typeof v === "number" && Number.isFinite(v)) out.push({ value: v, label });
      else if (typeof v === "string") for (const n of extractNumbers(v)) out.push({ value: n.value, label });
    }
  }
  for (const e of extras) {
    if (typeof e === "number" && Number.isFinite(e)) out.push(e);
  }
  return out;
}

// Candidates in three piles: every value (the old check), the values that
// belong to no row, and each row name with its values. Plain entries are
// kept exactly as given, so plain callers get exactly the old comparison.
function readCandidates(candidates) {
  const all = [];
  const unlabelled = [];
  const rows = new Map();
  // One row's values share one label, so its names are read once.
  const namesOf = new Map();
  for (const c of candidates) {
    if (c === null || typeof c !== "object" || Array.isArray(c)) {
      all.push(c);
      unlabelled.push(c);
      continue;
    }
    if (typeof c.value !== "number" || !Number.isFinite(c.value)) continue;
    all.push(c.value);
    if (!namesOf.has(c.label)) namesOf.set(c.label, rowNames(c.label));
    const names = namesOf.get(c.label);
    if (names.length === 0) unlabelled.push(c.value);
    for (const name of names) {
      const values = rows.get(name);
      if (values) values.push(c.value);
      else rows.set(name, [c.value]);
    }
  }
  return { all, unlabelled, rows };
}

// English month names, short and long: a table may say "Dec" where the
// answer says "December", or the other way round.
const MONTHS = [
  ["jan", "january"],
  ["feb", "february"],
  ["mar", "march"],
  ["apr", "april"],
  ["may"],
  ["jun", "june"],
  ["jul", "july"],
  ["aug", "august"],
  ["sep", "sept", "september"],
  ["oct", "october"],
  ["nov", "november"],
  ["dec", "december"],
];

function capitalise(word) {
  const first = String.fromCodePoint(word.codePointAt(0));
  return first.toUpperCase() + word.slice(first.length);
}

// How a row name may be written in an answer: as in the table or with a
// capital first letter (never in lower case when the table did not write it
// so, so "may" or "other" in a sentence is not a row); a month in any of its
// forms, capitalised or in capitals.
function spellings(name) {
  const month = MONTHS.find((forms) => forms.includes(name.toLowerCase()));
  if (month) return month.flatMap((form) => [capitalise(form), form.toUpperCase()]);
  return [name, capitalise(name)];
}

// Letters, digits and marks join words; Chinese, Japanese and Korean
// characters do not, since those languages put no spaces between words.
// (Plain ranges rather than \p{Script=…}, which not every phone engine reads.)
const CJK = "ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯豈-﫿ｦ-ﾟ";
const WORD_END = /[\p{L}\p{N}\p{M}]$/u;
const WORD_START = /^[\p{L}\p{N}\p{M}]/u;
const CJK_END = new RegExp(`[${CJK}]$`, "u");
const CJK_START = new RegExp(`^[${CJK}]`, "u");

function wordEdge(text, start, end) {
  const before = text.slice(Math.max(0, start - 2), start);
  const after = text.slice(end, end + 2);
  return (!WORD_END.test(before) || CJK_END.test(before)) && (!WORD_START.test(after) || CJK_START.test(after));
}

// Where the answer names a row: [{ start, end, names }], in order, never
// overlapping (the longest name wins: "North East" over "North").
function findRowNames(scan, rows) {
  const needles = new Map();
  for (const name of rows.keys()) {
    for (const spelling of spellings(asciiDigits(name))) {
      const names = needles.get(spelling);
      if (!names) needles.set(spelling, [name]);
      else if (!names.includes(name)) names.push(name);
    }
  }
  const found = [];
  for (const [needle, names] of needles) {
    for (let at = scan.indexOf(needle); at !== -1; at = scan.indexOf(needle, at + 1)) {
      const end = at + needle.length;
      if (wordEdge(scan, at, end)) found.push({ start: at, end, names });
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  for (const mention of found) {
    const last = out[out.length - 1];
    if (last && last.start === mention.start && last.end === mention.end) {
      last.names = [...new Set([...last.names, ...mention.names])];
    } else if (!last || mention.start >= last.end) {
      out.push({ ...mention });
    }
  }
  return out;
}

const HARD_BREAK = /[.!?;\n\r।॥。！？；]/;
const SOFT_BREAK = /[,،、，]/;
const AFTER_NAME = /[\s"'’”)\]»]/;

// Where clauses end. Characters inside a number ("1,200", "4,68 Mio.") or a
// row name ("St. Louis") never end one, and a comma straight after a row
// name ("In October, …") does not either.
function clauseBreaks(scan, numbers, mentions) {
  const mark = new Uint8Array(scan.length); // 1: inside a number, 2: inside a row name
  for (const n of numbers) mark.fill(1, n.index, n.index + n.length);
  for (const m of mentions) mark.fill(2, m.start, m.end);
  const followsName = (i) => {
    let j = i - 1;
    while (j >= 0 && !mark[j] && AFTER_NAME.test(scan[j])) j--;
    return j >= 0 && mark[j] === 2;
  };
  const breaks = [];
  for (let i = 0; i < scan.length; i++) {
    if (mark[i]) continue;
    if (HARD_BREAK.test(scan[i]) || (SOFT_BREAK.test(scan[i]) && !followsName(i))) breaks.push(i);
  }
  return breaks;
}

// One clause's row names and numbers, in order (see the top of the file).
function tieClause(tokens, tied) {
  if (tokens.length === 0 || !tokens[0].names) return;
  let since = [];
  tokens.forEach((token, k) => {
    if (token.names) {
      for (const name of token.names) if (!since.includes(name)) since.push(name);
      return;
    }
    const next = tokens[k + 1];
    const trailingName = Boolean(next?.names) && !tokens.slice(k + 2).some((later) => !later.names);
    if (since.length > 0 && !trailingName) tied[token.number] = since;
    since = [];
  });
}

// For each number, the row names it is tied to, or null.
function tieNumbers(text, numbers, rows) {
  const tied = numbers.map(() => null);
  if (typeof text !== "string" || numbers.length === 0 || rows.size === 0) return tied;
  const scan = asciiDigits(text);
  const mentions = findRowNames(scan, rows);
  if (mentions.length === 0) return tied;
  const breaks = clauseBreaks(scan, numbers, mentions);
  const tokens = mentions.map((m) => ({ at: m.start, names: m.names }));
  numbers.forEach((n, i) => {
    const end = n.index + n.length;
    const insideName = mentions.some((m) => n.index < m.end && end > m.start);
    if (!insideName) tokens.push({ at: n.index, number: i });
  });
  tokens.sort((a, b) => a.at - b.at);
  let clause = [];
  let b = 0;
  for (const token of tokens) {
    if (b < breaks.length && breaks[b] < token.at) {
      tieClause(clause, tied);
      clause = [];
      while (b < breaks.length && breaks[b] < token.at) b++;
    }
    clause.push(token);
  }
  tieClause(clause, tied);
  return tied;
}

const matchesAny = (values, n) => values.some((c) => Math.abs(c - n.value) <= n.tolerance + 1e-9);

// Splits the answer into segments so the UI can mark each number.
// Joining segment texts always reproduces the input text exactly.
// `candidates` are plain numbers (collectCandidates) or, to hold a number
// to its own row, { value, label } entries (collectLabelledCandidates);
// the two can be mixed. `options` names the answer's number format (see
// extractNumbers). Returns the segments, `total` (how many numbers the
// answer has; `checked` is the same count under its older name),
// `checkedCount` (how many of them matched) and `unverified` (how many
// did not).
export function verifyNumbers(text, candidates, options) {
  const numbers = extractNumbers(text, options);
  const pool = readCandidates(Array.isArray(candidates) ? candidates : []);
  const tied = tieNumbers(text, numbers, pool.rows);
  const segments = [];
  let pos = 0;
  let unverified = 0;
  numbers.forEach((n, i) => {
    const names = tied[i];
    const verified = names
      ? names.some((name) => matchesAny(pool.rows.get(name), n)) || matchesAny(pool.unlabelled, n)
      : matchesAny(pool.all, n);
    if (!verified) unverified++;
    if (n.index > pos) segments.push({ text: text.slice(pos, n.index) });
    segments.push({ text: n.raw, number: n.value, verified });
    pos = n.index + n.length;
  });
  if (pos < (text || "").length) segments.push({ text: text.slice(pos) });
  const total = numbers.length;
  return { segments, checked: total, unverified, total, checkedCount: total - unverified };
}
