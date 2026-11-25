// Column types are decided from ALL non-blank values of a column,
// never from the first row alone. Types: number, percent, money,
// date, text. How a column writes its numbers and dates is decided per
// column too (numberReading.js): which character is the decimal mark
// (1,234.5 or 1.234,5, Indian 1,23,456.78), whether 05/01/2024 is day
// first or month first, and how sure that is. Numeric cells accept
// grouping, currency marks before or after (₹, Rs., $, €, £, INR, USD),
// (1,200) for -1200, a trailing "/-", percent signs and Devanagari or
// Arabic-Indic digits; blanks stay null.

import { isBlank } from "../lib/stats.js";
import {
  readNumberCell,
  valueOf,
  createDecimalTally,
  addToDecimalTally,
  decideDecimalMark,
  readDateCell,
  createDateTally,
  addToDateTally,
  decideDateOrder,
  canonicalDate,
  dateReadings,
  looksLikeDateText,
  DEFAULT_PIVOT,
} from "./numberReading.js";

export const NUMERIC_TYPES = Object.freeze(["number", "percent", "money"]);

// A few bad cells must not demote a whole numeric column; cells that
// do not parse become null (blank) instead.
const NUMERIC_SHARE = 0.8;
const DATE_SHARE = 0.9;
const EXAMPLES = 5;

/**
 * Parses one cell as a number if it looks like one: "1,20,000" → 120000,
 * "₹1,200" → 1200 (money), "1,200円" → 1200 (money in yen), "12.5%" →
 * 12.5 (percent), "(1,200)" → -1200. `typeInfo` is the column's type when
 * it is known: its `decimal` says how the column writes decimals. Without
 * it a cell that can only be a decimal comma ("1,5") reads as one, and
 * "1,234" stays one thousand two hundred and thirty-four. Returns null
 * for anything that is not a number.
 * @param {unknown} raw
 * @param {{ decimal?: string } | null} [typeInfo]
 * @returns {{ value: number, kind: "number" | "percent" | "money", symbol: string | null, currency?: string } | null}
 */
export function parseNumericString(raw, typeInfo) {
  const reading = readNumberCell(raw);
  if (!reading) return null;
  const decimal = typeInfo?.decimal === "," ? "," : ".";
  const { value } = valueOf(reading, decimal, { chosen: typeInfo?.decimal === "." });
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const parsed = { value, kind: reading.kind, symbol: reading.symbol };
  if (reading.currency) parsed.currency = reading.currency;
  return parsed;
}

export function looksLikeDate(raw) {
  return looksLikeDateText(raw);
}

// The running account of one column while its rows go by. Tallies only:
// nothing is kept per cell, so a 200,000-row file costs no more memory.
function freshColumn() {
  return {
    total: 0,
    blank: 0,
    numbers: 0,
    dates: 0,
    fiscal: 0,
    plainMonth: false,
    kinds: { number: 0, percent: 0, money: 0 },
    symbol: null,
    currency: null,
    brackets: 0,
    systems: [],
    examples: [],
    decimal: createDecimalTally(),
    date: createDateTally(),
    dateSample: null,
  };
}

function readCell(st, v, pivot) {
  if (isBlank(v)) {
    st.blank++;
    return;
  }
  st.total++;
  if (st.examples.length < EXAMPLES) {
    const text = typeof v === "string" ? v.trim() : String(v);
    if (!st.examples.includes(text)) st.examples.push(text);
  }
  const reading = readNumberCell(v);
  if (reading) {
    st.numbers++;
    st.kinds[reading.kind]++;
    if (!st.symbol && reading.symbol) st.symbol = reading.symbol;
    if (!st.currency && reading.currency) st.currency = reading.currency;
    if (reading.brackets) st.brackets++;
    if (reading.system !== "latin" && !st.systems.includes(reading.system)) st.systems.push(reading.system);
    addToDecimalTally(st.decimal, v, reading);
    return;
  }
  if (typeof v !== "string") return;
  const cell = readDateCell(v, pivot);
  if (!cell) return;
  if (cell.form === "fixed" && cell.fiscal) st.fiscal++;
  else {
    st.dates++;
    if (cell.form === "fixed" && cell.precision === "month") st.plainMonth = true;
  }
  addToDateTally(st.date, v, cell);
  if (st.dateSample === null && cell.form === "numeric" && cell.dmy && cell.mdy && cell.a !== cell.b) st.dateSample = v;
}

