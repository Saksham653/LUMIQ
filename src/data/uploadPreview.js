// The upload preview (rest of F6): read the file, decide every column
// from all rows (its type, its decimal mark, its date order and how
// sure each is), find rows that look wrong (a total row at the bottom,
// headings repeated further down, blank key cells), surface plain
// warnings, and let the person correct a column's type, decimal mark or
// date order, or the heading row, before anything is loaded. Overrides
// travel with the dataset (columnTypes), so every screen follows them.

import { parseCsvGrid } from "./csv.js";
import { createColumnReader, coerceRows, parseNumericString, NUMERIC_TYPES } from "./columnTypes.js";
import { readNumberCell, readDateCell } from "./numberReading.js";
import { isBlank } from "../lib/stats.js";

export const COLUMN_TYPE_CHOICES = Object.freeze(["number", "percent", "money", "date", "text"]);

// What a phone can open. Provisional until measured on a phone.
export const IMPORT_LIMITS = Object.freeze({ maxCsvBytes: 30 * 1024 * 1024, maxExcelBytes: 10 * 1024 * 1024, maxRows: 200000 });

export const FLAG_REASONS = Object.freeze(["repeated-header", "total-row", "blank-key"]);

const HEADER_SCAN_ROWS = 30;
const HEADER_MIN_SCORE = 0.5;
const KEY_FILL = 0.9;
const MAX_FLAGS = 200;
const CHUNK_ROWS = 5000;
// Above this many rows a found total row is left out without reading the
// columns a second time: one row cannot change what such a column is.
const RECHECK_LIMIT = 20000;
// Headings that would collide with what every JavaScript object carries.
const RESERVED_NAMES = ["__proto__", "constructor", "prototype", "hasOwnProperty", "toString", "valueOf"];
// Words a total row is labelled with (English and Hindi), alone in a cell.
const TOTAL_LABEL_RE =
  /^(?:grand\s*total|sub\s*-?\s*total|totals?|total\s+amount|sum|कुल(?:\s*योग)?|योग|(?:कुल\s*)?जो(?:ड़?|ड़)|टोटल)\s*:?$/i;

const cellText = (cell) => (cell === null || cell === undefined ? "" : String(cell).trim());
const blankCell = (cell) => cellText(cell) === "";
const blankRow = (row) => !row || row.every(blankCell);

// ---------------------------------------------------------------------------
// Where the rows come from
// ---------------------------------------------------------------------------

// A CSV file: every record as a list of cells, row 1 included.
export function csvSource(grid) {
  return { kind: "csv", grid: Array.isArray(grid) ? grid : [] };
}

// An Excel sheet as excelSheetToGrid gives it: row 1 already taken as the
// headings (blank ones named "Column 3"), the rows as objects.
export function tableSource(columns, rows) {
  return { kind: "table", columns: Array.isArray(columns) ? columns : [], rows: Array.isArray(rows) ? rows : [] };
}

function sourceLength(source) {
  return source.kind === "csv" ? source.grid.length : source.rows.length + 1;
}

// One row of the source as a list of cells (row 0 is the first line).
function sourceRow(source, i) {
  if (source.kind === "csv") return source.grid[i] || [];
  if (i === 0) return source.columns.map((c, at) => (c === `Column ${at + 1}` ? "" : c));
  const row = source.rows[i - 1];
  return source.columns.map((c) => row?.[c] ?? "");
}

function headOf(source) {
  const head = [];
  const n = Math.min(sourceLength(source), HEADER_SCAN_ROWS);
  for (let i = 0; i < n; i++) head.push(sourceRow(source, i));
  return head;
}

// papaparse's own naming of a heading row, so a CSV whose headings are in
// row 1 reads exactly as parseCsvText reads it: trimmed, a repeated name
// gets "_1", "_2", an empty name is left out.
function papaHeaderNames(cells) {
  const result = cells.map((c) => (c === null || c === undefined ? "" : String(c)));
  const count = Object.create(null);
  const used = new Set(result);
  for (let i = 0; i < result.length; i++) {
    const header = result[i].trim();
    if (!count[header]) {
      count[header] = 1;
      result[i] = header;
    } else {
      let next;
      let suffix = count[header];
      do {
        next = `${header}_${suffix}`;
        suffix++;
      } while (used.has(next));
      used.add(next);
      result[i] = next;
      count[header]++;
    }
    used.add(header);
  }
  return result;
}

