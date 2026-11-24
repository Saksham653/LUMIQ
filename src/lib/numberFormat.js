// How numbers look in each of LUMIQ's languages, and in the styles people
// can pick by hand. One place decides it for the screens, for what the AI
// is told to write, and for the number check that reads answers back.
// Digits are always 0–9.

const NBSP = " ";
const NNBSP = " "; // narrow no-break space: French grouping
const LRI = "⁦"; // left-to-right isolate…
const PDI = "⁩"; // …and its end, for numbers inside Hebrew text

export const LANGUAGES = ["en", "hi", "es", "fr", "de", "ja", "zh", "he"];

// The ways of writing 1234567.8 that people can choose from by hand.
export const NUMBER_STYLES = ["comma-dot", "dot-comma", "space-comma", "indian", "cjk"];

const SEPARATORS = {
  "comma-dot": { group: ",", decimal: "." },
  "dot-comma": { group: ".", decimal: "," },
  "space-comma": { group: NNBSP, decimal: "," },
  indian: { group: ",", decimal: "." },
  cjk: { group: ",", decimal: "." },
};

// Each language's automatic format. `compact` names how big numbers are
// shortened; `percent` is what follows the number; `currencyAfter` puts the
// currency after the number, the way the language writes it.
const LANGUAGE_FORMATS = {
  en: { style: "comma-dot", compact: "latin", percent: "%", currencyAfter: false },
  hi: { style: "indian", compact: "indian", percent: "%", currencyAfter: false },
  es: { style: "dot-comma", compact: "es", percent: `${NBSP}%`, currencyAfter: true },
  fr: { style: "space-comma", compact: "fr", percent: `${NNBSP}%`, currencyAfter: true },
  de: { style: "dot-comma", compact: "de", percent: `${NBSP}%`, currencyAfter: true },
  ja: { style: "cjk", compact: "ja", percent: "%", currencyAfter: false },
  zh: { style: "cjk", compact: "zh", percent: "%", currencyAfter: false },
  he: { style: "comma-dot", compact: "latin", percent: "%", currencyAfter: true, rtl: true },
};

// Shortened forms, largest first. `scale` is what the number is divided by,
// `from` is where the form starts (K starts at 10,000 so 1,234 stays exact).
const COMPACT = {
  latin: [
    { from: 1e9, scale: 1e9, suffix: "B" },
    { from: 1e6, scale: 1e6, suffix: "M" },
    { from: 1e4, scale: 1e3, suffix: "K" },
  ],
  es: [
    { from: 1e9, scale: 1e9, suffix: `${NBSP}mil${NBSP}M` },
    { from: 1e6, scale: 1e6, suffix: `${NBSP}M` },
    { from: 1e4, scale: 1e3, suffix: `${NBSP}mil` },
  ],
  fr: [
    { from: 1e9, scale: 1e9, suffix: `${NBSP}Md` },
    { from: 1e6, scale: 1e6, suffix: `${NBSP}M` },
    { from: 1e4, scale: 1e3, suffix: `${NBSP}k` },
  ],
  de: [
    { from: 1e9, scale: 1e9, suffix: `${NBSP}Mrd.` },
    { from: 1e6, scale: 1e6, suffix: `${NBSP}Mio.` },
  ],
  indian: [
    { from: 1e7, scale: 1e7, suffix: " crore" },
    { from: 1e5, scale: 1e5, suffix: " lakh" },
  ],
  "indian-hi": [
    { from: 1e7, scale: 1e7, suffix: " करोड़" },
    { from: 1e5, scale: 1e5, suffix: " लाख" },
  ],
  ja: [
    { from: 1e12, scale: 1e12, suffix: "兆" },
    { from: 1e8, scale: 1e8, suffix: "億" },
    { from: 1e4, scale: 1e4, suffix: "万" },
  ],
  zh: [
    { from: 1e12, scale: 1e12, suffix: "万亿" },
    { from: 1e8, scale: 1e8, suffix: "亿" },
    { from: 1e4, scale: 1e4, suffix: "万" },
  ],
};

// The full format for a language, optionally with a style picked by hand
// ("auto" or missing follows the language). Picking lakh/crore or 万/億
// also switches how big numbers are shortened; picking a western style in
// Hindi, Japanese or Chinese shortens with K, M and B.
export function resolveNumberFormat(language = "en", style = "auto") {
  const lang = LANGUAGE_FORMATS[language] ? language : "en";
  const base = LANGUAGE_FORMATS[lang];
  const chosen = NUMBER_STYLES.includes(style) ? style : base.style;
  let compact = base.compact;
  if (chosen === "indian") compact = "indian";
  else if (chosen === "cjk") compact = lang === "zh" ? "zh" : "ja";
  else if (["indian", "ja", "zh"].includes(compact)) compact = "latin";
  if (compact === "indian" && lang === "hi") compact = "indian-hi";
  return {
    language: lang,
    style: chosen,
    ...SEPARATORS[chosen],
    compact,
    percent: base.percent,
    currencyAfter: base.currencyAfter,
    rtl: Boolean(base.rtl),
  };
}