const majority = (values) => {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null;
  for (const [v, n] of counts) if (best === null || n > counts.get(best)) best = v;
  return best;
};

function numberSubtype(kinds) {
  return kinds.percent >= kinds.money && kinds.percent >= kinds.number
    ? "percent"
    : kinds.money >= kinds.number
      ? "money"
      : "number";
}

// A cell of the column whose two readings differ, for a question on screen:
// `mark` is the character in question, `asDot` the value when "." is the
// decimal mark (the comma separates thousands, or is ignored when it cannot
// be a thousands comma: `commaIgnored`), `asComma` when "," is.
function numberSampleOf(tally) {
  const candidates = [...tally.examples.either, ...tally.examples.comma, ...tally.examples.dot];
  for (const raw of candidates) {
    const reading = readNumberCell(raw);
    if (!reading) continue;
    const asDot = valueOf(reading, ".", { chosen: true }).value;
    const asComma = valueOf(reading, ",").value;
    if (asDot === null || asComma === null || asDot === asComma) continue;
    const mark = raw.includes(",") ? "," : ".";
    return { raw, mark, asDot, asComma, commaIgnored: mark === "," && reading.dot === null };
  }
  return null;
}

function dateSampleOf(raw, pivot) {
  if (raw === null) return null;
  const readings = dateReadings(raw, pivot);
  return readings ? { raw: String(raw).trim(), ...readings } : null;
}

function decideColumns(columns, state, { overrides = {}, pivot = DEFAULT_PIVOT } = {}) {
  // Each column on its own first.
  const firstMark = {};
  const firstOrder = {};
  for (const col of columns) {
    firstMark[col] = decideDecimalMark(state[col].decimal);
    firstOrder[col] = decideDateOrder(state[col].date);
  }
  // What the file's clear columns of numbers and of dates say, for columns
  // that say nothing.
  const mostly = (count, st, share) => st.total > 0 && count / st.total >= share;
  const markPrior = majority(
    columns.filter((c) => firstMark[c].reason === "seen" && mostly(state[c].numbers, state[c], NUMERIC_SHARE)).map((c) => firstMark[c].decimal),
  );
  const orderPrior = majority(
    columns.filter((c) => firstOrder[c].reason === "seen" && mostly(state[c].dates, state[c], DATE_SHARE)).map((c) => firstOrder[c].order),
  );

  const types = {};
  const decisions = {};
  for (const col of columns) {
    const st = state[col];
    const forced = overrides[col] || {};
    let number = firstMark[col];
    if ((number.reason === "assumed" || number.reason === "single") && markPrior) number = decideDecimalMark(st.decimal, markPrior);
    if (forced.decimal === "," || forced.decimal === ".") number = { ...number, decimal: forced.decimal, confidence: "high", reason: "chosen" };
    let date = firstOrder[col];
    if (date.reason === "undecided" && orderPrior) date = decideDateOrder(st.date, orderPrior);
    if (forced.dateOrder === "dmy" || forced.dateOrder === "mdy") date = { ...date, order: forced.dateOrder, confidence: "high", reason: "chosen" };

    // "2011-12" is a month only when the column also holds a month that
    // cannot be a financial year ("2011-07"); otherwise it stays text.
    const dates = st.dates + (st.plainMonth ? st.fiscal : 0);
    let type = "text";
    if (st.total > 0 && st.numbers / st.total >= NUMERIC_SHARE) type = numberSubtype(st.kinds);
    else if (st.total > 0 && dates / st.total >= DATE_SHARE) type = "date";
    let confidence = st.total === 0 ? "low" : "high";
    if (type !== "text") {
      if ((type === "date" ? dates : st.numbers) / st.total < 0.98) confidence = "medium";
    } else if (st.total > 0 && (st.numbers + dates) / st.total >= 0.5) {
      confidence = "medium"; // half the cells look like numbers or dates
    }
    const chosenType = typeof forced.type === "string" && forced.type ? forced.type : null;
    if (chosenType) {
      type = chosenType;
      confidence = "high";
    }

    let typeInfo = { type };
    if (NUMERIC_TYPES.includes(type)) {
      // A symbol seen in the column travels with it, as always; a type the
      // person chose keeps it only for money.
      if (st.symbol && (!chosenType || chosenType === "money")) {
        typeInfo = { type, symbol: st.symbol, ...(st.currency ? { currency: st.currency } : {}) };
      }
      if (number.decimal === ",") typeInfo.decimal = ",";
      else if (number.reason === "chosen") typeInfo.decimal = ".";
    } else if (type === "date" && date.order) {
      typeInfo.dateOrder = date.order;
    }
    types[col] = typeInfo;

    const numeric = NUMERIC_TYPES.includes(type);
    const unreadable = type === "date" ? st.total - dates : numeric ? st.total - st.numbers : 0;
    // Cells that can only be read the other way round (a "3,5" among
    // "1,234.50"): still read, and counted so a screen can say so.
    const odd = numeric ? (number.decimal === "," ? st.decimal.dot : st.decimal.comma) : 0;
    const numberShown = numeric && st.numbers > 0;
    const dateShown = type === "date" && date.order !== null;
    const ambiguous =
      (numberShown && number.confidence === "low") || (dateShown && (date.order === "ambiguous" || date.confidence === "low"));
    decisions[col] = {
      column: col,
      type,
      typeInfo,
      confidence,
      ambiguous,
      counts: { total: st.total, blank: st.blank, numbers: st.numbers, dates, unreadable, fiscal: st.fiscal, odd },
      examples: st.examples.slice(),
      number:
        st.numbers > 0
          ? {
              decimal: number.decimal,
              confidence: number.confidence,
              reason: number.reason,
              examples: number.examples,
              mixed: number.mixed,
              brackets: st.brackets,
              systems: st.systems.slice(),
              sample: numberSampleOf(st.decimal),
            }
          : null,
      date:
        date.order !== null
          ? { order: date.order, confidence: date.confidence, reason: date.reason, examples: date.examples, sample: dateSampleOf(st.dateSample, pivot) }
          : null,
    };
  }
  return { types, decisions };
}