// Headings further down the file: an empty one is named by its position,
// a repeated or reserved one gets " (N)".
function positionalNames(cells, width) {
  const names = [];
  for (let i = 0; i < width; i++) {
    let name = cellText(cells[i]) || `Column ${i + 1}`;
    if (names.includes(name) || RESERVED_NAMES.includes(name)) name = `${name} (${i + 1})`;
    names.push(name);
  }
  return names;
}

// The columns and rows when the headings are in row `headerRow`.
function tableAt(source, headerRow) {
  if (headerRow === 0 && source.kind === "table") return { columns: source.columns, rows: source.rows };
  if (headerRow === 0) {
    const fields = papaHeaderNames(source.grid[0] || []);
    const rows = [];
    for (let r = 1; r < source.grid.length; r++) {
      const cells = source.grid[r];
      const row = {};
      for (let j = 0; j < cells.length && j < fields.length; j++) row[fields[j]] = cells[j];
      rows.push(row);
    }
    return { columns: fields.filter((f) => f !== ""), rows };
  }
  const total = sourceLength(source);
  const headerCells = sourceRow(source, headerRow);
  const body = [];
  let width = headerCells.length;
  for (let r = headerRow + 1; r < total; r++) {
    const cells = sourceRow(source, r);
    if (blankRow(cells)) continue;
    body.push(cells);
    if (cells.length > width) width = cells.length;
  }
  const names = positionalNames(headerCells, width);
  // A column with no heading and nothing in it is a spreadsheet leftover.
  const keep = [];
  for (let c = 0; c < width; c++) {
    if (!blankCell(headerCells[c]) || body.some((cells) => !blankCell(cells[c]))) keep.push(c);
  }
  const columns = keep.map((c) => names[c]);
  const rows = body.map((cells) => {
    const row = {};
    keep.forEach((c, i) => {
      const cell = cells[c];
      row[columns[i]] = cell === null || cell === undefined ? "" : cell;
    });
    return row;
  });
  return { columns, rows };
}

// ---------------------------------------------------------------------------
// Which row holds the headings
// ---------------------------------------------------------------------------

// Words, not a number and not a date: what a heading looks like.
const isLabel = (cell) => {
  const s = cellText(cell);
  return s !== "" && s.length <= 60 && !readNumberCell(cell) && !readDateCell(s);
};
const isValue = (cell) => !blankCell(cell) && (Boolean(readNumberCell(cell)) || Boolean(readDateCell(cellText(cell))));

function scoreRows(grid) {
  const rows = [];
  for (let i = 0; i < grid.length && rows.length < HEADER_SCAN_ROWS; i++) if (!blankRow(grid[i])) rows.push(i);
  const filled = (i) => grid[i].filter((c) => !blankCell(c)).length;
  const counts = rows.map(filled).sort((a, b) => a - b);
  // The table's width: how many cells most of the first rows fill.
  const width = Math.max(1, counts.length ? counts[Math.floor(counts.length / 2)] : 1);
  const scored = rows.map((i, at) => {
    const row = grid[i];
    const cells = row.filter((c) => !blankCell(c));
    if (cells.length < Math.min(2, width)) return { index: i, score: 0, filled: cells.length };
    const labels = cells.filter(isLabel).length;
    const distinct = new Set(cells.map((c) => cellText(c).toLowerCase())).size === cells.length;
    // Columns whose heading is words while the rows under it are numbers
    // or dates: the clearest sign of a heading row.
    const below = rows.slice(at + 1, at + 11);
    let contrast = 0;
    let judged = 0;
    row.forEach((cell, c) => {
      if (!isLabel(cell)) return;
      const under = below.map((r) => grid[r][c]).filter((v) => !blankCell(v));
      if (under.length === 0) return;
      judged++;
      if (under.filter(isValue).length / under.length >= 0.6) contrast++;
    });
    const score =
      (labels / cells.length) * Math.min(1, cells.length / width) + (distinct ? 0.25 : 0) + (judged ? 0.25 * (contrast / judged) : 0);
    return { index: i, score: Math.round(score * 100) / 100, filled: cells.length };
  });
  return { rows, width, scored };
}

