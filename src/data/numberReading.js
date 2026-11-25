// Reading the numbers and dates of a spreadsheet the way the file meant
// them. One cell is read every way it could be meant ("1,234" is one
// thousand two hundred and thirty-four, or one point two three four);
// the COLUMN then decides which way is right from all its cells, and
// says how sure it is. When nothing in the file settles it, the answer
// is "low" or "ambiguous", so a screen can ask instead of guessing.
//
// Plain functions on plain values: no Date objects, no time zone, no
// "today". Used by columnTypes.js (types and canonical cells) and by
// uploadPreview.js (what the import review shows).

// ---------------------------------------------------------------------------
// Digits and marks of other writing systems
// ---------------------------------------------------------------------------

// Zero of each digit system that is mapped to 0-9, one character for one
// character, so positions in the text never move.
const DIGIT_SYSTEMS = [
  ["devanagari", 0x0966],
  ["arabic", 0x0660],
  ["persian", 0x06f0],
  ["fullwidth", 0xff10],
];
const OTHER_DIGIT_RE = /[\u0966-\u096F\u0660-\u0669\u06F0-\u06F9\uFF10-\uFF19]/g;
const NON_ASCII_RE = /[^\x00-\x7F]/;

// Marks that only ever belong to a number in a cell: the Arabic decimal and
// thousands marks, full-width punctuation, every kind of minus and of space,
// the typographic apostrophe used for grouping (1’234).
const CELL_MARKS = {
  "\u066B": ".",
  "\u066C": ",",
  "\u066A": "%",
  "\uFF05": "%",
  "\uFF0C": ",",
  "\uFF0E": ".",
  "\uFF08": "(",
  "\uFF09": ")",
  "\uFF0B": "+",
  "\uFF0F": "/",
  "\uFF0D": "-",
  "\u2212": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u00A0": " ",
  "\u202F": " ",
  "\u2009": " ",
  "\u2007": " ",
  "\u3000": " ",
  "\u2019": "'",
  "\u02BC": "'",
};
const CELL_MARK_RE = /[\u066B\u066C\u066A\uFF05\uFF0C\uFF0E\uFF08\uFF09\uFF0B\uFF0F\uFF0D\u2212\u2012\u2013\u00A0\u202F\u2009\u2007\u3000\u2019\u02BC]/g;

function asciiDigit(ch) {
  const code = ch.charCodeAt(0);
  for (const [, zero] of DIGIT_SYSTEMS) if (code >= zero && code <= zero + 9) return String(code - zero);
  return ch;
}

/**
 * One cell's text with other digits as 0-9 and the number marks above as
 * their plain forms. Same length as the input. Non-strings give "".
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeCellText(text) {
  if (typeof text !== "string") return "";
  if (!NON_ASCII_RE.test(text)) return text;
  return text.replace(OTHER_DIGIT_RE, asciiDigit).replace(CELL_MARK_RE, (ch) => CELL_MARKS[ch]);
}

/**
 * Which digits a text is written in: "latin", "devanagari", "arabic",
 * "persian", "fullwidth", "mixed" (two systems), or null (no digit).
 * @param {unknown} text
 * @returns {string | null}
 */
export function digitSystemOf(text) {
  let found = null;
  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    let system = null;
    if (code >= 0x30 && code <= 0x39) system = "latin";
    else for (const [name, zero] of DIGIT_SYSTEMS) if (code >= zero && code <= zero + 9) system = name;
    if (!system) continue;
    if (found && found !== system) return "mixed";
    found = system;
  }
  return found;
}

// The digit system of a cell that is known to hold a digit.
const systemOf = (raw) => (NON_ASCII_RE.test(raw) ? digitSystemOf(raw) || "latin" : "latin");

// ---------------------------------------------------------------------------
// Currency marks
// ---------------------------------------------------------------------------