/**
 * The same work as describeColumns, in pieces: add(rows) may be called many
 * times (a screen can breathe between chunks), finish() decides.
 * @param {string[]} columns
 * @param {{ pivot?: number }} [options]
 */
export function createColumnReader(columns, { pivot = DEFAULT_PIVOT } = {}) {
  const state = {};
  for (const col of columns) state[col] = freshColumn();
  return {
    /** @param {Array<Record<string, unknown>>} rows */
    add(rows) {
      for (const row of rows) for (const col of columns) readCell(state[col], row?.[col], pivot);
    },
    /** @param {{ overrides?: Record<string, { type?: string, decimal?: string, dateOrder?: string }> }} [options] */
    finish(options = {}) {
      return decideColumns(columns, state, { ...options, pivot });
    },
  };
}

/**
 * Everything decided about every column: the type that travels with the
 * dataset (`types`) and the full account for an import review
 * (`decisions`). `overrides[column]` may fix { type, decimal, dateOrder }.
 * @param {Array<Record<string, unknown>>} rows
 * @param {string[]} columns
 * @param {{ overrides?: Record<string, { type?: string, decimal?: string, dateOrder?: string }>, pivot?: number }} [options]
 */
export function describeColumns(rows, columns, options = {}) {
  const reader = createColumnReader(columns, options);
  reader.add(rows);
  return reader.finish(options);
}

// Decides every column's type by voting over all non-blank cells.
export function detectColumnTypes(rows, columns, options) {
  return describeColumns(rows, columns, options).types;
}

// Canonical cell values: numeric columns hold numbers (or null for
// blanks and unparsable cells), date columns hold ISO dates wherever
// the date is known (a day/month order nobody settled leaves the cell
// as written), everything else holds trimmed strings (or null for
// blanks). The original look is reconstructed from the column type by
// formatCell.
export function coerceRows(rows, columns, columnTypes, { pivot = DEFAULT_PIVOT } = {}) {
  return rows.map((row) => {
    const out = {};
    for (const col of columns) {
      const v = row?.[col];
      const info = columnTypes[col];
      if (isBlank(v)) {
        out[col] = null;
      } else if (NUMERIC_TYPES.includes(info?.type)) {
        const parsed = parseNumericString(v, info);
        out[col] = parsed ? parsed.value : null;
      } else if (info?.type === "date" && typeof v === "string") {
        out[col] = canonicalDate(v, info.dateOrder, pivot).value;
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