/**
 * Scores the first rows as headings and returns the best one, or index -1
 * when no row looks like headings (the file starts with data).
 * @param {unknown[][]} grid
 * @returns {{ index: number, confidence: "high" | "medium" | "low", candidates: { index: number, score: number }[] }}
 */
export function findHeaderRow(grid) {
  const { rows, scored } = scoreRows(Array.isArray(grid) ? grid.map((r) => (Array.isArray(r) ? r : [])) : []);
  if (rows.length === 0) return { index: -1, confidence: "low", candidates: [] };
  const best = Math.max(...scored.map((s) => s.score));
  const candidates = [...scored]
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ index, score }) => ({ index, score }));
  if (best < HEADER_MIN_SCORE) return { index: -1, confidence: "low", candidates };
  // The first row that is as good as the best: files that always had their
  // headings in the first row keep them there.
  const pick = scored.find((s) => s.score >= best * 0.9);
  const first = pick.index === rows[0];
  const confidence = first && pick.score >= 1 ? "high" : first || pick.score >= 1 ? "medium" : "low";
  return { index: pick.index, confidence, candidates };
}

// Row 1 keeps the headings unless it looks like a title above the table
// (it fills less than half the width) and a later row looks like headings.
function pickHeader(source, chosen) {
  const total = sourceLength(source);
  if (Number.isInteger(chosen) && chosen >= 0 && chosen < total) {
    return { row: chosen, chosen: true, detected: false };
  }
  const head = headOf(source);
  const found = findHeaderRow(head);
  if (found.index <= 0) return { row: 0, chosen: false, detected: false };
  const { width, scored } = scoreRows(head);
  const first = scored[0];
  if (first && first.index === 0 && first.filled >= Math.max(2, Math.ceil(width / 2)) && first.score >= HEADER_MIN_SCORE) {
    return { row: 0, chosen: false, detected: false };
  }
  return { row: found.index, chosen: false, detected: true };
}

// ---------------------------------------------------------------------------
// Rows that look wrong
// ---------------------------------------------------------------------------

// The last row, when it is a total of the rows above it: labelled
// ("Total", "Grand total", "कुल"), or unlabelled with every number the sum
// of its column. Adding it to the others would count everything twice.
function bottomTotal(rows, index, columns, types, skip) {
  if (index < 0) return null;
  const row = rows[index];
  const numeric = columns.filter((c) => NUMERIC_TYPES.includes(types[c]?.type));
  if (numeric.length === 0) return null;
  const filled = numeric.filter((c) => parseNumericString(row?.[c], types[c]) !== null);
  if (filled.length === 0) return null;
  const others = columns.filter((c) => !numeric.includes(c));
  const label = others.map((c) => cellText(row?.[c])).find((text) => TOTAL_LABEL_RE.test(text));
  if (label) return { index, label, why: "label" };
  if (others.length === 0 || !others.every((c) => blankCell(row?.[c]))) return null;
  let above = 0;
  for (let i = 0; i < index; i++) if (!skip.has(i)) above++;
  if (above < 3) return null;
  for (const c of filled) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < index; i++) {
      if (skip.has(i)) continue;
      const parsed = parseNumericString(rows[i]?.[c], types[c]);
      if (parsed) {
        sum += parsed.value;
        n++;
      }
    }
    const value = parseNumericString(row[c], types[c]).value;
    if (n < 2 || Math.abs(value - sum) > Math.max(Math.abs(sum) * 0.005, 0.01)) return null;
  }
  return { index, label: null, why: "sum" };
}

// ---------------------------------------------------------------------------
// The preview
// ---------------------------------------------------------------------------

function* readColumns(rows, columns, skip, options) {
  const reader = createColumnReader(columns, { pivot: options.pivot });
  for (let start = 0; start < rows.length; start += CHUNK_ROWS) {
    const part = rows.slice(start, start + CHUNK_ROWS);
    reader.add(skip.size ? part.filter((_, j) => !skip.has(start + j)) : part);
    yield { stage: "columns", done: Math.min(rows.length, start + CHUNK_ROWS), total: rows.length };
  }
  return reader.finish({ overrides: options.overrides?.columns || {} });
}