// Codes taken as money when they stand right before or after a number. A
// closed list, so "10 NOS", "5 PCS" or "KGS 10" are never read as money.
const CODE_SYMBOL = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", RMB: "¥", ILS: "₪", NIS: "₪",
  KRW: "₩", RUB: "₽", TRY: "₺", VND: "₫", THB: "฿", PHP: "₱",
  AUD: "A$", CAD: "C$", SGD: "S$", HKD: "HK$", NZD: "NZ$", BRL: "R$", MXN: "MX$",
  AED: "AED", SAR: "SAR", QAR: "QAR", KWD: "KWD", BHD: "BHD", OMR: "OMR", CHF: "CHF", ZAR: "ZAR",
  SEK: "SEK", NOK: "NOK", DKK: "DKK", PLN: "PLN", IDR: "IDR", MYR: "MYR", PKR: "PKR", BDT: "BDT",
  LKR: "LKR", NPR: "NPR", EGP: "EGP", NGN: "NGN", KES: "KES",
};
const CODE_CURRENCY = { RMB: "CNY", NIS: "ILS" };

// Currency signs written as one character. An explicit list instead of
// \p{Sc}, so every JavaScript engine the app runs on reads it the same.
const SIGN = "$¢£¤¥￥฿₠-₿﷼";
// "Rs", "Rs.", "INR", and the Hindi "रु" / "रू" for rupees.
const RUPEE_START_RE = /^(?:Rs\.?|RS\.?|rs\.?|Re\.?|INR|₨|र[ुू]\.?)\s*(?=[\d(.+-])/;
const RUPEE_END_RE = /([\d)])\s*(?:Rs\.?|RS\.?|rs\.?|INR|र[ुू]\.?)$/;
const CODE_START_RE = /^([A-Z]{3})\s*(?=[\d(.+-])/;
const CODE_END_RE = /([\d)%])\s*([A-Z]{3})$/;
const SIGN_START_RE = new RegExp(`^([A-Z]{0,2})([${SIGN}])\\s*`);
const SIGN_END_RE = new RegExp(`\\s*([${SIGN}])$`);
const CJK_END_RE = /\s*(円|元)$/;

const withMark = (rest, symbol, currency) => (currency ? { rest: rest.trim(), symbol, currency } : { rest: rest.trim(), symbol });
const plainSign = (sign) => (sign === "￥" ? "¥" : sign);

/**
 * Takes one currency mark off the start or the end of a normalised cell.
 * @param {string} text
 * @returns {{ rest: string, symbol: string, currency?: string } | null}
 */