const isolate = (text, format) => (format.rtl ? `${LRI}${text}${PDI}` : text);

function groupDigits(digits, group, indian) {
  if (!indian) return digits.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, group)}${group}${lastThree}` : lastThree;
}

// The tested fallback: digit grouping and decimals without Intl.
function formatPlain(value, format, maxDecimals, minDecimals) {
  const negative = value < 0;
  let [whole, fraction = ""] = Math.abs(value).toFixed(maxDecimals).split(".");
  fraction = fraction.replace(/0+$/, "");
  while (fraction.length < minDecimals) fraction += "0";
  const grouped = groupDigits(whole, format.group, format.style === "indian");
  const text = fraction ? `${grouped}${format.decimal}${fraction}` : grouped;
  const isZero = !/[1-9]/.test(text);
  return negative && !isZero ? `-${text}` : text;
}

// Intl.NumberFormat is used where the phone's Intl writes exactly what the
// fallback writes (Hermes builds without full Intl get the fallback). Each
// style is probed once with numbers that show every rule.
const INTL_LOCALE = {
  "comma-dot": "en-US",
  "dot-comma": "de-DE",
  "space-comma": "fr-FR",
  indian: "en-IN",
  cjk: "ja-JP",
};
const PROBES = [1234567.8, -1234.56, 1234, 0.5, 12, 98765.4321];
const intlCache = new Map();
let intlEnabled = true;

// For tests: turn the Intl path off to exercise the fallback alone.
export function setIntlEnabled(enabled) {
  intlEnabled = enabled;
  intlCache.clear();
}

function intlFormatter(format, maxDecimals, minDecimals) {
  if (!intlEnabled || typeof Intl === "undefined" || typeof Intl.NumberFormat !== "function") return null;
  const key = `${format.style}|${maxDecimals}|${minDecimals}`;
  if (intlCache.has(key)) return intlCache.get(key);
  let formatter = null;
  try {
    const candidate = new Intl.NumberFormat(`${INTL_LOCALE[format.style]}-u-nu-latn`, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
      useGrouping: true,
    });
    const normalise = (text) => text.replace(/[   ]/g, format.group).replace(/−/g, "-");
    const same = PROBES.every(
      (probe) => normalise(candidate.format(probe)) === formatPlain(probe, format, maxDecimals, minDecimals)
    );
    formatter = same ? { format: (v) => normalise(candidate.format(v)) } : null;
  } catch {
    formatter = null;
  }
  intlCache.set(key, formatter);
  return formatter;
}

function formatDigits(value, format, maxDecimals = 2, minDecimals = 0) {
  const intl = intlFormatter(format, maxDecimals, minDecimals);
  const text = intl ? intl.format(value) : formatPlain(value, format, maxDecimals, minDecimals);
  return text === "-0" ? "0" : text;
}

// A plain number with grouping, at most `maxDecimals` decimals (trailing
// zeros dropped): 1234567.8 → "1,234,567.8" / "1.234.567,8" / "12,34,567.8".
export function formatNumber(value, format, { maxDecimals = 2, minDecimals = 0 } = {}) {
  if (!Number.isFinite(value)) return "—";
  return isolate(formatDigits(value, format, maxDecimals, minDecimals), format);
}

// Whole counts, e.g. rows: 1240 → "1,240".
export function formatCount(value, format) {
  return formatNumber(Math.round(value), format, { maxDecimals: 0 });
}

// Exact figures for a result table, so they can be matched with the words of
// an answer: grouping and at most two decimals, never shortened.
export function formatExact(value, format) {
  if (!Number.isFinite(value)) return "—";
  return formatNumber(value, format, { maxDecimals: Number.isInteger(value) ? 0 : 2 });
}

// Three significant digits: 4.677 → 4.68, 46.77 → 46.8, 467.7 → 468.
const compactDecimals = (n) => (n >= 100 ? 0 : n >= 10 ? 1 : 2);

// The shortened form of a non-negative number, split into its digits and
// its unit, or null when it is too small to shorten:
// 4677000 → { number: "4.68", suffix: "M" } / { "4,68", " Mio." } /
// { "46.8", " लाख" } / { "468", "万" }.
function compactParts(abs, format) {
  const steps = COMPACT[format.compact] || COMPACT.latin;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (abs < step.from) continue;
    const scaled = abs / step.scale;
    const decimals = compactDecimals(scaled);
    const rounded = Number(scaled.toFixed(decimals));
    // 999.96K rounds to 1000K: show it with the next larger form instead.
    const bigger = steps[i - 1];
    if (bigger && rounded * step.scale >= bigger.from) {
      const up = abs / bigger.scale;
      return { number: formatDigits(Number(up.toFixed(compactDecimals(up))), format), suffix: bigger.suffix };
    }
    return { number: formatDigits(rounded, format, decimals), suffix: step.suffix };
  }
  return null;
}

// Percentages with one decimal at most: 45 → "45%", "45 %" in French/German.
export function formatPercent(value, format, decimals = 1) {
  if (!Number.isFinite(value)) return "—";
  return isolate(`${formatDigits(value, format, decimals)}${format.percent}`, format);
}

// How a currency symbol from a file is written for this language. ¥ is the
// one symbol two currencies share: a clue in the file (円, 元, JPY, CNY,
// RMB) decides; without one the app language does (yen in Japanese, yuan in
// Chinese), and elsewhere the plain ¥ from the file stays.
export function currencyLabel(symbol, currency, language) {
  if (symbol !== "¥" && symbol !== "￥") return symbol || "";
  if (currency === "JPY") return language === "ja" ? "¥" : "JP¥";
  if (currency === "CNY") return language === "zh" ? "¥" : "CN¥";
  return "¥";
}

// A number for people, not spreadsheets, in parts so a screen can draw the
// unit lighter than the digits: big numbers shortened the way the language
// writes them, money with its own currency, percentages with one decimal.
// Blanks show as a dash, never as 0. `typeInfo` is a column type
// ({ type: "money" | "percent" | "number", symbol?, currency? }). `rtl`
// says the whole amount should stay left-to-right inside Hebrew text.
export function formatAmountParts(value, typeInfo, format) {
  const empty = { prefix: "", number: "—", suffix: "", rtl: false };
  if (value === null || value === undefined || !Number.isFinite(value)) return empty;
  if (typeInfo?.type === "percent") {
    return { prefix: "", number: formatDigits(value, format, 1), suffix: format.percent, rtl: format.rtl };
  }
  const abs = Math.abs(value);
  const decimals = Number.isInteger(abs) ? 0 : abs < 100 ? 2 : 1;
  const parts = compactParts(abs, format) ?? { number: formatDigits(abs, format, decimals), suffix: "" };
  const number = `${value < 0 ? "-" : ""}${parts.number}`;
  const label = typeInfo?.type === "money" ? currencyLabel(typeInfo.symbol, typeInfo.currency, format.language) : "";
  if (!label) return { prefix: "", number, suffix: parts.suffix, rtl: format.rtl };
  if (format.currencyAfter) return { prefix: "", number, suffix: `${parts.suffix}${NBSP}${label}`, rtl: format.rtl };
  return { prefix: label, number, suffix: parts.suffix, rtl: format.rtl };
}

// The same amount as one string: "4.68M", "4,68 Mio. €", "₹46.8 लाख".
export function formatAmount(value, typeInfo, format) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (typeInfo?.type === "percent") return formatPercent(value, format, 1);
  const { prefix, number, suffix } = formatAmountParts(value, typeInfo, format);
  // A minus sign stays in front of the whole amount ("-$1,234"). In Hebrew
  // the amount, currency included, stays left-to-right ("1,234.5 ₪").
  if (number.startsWith("-") && prefix) return isolate(`-${prefix}${number.slice(1)}${suffix}`, format);
  return isolate(`${prefix}${number}${suffix}`, format);
}

// The format in words, for the AI: how to write the numbers in its answer
// so every one of them can be read back and checked.
const STYLE_WORDS = {
  "comma-dot": "commas between thousands and a dot before decimals, for example 1,234,567.8",
  "dot-comma": "dots between thousands and a comma before decimals, for example 1.234.567,8",
  "space-comma": "a space between thousands and a comma before decimals, for example 1 234 567,8",
  indian: "Indian grouping with commas, for example 12,34,567.8",
  cjk: "commas between thousands and a dot before decimals, for example 1,234,567.8",
};
const COMPACT_WORDS = {
  latin: "712K, 4.68M or 1.2B",
  es: "712 mil or 4,68 M",
  fr: "712 k, 4,68 M or 1,2 Md",
  de: "4,68 Mio. or 1,2 Mrd.",
  indian: "12 lakh or 1.2 crore",
  "indian-hi": "12 लाख or 1.2 करोड़",
  ja: "468万 or 1.2億",
  zh: "468万 or 1.2亿",
};

export function describeNumberFormat(format) {
  const percent = format.percent === "%" ? "45%" : "45 %";
  return (
    `Write every number with the digits 0-9, using ${STYLE_WORDS[format.style]}. ` +
    `You may shorten large numbers (for example ${COMPACT_WORDS[format.compact] || COMPACT_WORDS.latin}). ` +
    `Write percentages like ${percent}.`
  );
}