/**
 * The preview built step by step: yields { stage, done, total } after
 * every few thousand rows, so a phone can draw between steps, and returns
 * the preview. buildUploadPreview and the others run it to the end.
 * options.overrides = { headerRow?: number (0 = the first line),
 *   columns?: { [name]: { type?, decimal?: "." | ",", dateOrder?: "dmy" | "mdy" } },
 *   keepRows?: number[] (indexes of flagged rows to keep after all) }
 * @param {{ kind: string }} source
 * @param {string} name
 * @param {{ overrides?: object, pivot?: number }} [options]
 */
export function* previewSteps(source, name, options = {}) {
  const overrides = options.overrides || {};
  const header = pickHeader(source, overrides.headerRow);
  const { columns, rows } = tableAt(source, header.row);
  if (columns.length === 0 || rows.length === 0) {
    throw new Error(source.kind === "csv" ? "No data rows found in this CSV." : "No data rows found in this sheet.");
  }

  // Headings repeated further down (a second page pasted under the first):
  // found first, so they never sway what a column is.
  const repeats = new Set();
  if (columns.length >= 2) {
    const names = columns.map((c) => c.toLowerCase());
    const need = Math.max(2, Math.ceil(columns.length * 0.6));
    rows.forEach((row, i) => {
      let same = 0;
      for (let c = 0; c < columns.length; c++) {
        const v = row?.[columns[c]];
        if (typeof v === "string" && v.trim().length === names[c].length && v.trim().toLowerCase() === names[c]) same++;
      }
      if (same >= need) repeats.add(i);
    });
  }

  let described = yield* readColumns(rows, columns, repeats, { ...options, overrides });

  // A total row at the bottom.
  let last = rows.length - 1;
  while (last >= 0 && (repeats.has(last) || blankRow(columns.map((c) => rows[last]?.[c])))) last--;
  const total = bottomTotal(rows, last, columns, described.types, repeats);
  if (total && rows.length <= RECHECK_LIMIT) {
    // A "Total" label in a date column must not turn the column into text.
    described = yield* readColumns(rows, columns, new Set([...repeats, total.index]), { ...options, overrides });
  }
  const { types, decisions } = described;

  const keepRows = new Set(Array.isArray(overrides.keepRows) ? overrides.keepRows : []);
  const line = (index) => header.row + 2 + index;
  const flags = [];
  const flagCounts = { "repeated-header": 0, "total-row": 0, "blank-key": 0 };
  const dropped = new Set();
  // What the row holds, so a screen can show which row it is.
  const cellsOf = (index) =>
    columns
      .map((c) => cellText(rows[index]?.[c]))
      .filter((text) => text !== "")
      .slice(0, 4)
      .map((text) => (text.length > 24 ? `${text.slice(0, 23)}…` : text));
  const flag = (index, reason, extra = {}) => {
    flagCounts[reason]++;
    const drop = (reason === "repeated-header" || reason === "total-row") && !keepRows.has(index);
    if (drop) dropped.add(index);
    if (flags.length < MAX_FLAGS) flags.push({ index, row: line(index), reason, drop, ...extra, cells: cellsOf(index) });
  };
  for (const index of repeats) flag(index, "repeated-header");
  if (total) flag(total.index, "total-row", { label: total.label, why: total.why });

  // Key cells: the first column and the first date column, when nearly every
  // row fills them. A row without one is flagged, and stays.
  const live = [];
  for (let i = 0; i < rows.length; i++) if (!dropped.has(i)) live.push(i);
  const fillOf = (c) => live.filter((i) => !blankCell(rows[i]?.[c])).length / Math.max(1, live.length);
  const keys = [columns[0], columns.find((c) => types[c]?.type === "date")].filter(
    (c, i, all) => c !== undefined && all.indexOf(c) === i && fillOf(c) >= KEY_FILL,
  );
  if (keys.length) {
    for (const index of live) {
      for (const c of keys) if (blankCell(rows[index]?.[c])) flag(index, "blank-key", { column: c });
    }
  }
  flags.sort((a, b) => a.index - b.index);

  const columnInfo = columns.map((c) => decisions[c]);
  const asks = [];
  for (const d of columnInfo) {
    if (d.type === "date" && d.date && d.date.reason !== "chosen" && (d.date.order === "ambiguous" || d.date.confidence === "low")) {
      asks.push({ column: d.column, about: "date-order", level: "must", examples: d.date.examples, sample: d.date.sample });
    } else if (NUMERIC_TYPES.includes(d.type) && d.number && d.number.reason !== "chosen" && d.number.confidence === "low") {
      asks.push({
        column: d.column,
        about: "decimal-mark",
        level: "must",
        examples: [...d.number.examples, ...d.number.mixed].slice(0, 3),
        sample: d.number.sample,
      });
    }
  }

  const kept = dropped.size ? rows.filter((_, i) => !dropped.has(i)) : rows;
  const preview = {
    name,
    columns,
    rows: kept,
    rowCount: kept.length,
    types,
    header: { row: header.row, chosen: header.chosen, detected: header.detected },
    columnInfo,
    flags,
    flagCounts,
    asks,
    // Worth a look before the file is saved: a question, a row that looks
    // wrong, or headings found below a title.
    needsReview: asks.length > 0 || flags.length > 0 || header.detected,
    overrides,
  };
  // Kept out of sight (not copied, not saved): what a rebuild reads again.
  Object.defineProperty(preview, "source", { value: source, enumerable: false });
  return preview;
}