export function readCurrencyMark(text) {
  let m = RUPEE_START_RE.exec(text);
  if (m) return withMark(text.slice(m[0].length), "₹", m[0].trim() === "₨" ? undefined : "INR");
  m = RUPEE_END_RE.exec(text);
  if (m) return withMark(text.slice(0, m.index + 1), "₹", "INR");
  m = CODE_START_RE.exec(text);
  if (m && CODE_SYMBOL[m[1]]) return withMark(text.slice(m[0].length), CODE_SYMBOL[m[1]], CODE_CURRENCY[m[1]] || m[1]);
  m = CODE_END_RE.exec(text);
  if (m && CODE_SYMBOL[m[2]]) return withMark(text.slice(0, m.index + 1), CODE_SYMBOL[m[2]], CODE_CURRENCY[m[2]] || m[2]);
  m = SIGN_START_RE.exec(text);
  if (m) return withMark(text.slice(m[0].length), `${m[1]}${plainSign(m[2])}`);
  m = SIGN_END_RE.exec(text);
  if (m) return withMark(text.slice(0, m.index), plainSign(m[1]));
  m = CJK_END_RE.exec(text);
  if (m) return withMark(text.slice(0, m.index), "¥", m[1] === "円" ? "JPY" : "CNY");
  return null;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

const BODY_RE = /^\d+(?:[.,' ]\d+)*$/;
const LEADING_MARK_RE = /^([.,])(\d+)$/;
// The rule LUMIQ read numbers by before: digits with commas anywhere and one
// decimal point. Kept as the reading for "the comma is not a decimal mark".
const LOOSE_RE = /^[\d,]*\.?\d+$/;
const YEN_CLUE_RE = /^(JPY|CNY|RMB)\s*|\s*(JPY|CNY|RMB)$/i;
const YEN_CLUES = { jpy: "JPY", cny: "CNY", rmb: "CNY" };
const PLAIN_INTEGER_RE = /^-?\d+$/;
const BARE_RE = /^-?\d+(?:[.,' ]\d+)*$/;
// The letters a number cell may carry (currency words and codes), and
// every other character it may hold. Anything else ("Cust 7", "1/1/2024",
// "10:30") is turned away before the slower reading below.
const MONEY_WORDS_RE = new RegExp(`Rs\\.?|Re\\.?|\\u0930[\\u0941\\u0942]\\.?|[A-Z]{3}|[A-Z]{1,2}(?=[${SIGN}])`, "gi");
const NUMBER_CHARS_RE = new RegExp(`^[\\d\\s.,'()+\\-%/${SIGN}円元]*$`);
function couldBeNumber(s) {
  const rest = /[^\d\s.,'()+\-%/]/.test(s) ? s.replace(MONEY_WORDS_RE, "") : s;
  if (!NUMBER_CHARS_RE.test(rest)) return false;
  const slash = rest.indexOf("/");
  return slash === -1 || (slash === rest.length - 2 && rest.endsWith("/-"));
}

// Thousands grouping: 1,234,567 (western) or 12,34,567 (Indian, commas only).
function groupingOf(groups, mark) {
  if (groups.length < 2) return "none";
  const first = groups[0];
  if (first[0] === "0") return null; // a grouped number never starts with 0
  const rest = groups.slice(1);
  if (first.length <= 3 && rest.every((g) => g.length === 3)) return "western";
  if (
    mark === "," &&
    groups.length >= 3 &&
    first.length <= 2 &&
    rest[rest.length - 1].length === 3 &&
    rest.slice(0, -1).every((g) => g.length === 2)
  ) {
    return "indian";
  }
  return null;
}

// The value of a digit body when `decimal` is the decimal mark, or null
// when the body cannot be written that way.
function readWith(parts, seps, decimal) {
  let whole = parts;
  let fraction = "";
  let groupSeps = seps;
  const at = seps.indexOf(decimal);
  if (at !== -1) {
    if (at !== seps.length - 1) return null; // a decimal mark comes last, once
    whole = parts.slice(0, -1);
    fraction = parts[parts.length - 1];
    groupSeps = seps.slice(0, -1);
  }
  const mark = groupSeps[0] || null;
  if (groupSeps.some((s) => s !== mark)) return null; // one grouping mark per number
  const grouping = groupingOf(whole, mark);
  if (grouping === null) return null;
  const value = Number(`${whole.join("")}${fraction ? `.${fraction}` : ""}`);
  return Number.isFinite(value) ? { value, grouping, mark } : null;
}

function readBody(body) {
  const lead = LEADING_MARK_RE.exec(body);
  if (lead) {
    const one = { value: Number(`0.${lead[2]}`), grouping: "none", mark: null };
    return lead[1] === "." ? { dot: one, comma: null } : { dot: null, comma: one };
  }
  if (!BODY_RE.test(body)) return null;
  const parts = body.split(/[.,' ]/);
  const seps = body.replace(/\d/g, "").split("");
  if (seps.length === 0) {
    const plain = { value: Number(body), grouping: "none", mark: null };
    return { dot: plain, comma: plain };
  }
  const dot = readWith(parts, seps, ".");
  const comma = readWith(parts, seps, ",");
  return dot || comma ? { dot, comma } : null;
}

/**
 * One cell, read every way it can be. Returns null when it is not a number.
 *   dot    the value if "." is the decimal mark (null when impossible)
 *   comma  the value if "," is the decimal mark (null when impossible)
 *   loose  the value with every comma ignored, as LUMIQ read it before
 *          ("1,5" gives 15), or null
 * @param {unknown} raw
 * @returns {null | { kind: "number" | "percent" | "money", symbol: string | null, currency?: string,
 *   dot: number | null, comma: number | null, loose: number | null, negative: boolean, brackets: boolean,
 *   grouping: string, groupMark: string | null, system: string, typed?: boolean }}
 */
export function readNumberCell(raw) {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return { kind: "number", symbol: null, dot: raw, comma: raw, loose: raw, negative: raw < 0, brackets: false, grouping: "none", groupMark: null, system: "latin", typed: true };
  }
  if (typeof raw !== "string") return null;
  let s = normalizeCellText(raw).trim();
  if (!s) return null;
  // The quick road for the most common cell: a plain whole number.
  if (PLAIN_INTEGER_RE.test(s)) {
    const value = Number(s);
    return { kind: "number", symbol: null, dot: value, comma: value, loose: value, negative: value < 0, brackets: false, grouping: "none", groupMark: null, system: systemOf(raw) };
  }
  if (!/\d/.test(s) || !couldBeNumber(s)) return null;
  let percent = false;
  let negative = false;
  let brackets = false;
  let money = false;
  let symbol = null;
  let currency;
  // Digits and separators only ("1,234.50", "-12,5"): nothing to peel.
  const bare = BARE_RE.test(s);
  if (bare && s[0] === "-") {
    negative = true;
    s = s.slice(1);
  }
  for (let round = 0; round < 6 && !bare; round++) {
    const before = s;
    if (s.endsWith("%")) {
      percent = true;
      s = s.slice(0, -1).trim();
    }
    const wrapped = /^\((.+)\)$/.exec(s);
    if (wrapped) {
      negative = true;
      brackets = true;
      s = wrapped[1].trim();
    }
    if (s.endsWith("/-")) {
      money = true;
      s = s.slice(0, -2).trim();
    }
    const clue = YEN_CLUE_RE.exec(s);
    if (clue) {
      currency = YEN_CLUES[(clue[1] || clue[2]).toLowerCase()];
      if (!symbol) symbol = "¥";
      s = (clue[1] ? s.slice(clue[0].length) : s.slice(0, clue.index)).trim();
    }
    const mark = readCurrencyMark(s);
    if (mark) {
      if (!symbol) symbol = mark.symbol;
      if (!currency && mark.currency) currency = mark.currency;
      s = mark.rest;
    }
    const signed = /^([-+])\s*(.+)$/.exec(s);
    if (signed) {
      if (signed[1] === "-") negative = true;
      s = signed[2];
    } else if (/^\d.*-$/.test(s)) {
      negative = true;
      s = s.slice(0, -1).trim();
    }
    if (s === before) break;
  }
  const body = readBody(s);
  if (!body) return null;
  const sign = negative ? -1 : 1;
  const one = body.dot || body.comma;
  const out = {
    kind: percent ? "percent" : symbol || money ? "money" : "number",
    symbol,
    dot: body.dot ? sign * body.dot.value : null,
    comma: body.comma ? sign * body.comma.value : null,
    loose: LOOSE_RE.test(s) ? sign * Number(s.replace(/,/g, "")) : null,
    negative,
    brackets,
    grouping: one.grouping,
    groupMark: one.mark,
    system: systemOf(raw),
  };
  if (currency) out.currency = currency;
  return out;
}

/**
 * What one cell says about its column's decimal mark:
 *   "dot" / "comma"  only that reading is possible
 *   "either"         both are possible and differ (1,234 or 1.234)
 *   "same"           nothing to decide (1234, 1 234)
 * @param {{ dot: number | null, comma: number | null }} reading
 */
export function evidenceOf(reading) {
  if (reading.dot !== null && reading.comma !== null) return reading.dot === reading.comma ? "same" : "either";
  return reading.dot !== null ? "dot" : "comma";
}

/**
 * The value of a reading under the column's decimal mark. A cell that can
 * only be read the other way is still read, and reported as odd. When the
 * person chose "." (the comma is not a decimal mark), "1,5" reads as 15.
 * @param {ReturnType<typeof readNumberCell>} reading
 * @param {"." | ","} [decimal]
 * @param {{ chosen?: boolean }} [options]
 * @returns {{ value: number | null, odd: boolean }}
 */
export function valueOf(reading, decimal = ".", { chosen = false } = {}) {
  if (!reading) return { value: null, odd: false };
  if (decimal === ",") {
    if (reading.comma !== null) return { value: reading.comma, odd: false };
    return { value: reading.dot ?? reading.loose, odd: true };
  }
  if (reading.dot !== null) return { value: reading.dot, odd: false };
  if (chosen && reading.loose !== null) return { value: reading.loose, odd: true };
  return { value: reading.comma ?? reading.loose, odd: true };
}

const EXAMPLES = 3;

function remember(list, raw) {
  if (list.length >= EXAMPLES) return;
  const text = String(raw).trim();
  if (!list.includes(text)) list.push(text);
}

/** A fresh tally of a column's number cells, for decideDecimalMark. */
export function createDecimalTally() {
  return { dot: 0, comma: 0, either: 0, same: 0, eitherDot: 0, eitherComma: 0, looseComma: 0, examples: { dot: [], comma: [], either: [] } };
}

/**
 * Counts one number cell into a column's tally.
 * @param {ReturnType<typeof createDecimalTally>} tally
 * @param {unknown} raw
 * @param {NonNullable<ReturnType<typeof readNumberCell>>} reading
 */
export function addToDecimalTally(tally, raw, reading) {
  if (reading.typed) {
    tally.same++;
    return;
  }
  const kind = evidenceOf(reading);
  tally[kind]++;
  if (kind === "same") return;
  if (kind === "either") {
    if (String(raw).includes(",")) tally.eitherComma++;
    else tally.eitherDot++;
  }
  // "1,5" could, at a stretch, be a sloppy "15" (it was read that way
  // before); "0,5" or "1.234,56" could not.
  if (kind === "comma" && reading.loose !== null && !/(^|\D)0,/.test(String(raw))) tally.looseComma++;
  remember(tally.examples[kind], raw);
}

/**
 * Decides one column's decimal mark from its tally. `prior` is the mark the
 * file's other columns settled on, or null.
 *   seen               the column itself shows it (1,5 or 1,234.50)
 *   single             one value alone says comma (only "1,5"): truly
 *                      unsure whether it is one and a half or fifteen
 *   mixed              cells written both ways; the larger side wins, low
 *   other-columns      nothing here settles it; another column did
 *   assumed            nothing settles it: "1,234" is read as a thousand
 *                      and more, as always (medium); "1.234" could as well
 *                      be a thousands dot (low)
 *   nothing-to-decide  whole numbers only
 * @param {ReturnType<typeof createDecimalTally>} tally
 * @param {"." | "," | null} [prior]
 * @returns {{ decimal: "." | ",", confidence: "high" | "medium" | "low", reason: string, examples: string[], mixed: string[] }}
 */
export function decideDecimalMark(tally, prior = null) {
  const ex = tally.examples;
  const done = (decimal, confidence, reason, mixed = []) => ({
    decimal,
    confidence,
    reason,
    examples: [...(decimal === "," ? ex.comma : ex.dot), ...ex.either].slice(0, EXAMPLES),
    mixed,
  });
  if (tally.dot > 0 && tally.comma > 0) {
    const decimal = tally.comma > tally.dot ? "," : ".";
    return done(decimal, "low", "mixed", decimal === "," ? ex.dot.slice() : ex.comma.slice());
  }
  if (tally.comma > 0) {
    // One value alone ("1,5") that could at a stretch be a sloppy "15", and
    // nothing written with a dot that agrees with it.
    const thin = ex.comma.length === 1 && tally.looseComma > 0 && tally.eitherDot === 0;
    if (!thin) return done(",", "high", "seen");
    if (prior === ",") return done(",", "medium", "other-columns");
    // Beside "1,200"-style cells it must not turn them all into 1.2: they keep
    // their thousands reading until the person says otherwise.
    return done(tally.eitherComma > 0 ? "." : ",", "low", "single", tally.eitherComma > 0 ? ex.comma.slice() : []);
  }
  if (tally.dot > 0) return done(".", "high", "seen");
  if (tally.either > 0) {
    if (prior === "," || prior === ".") return done(prior, "medium", "other-columns");
    return done(".", tally.eitherDot > 0 ? "low" : "medium", "assumed");
  }
  return done(".", "high", "nothing-to-decide");
}

// ---------------------------------------------------------------------------
// Calendar arithmetic on plain numbers
// ---------------------------------------------------------------------------

const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** @param {number} y @param {number} m @param {number} d */
export function isValidDate(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1) return false;
  const days = m === 2 && isLeapYear(y) ? 29 : MONTH_DAYS[m - 1];
  return d <= days;
}

const pad = (n) => String(n).padStart(2, "0");
/** @param {number} y @param {number} m @param {number} d */
export const isoDate = (y, m, d) => `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;
const isoMonth = (y, m) => `${String(y).padStart(4, "0")}-${pad(m)}`;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11,
  november: 11, dec: 12, december: 12,
};

const TIME = "(\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:\\s?([AaPp])\\.?[Mm]\\.?)?";
const ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:([T ])(.+))?$/;
const YMD_RE = /^(\d{4})([/.])(\d{1,2})\2(\d{1,2})$/;
const NUMERIC_DATE_RE = new RegExp(`^(\\d{1,2})([/\\-.])(\\d{1,2})\\2(\\d{4}|\\d{2})(?:[ T,]+${TIME})?$`);
const DAY_NAME_RE = new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?[ \\-./,]*([A-Za-z]{3,9})\\.?[ \\-./,]*(\\d{4}|\\d{2})(?:[ T,]+${TIME})?$`);
const NAME_DAY_RE = new RegExp(`^([A-Za-z]{3,9})\\.?[ \\-]*(\\d{1,2})(?:st|nd|rd|th)?,?[ ]+(\\d{4})(?:[ T,]+${TIME})?$`);
const NAME_YEAR_RE = /^([A-Za-z]{3,9})\.?[ \-/,]*(\d{4})$/;
const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;

export const DEFAULT_PIVOT = 50;

// A two-digit year: below the pivot is 20xx, from the pivot up is 19xx.
const fullYear = (text, pivot) => (text.length === 4 ? Number(text) : Number(text) < pivot ? 2000 + Number(text) : 1900 + Number(text));

function clock(h, min, sec, half) {
  if (h === undefined) return "";
  let hour = Number(h);
  if (half) {
    const pm = half.toLowerCase() === "p";
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
  }
  if (hour > 23 || Number(min) > 59 || (sec !== undefined && Number(sec) > 59)) return null;
  return ` ${pad(hour)}:${min}${sec !== undefined ? `:${sec}` : ""}`;
}

const monthOf = (word) => MONTHS[String(word).toLowerCase()];

/**
 * One cell as a date, or null.
 *   form "fixed"    the date is certain: `iso` is "2024-01-31" (or "2024-01"
 *                   for a month), `text` what to store (the ISO date plus
 *                   any time); `fiscal` marks "2011-12", which is also how a
 *                   financial year is written
 *   form "numeric"  05/01/2024: `a` and `b` are the two small numbers in the
 *                   order written; `dmy` / `mdy` say which readings are real
 *                   dates; `time` is "" or " HH:MM[:SS]"
 * @param {unknown} raw
 * @param {number} [pivot]
 * @returns {null | { form: "fixed", iso: string, text: string, precision: "day" | "month", fiscal?: boolean }
 *   | { form: "numeric", a: number, b: number, year: number, time: string, dmy: boolean, mdy: boolean, shortYear: boolean }}
 */
export function readDateCell(raw, pivot = DEFAULT_PIVOT) {
  if (typeof raw !== "string") return null;
  const s = normalizeCellText(raw).trim().replace(/\s+/g, " ");
  if (!s || s.length > 40 || !/\d/.test(s)) return null;
  // Every date shape starts with a digit or with a month name: "Cust 7" or
  // "R2" are turned away here, before the slower shapes below.
  const lead = s.charCodeAt(0);
  if (lead < 48 || lead > 57) {
    const word = /^[A-Za-z]+/.exec(s);
    if (!word || !monthOf(word[0])) return null;
  }
  let m = ISO_RE.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (!isValidDate(y, mo, d)) return null;
    const iso = isoDate(y, mo, d);
    // Whatever follows the date (a time, a zone) is kept as written.
    return { form: "fixed", iso, text: `${iso}${m[4] ? `${m[4]}${m[5]}` : ""}`, precision: "day" };
  }
  m = YMD_RE.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[3]), Number(m[4])];
    return isValidDate(y, mo, d) ? { form: "fixed", iso: isoDate(y, mo, d), text: isoDate(y, mo, d), precision: "day" } : null;
  }
  m = NUMERIC_DATE_RE.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    const year = fullYear(m[4], pivot);
    const time = clock(m[5], m[6], m[7], m[8]);
    if (time === null) return null;
    const dmy = isValidDate(year, b, a);
    const mdy = isValidDate(year, a, b);
    if (!dmy && !mdy) return null;
    return { form: "numeric", a, b, year, time, dmy, mdy, shortYear: m[4].length === 2 };
  }
  m = DAY_NAME_RE.exec(s);
  if (m && monthOf(m[2])) {
    const [d, mo, y] = [Number(m[1]), monthOf(m[2]), fullYear(m[3], pivot)];
    const time = clock(m[4], m[5], m[6], m[7]);
    if (time === null || !isValidDate(y, mo, d)) return null;
    return { form: "fixed", iso: isoDate(y, mo, d), text: `${isoDate(y, mo, d)}${time}`, precision: "day" };
  }
  m = NAME_DAY_RE.exec(s);
  if (m && monthOf(m[1])) {
    const [mo, d, y] = [monthOf(m[1]), Number(m[2]), Number(m[3])];
    const time = clock(m[4], m[5], m[6], m[7]);
    if (time === null || !isValidDate(y, mo, d)) return null;
    return { form: "fixed", iso: isoDate(y, mo, d), text: `${isoDate(y, mo, d)}${time}`, precision: "day" };
  }
  m = NAME_YEAR_RE.exec(s);
  if (m && monthOf(m[1])) {
    const iso = isoMonth(Number(m[2]), monthOf(m[1]));
    return { form: "fixed", iso, text: iso, precision: "month" };
  }
  m = YEAR_MONTH_RE.exec(s);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) {
    const fiscal = Number(m[2]) === (Number(m[1]) + 1) % 100;
    return { form: "fixed", iso: s, text: s, precision: "month", fiscal };
  }
  return null;
}