function runToEnd(steps) {
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

export function buildUploadPreview(text, name, options) {
  const { grid } = parseCsvGrid(text);
  return buildPreviewFromCsvGrid(grid, name, options);
}

// A CSV already split into records (parseCsvGrid or parseCsvGridAsync).
export function buildPreviewFromCsvGrid(grid, name, options) {
  return runToEnd(previewSteps(csvSource(grid), name, options));
}

// Excel sheets arrive as a ready grid (B7-2) and share the same
// preview shape, type detection and overrides as a CSV.
export function buildPreviewFromGrid(columns, rows, name, options) {
  return runToEnd(previewSteps(tableSource(columns, rows), name, options));
}

/**
 * The same file read again with the person's corrections. `overrides`
 * replaces the previous ones as a whole (see previewSteps).
 * @param {{ name: string, source?: object }} preview
 * @param {object} overrides
 */
export function rebuildPreview(preview, overrides = {}) {
  const source = preview.source || tableSource(preview.columns, preview.rows);
  return runToEnd(previewSteps(source, preview.name, { overrides }));
}

// A type change keeps a detected currency symbol when money stays
// money, and a decimal comma while the column stays a number;
// otherwise the override is just the chosen type.
export function overrideColumnType(types, column, newType) {
  const prev = types[column] || { type: "text" };
  if (prev.type === newType) return types;
  const next = newType === "money" && prev.symbol ? { type: "money", symbol: prev.symbol } : { type: newType };
  if (prev.decimal && NUMERIC_TYPES.includes(newType) && NUMERIC_TYPES.includes(prev.type)) next.decimal = prev.decimal;
  return { ...types, [column]: next };
}

// Plain warnings with honest counts: empty cells per column, values a
// numeric-typed column cannot read as numbers, and rows left out.
export function previewWarnings(preview, types) {
  const warnings = [];
  for (const col of preview.columns) {
    const numeric = NUMERIC_TYPES.includes(types[col]?.type);
    let empty = 0;
    let unreadable = 0;
    for (const row of preview.rows) {
      const v = row?.[col];
      if (isBlank(v)) {
        empty++;
      } else if (numeric && !parseNumericString(v, types[col])) {
        unreadable++;
      }
    }
    if (empty > 0) {
      warnings.push({ column: col, text: `${empty} empty cell${empty === 1 ? "" : "s"} in ${col}` });
    }
    if (unreadable > 0) {
      const tail = unreadable === 1 ? "value in " + col + " could not be read as a number" : "values in " + col + " could not be read as numbers";
      warnings.push({ column: col, text: `${unreadable} ${tail}` });
    }
  }
  for (const f of preview.flags || []) {
    if (f.reason === "total-row" && f.drop) warnings.push({ column: null, text: `Row ${f.row} looks like a total of the rows above, so it was left out` });
    if (f.reason === "repeated-header" && f.drop) warnings.push({ column: null, text: `Row ${f.row} repeats the headings, so it was left out` });
  }
  return warnings;
}

export function datasetFromPreview(preview, types) {
  const data = coerceRows(preview.rows, preview.columns, types);
  return {
    id: crypto.randomUUID(),
    name: preview.name,
    icon: "📁",
    description: `${preview.rows.length} rows • ${preview.columns.length} columns`,
    columns: preview.columns,
    data,
    columnTypes: types,
  };
}