/**
 * A cell that reads as a date (a financial year such as "2011-12" alone
 * does not count).
 * @param {unknown} raw
 */
export function looksLikeDateText(raw) {
  const cell = readDateCell(raw);
  return Boolean(cell) && !(cell.form === "fixed" && cell.fiscal);
}

/**
 * The two ways a 05/01/2024-style cell can be read, as ISO dates (null for
 * a way that is not a real date). Fixed dates give the same date twice.
 * @param {unknown} raw
 * @param {number} [pivot]
 * @returns {{ dmy: string | null, mdy: string | null } | null}
 */
export function dateReadings(raw, pivot = DEFAULT_PIVOT) {
  const cell = readDateCell(raw, pivot);
  if (!cell) return null;
  if (cell.form === "fixed") return { dmy: cell.iso, mdy: cell.iso };
  return { dmy: cell.dmy ? isoDate(cell.year, cell.b, cell.a) : null, mdy: cell.mdy ? isoDate(cell.year, cell.a, cell.b) : null };
}

// A sortable key for a date under one reading (an impossible reading still
// gets a key; only its order is used).
function keyOf(cell, order) {
  if (cell.form === "fixed") {
    const [y, mo, d] = cell.iso.split("-").map(Number);
    return y * 10000 + mo * 100 + (d || 0);
  }
  return order === "dmy" ? cell.year * 10000 + cell.b * 100 + cell.a : cell.year * 10000 + cell.a * 100 + cell.b;
}

/** A fresh tally of a column's date cells, for decideDateOrder. */
export function createDateTally() {
  const run = () => ({ last: null, up: true, down: true });
  return { dmy: 0, mdy: 0, either: 0, examples: { dmy: [], mdy: [], either: [] }, dated: 0, distinct: [], runs: { dmy: run(), mdy: run() } };
}

/**
 * Counts one date cell into a column's tally, in row order.
 * @param {ReturnType<typeof createDateTally>} tally
 * @param {unknown} raw
 * @param {NonNullable<ReturnType<typeof readDateCell>>} cell
 */
export function addToDateTally(tally, raw, cell) {
  if (cell.form === "numeric") {
    const kind = cell.dmy && cell.mdy ? "either" : cell.dmy ? "dmy" : "mdy";
    tally[kind]++;
    remember(tally.examples[kind], raw);
  }
  // Rows in date order one way but not the other are evidence too.
  tally.dated++;
  for (const order of ["dmy", "mdy"]) {
    const run = tally.runs[order];
    const key = keyOf(cell, order);
    if (run.last !== null) {
      if (key < run.last) run.up = false;
      if (key > run.last) run.down = false;
    }
    run.last = key;
  }
  if (tally.distinct.length < 3) {
    const key = keyOf(cell, "dmy");
    if (!tally.distinct.includes(key)) tally.distinct.push(key);
  }
}

/**
 * Decides day-first or month-first for one column. `prior` is the order the
 * file's other date columns showed, or null. `order` is null when the column
 * has no 05/01/2024-style cell: there is nothing to decide.
 *   seen           a part above 12 shows it (13/01/2024)
 *   mixed          cells written both ways: a stray cell or two does not
 *                  flip the column (low); an even split is "ambiguous"
 *   row-order      the rows are in date order one way only (medium)
 *   other-columns  another date column of the file showed it (medium)
 *   undecided      nothing settles it: "ambiguous", never a guess
 * @param {ReturnType<typeof createDateTally>} tally
 * @param {"dmy" | "mdy" | null} [prior]
 * @returns {{ order: "dmy" | "mdy" | "ambiguous" | null, confidence: "high" | "medium" | "low", reason: string, examples: string[] }}
 */
export function decideDateOrder(tally, prior = null) {
  const numeric = tally.dmy + tally.mdy + tally.either;
  const ex = tally.examples;
  const done = (order, confidence, reason) => ({
    order,
    confidence,
    reason,
    examples: (order === "dmy" || order === "mdy" ? [...ex[order], ...ex.either] : [...ex.either, ...ex.dmy, ...ex.mdy]).slice(0, EXAMPLES),
  });
  if (numeric === 0) return { order: null, confidence: "high", reason: "nothing-to-decide", examples: [] };
  if (tally.dmy > 0 && tally.mdy === 0) return done("dmy", "high", "seen");
  if (tally.mdy > 0 && tally.dmy === 0) return done("mdy", "high", "seen");
  if (tally.dmy > 0 && tally.mdy > 0) {
    const few = Math.min(tally.dmy, tally.mdy) / (tally.dmy + tally.mdy) <= 0.1;
    return few ? done(tally.dmy > tally.mdy ? "dmy" : "mdy", "low", "mixed") : done("ambiguous", "low", "mixed");
  }
  const ordered = (run) => tally.dated >= 5 && tally.distinct.length >= 3 && (run.up || run.down);
  const asDmy = ordered(tally.runs.dmy);
  const asMdy = ordered(tally.runs.mdy);
  if (asDmy !== asMdy) return done(asDmy ? "dmy" : "mdy", "medium", "row-order");
  if (prior === "dmy" || prior === "mdy") return done(prior, "medium", "other-columns");
  return done("ambiguous", "low", "undecided");
}

/**
 * What to store for one cell of a date column: the ISO date (plus any time)
 * when the date is known, otherwise the cell as written.
 * @param {unknown} raw
 * @param {string | undefined} order
 * @param {number} [pivot]
 * @returns {{ value: unknown, read: boolean }}
 */
export function canonicalDate(raw, order, pivot = DEFAULT_PIVOT) {
  const written = typeof raw === "string" ? raw.trim() : raw;
  const cell = readDateCell(raw, pivot);
  if (!cell) return { value: written, read: false };
  if (cell.form === "fixed") return { value: cell.text, read: true };
  if (order !== "dmy" && order !== "mdy") return { value: written, read: false };
  if (!cell[order]) return { value: written, read: false };
  const iso = order === "dmy" ? isoDate(cell.year, cell.b, cell.a) : isoDate(cell.year, cell.a, cell.b);
  return { value: `${iso}${cell.time}`, read: true };
}
