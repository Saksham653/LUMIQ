import { parseCsvGridAsync } from '@core/data/csv.js';
import { excelSheetToGrid, isExcelFile, readExcelWorkbook } from '@core/data/excel.js';
import { IMPORT_LIMITS, csvSource, previewSteps, rebuildPreview, tableSource } from '@core/data/uploadPreview.js';
import { Directory, File, Paths } from 'expo-file-system';

import type { ColumnKind, ColumnType, Row } from '@/data/types';
import type { StringKey } from '@/i18n';

// Why a file could not be opened. Each has its own words (see
// screens/import-review/strings.ts and import.* in the locales).
export type ImportFailure =
  | 'unsupported'
  | 'notSpreadsheet'
  | 'empty'
  | 'tooLargeCsv'
  | 'tooLargeExcel'
  | 'tooManyRows'
  | 'oneColumn'
  | 'password'
  | 'failed';

// An import failure carrying the reason to show.
export class ImportError extends Error {
  constructor(
    readonly reason: ImportFailure,
    // The file's size in megabytes, for the too-large words.
    readonly sizeMb: number | null = null,
  ) {
    super(reason);
  }

  // The nearest words in the shared dictionary, for callers that only have
  // useT(). The full words for every reason are in
  // screens/import-review/strings.ts (the import's own alert uses them).
  get messageKey(): StringKey {
    if (this.reason === 'unsupported' || this.reason === 'notSpreadsheet') return 'import.unsupported';
    if (this.reason === 'empty') return 'import.empty';
    return 'import.failed';
  }
}

// The person pressed Cancel while the file was being read.
export class ImportCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

export const IMPORT_LIMITS_MB = {
  csv: Math.round(IMPORT_LIMITS.maxCsvBytes / (1024 * 1024)),
  excel: Math.round(IMPORT_LIMITS.maxExcelBytes / (1024 * 1024)),
};
export const IMPORT_MAX_ROWS: number = IMPORT_LIMITS.maxRows;

// From here on a file is "big": its reading is shown on its own screen, with
// a progress line and Cancel.
export const BIG_FILE_BYTES = 1024 * 1024;

export type ImportStage = 'opening' | 'reading' | 'checking';
// rows: rows read or checked so far, total: rows in all (each null when not
// known), fraction: 0..1 or null.
export type ImportProgress = { stage: ImportStage; rows: number | null; total: number | null; fraction: number | null };

// What travels with a column, as the shared engine writes it: a decimal
// comma and a day/month order are added only when the file uses them.
export type ImportColumnType = ColumnType & { decimal?: '.' | ','; dateOrder?: 'dmy' | 'mdy' | 'ambiguous' };

export type Confidence = 'high' | 'medium' | 'low';

export type NumberDecision = {
  decimal: '.' | ',';
  confidence: Confidence;
  reason: string;
  examples: string[];
  mixed: string[];
  // A cell from the file whose two readings differ. `mark` is the character
  // in question. asDot: the value when "." marks decimals (a comma then
  // separates thousands, or is ignored when it cannot: commaIgnored, "1,5"
  // is 15). asComma: the value when "," marks decimals.
  sample: { raw: string; mark: '.' | ','; asDot: number; asComma: number; commaIgnored: boolean } | null;
};

export type DateDecision = {
  order: 'dmy' | 'mdy' | 'ambiguous';
  confidence: Confidence;
  reason: string;
  examples: string[];
  // A cell from the file and the ISO date it is, day first and month first.
  sample: { raw: string; dmy: string | null; mdy: string | null } | null;
};

export type ColumnDecision = {
  column: string;
  type: ColumnKind;
  typeInfo: ImportColumnType;
  confidence: Confidence;
  ambiguous: boolean;
  counts: { total: number; blank: number; numbers: number; dates: number; unreadable: number; fiscal: number; odd: number };
  examples: string[];
  number: NumberDecision | null;
  date: DateDecision | null;
};

export type FlagReason = 'repeated-header' | 'total-row' | 'blank-key';

export type RowFlag = {
  index: number;
  // The row's number in the file (the heading row counts as one).
  row: number;
  reason: FlagReason;
  // Left out of the file unless the person keeps it.
  drop: boolean;
  column?: string;
  label?: string | null;
  // The row's first few filled cells, as written.
  cells: string[];
};

export type ImportAsk = {
  column: string;
  about: 'date-order' | 'decimal-mark';
  level: 'must';
  examples: string[];
  sample: NumberDecision['sample'] | DateDecision['sample'];
};

export type ColumnOverride = { type?: ColumnKind; decimal?: '.' | ','; dateOrder?: 'dmy' | 'mdy' };
export type PreviewOverrides = { headerRow?: number; columns?: Record<string, ColumnOverride>; keepRows?: number[] };

export type ImportPreview = {
  name: string;
  columns: string[];
  // The rows that will be saved (flagged rows that are left out are not here).
  rows: Row[];
  rowCount: number;
  types: Record<string, ImportColumnType>;
  header: { row: number; chosen: boolean; detected: boolean };
  columnInfo: ColumnDecision[];
  flags: RowFlag[];
  flagCounts: Record<FlagReason, number>;
  asks: ImportAsk[];
  // Something to decide or worth showing before the file is saved.
  needsReview: boolean;
  overrides: PreviewOverrides;
};

export type ReadOptions = {
  // Asks which sheet to open; null when the person closes the choice.
  chooseSheet: (names: string[]) => Promise<string | null>;
  onProgress: (progress: ImportProgress) => void;
  isCancelled: () => boolean;
  // The file's name when the phone gave one apart from the file (Open with).
  name?: string;
};

type PreviewStep = { stage: string; done: number; total: number };
type PreviewSteps = Generator<PreviewStep, unknown, unknown>;

const TEXT_TABLE = /\.(csv|tsv|txt)$/i;
const HAS_EXTENSION = /\.[a-z0-9]{1,5}$/i;
const EXCEL_MIME = /spreadsheetml|ms-excel/i;
const TEXT_MIME = /^text\/|csv|tab-separated/i;
const MB = 1024 * 1024;
// Parse in 1 MB pieces: the screen breathes between them.
const CSV_CHUNK = MB;

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '') || name;
}

function mimeType(file: File) {
  try {
    return file.type ?? '';
  } catch {
    return '';
  }
}

// The file's size in bytes, or null when the phone does not say.
export function fileSize(file: File): number | null {
  try {
    const size = file.size;
    return typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : null;
  } catch {
    return null;
  }
}

function fileExists(file: File): boolean {
  try {
    return file.exists;
  } catch {
    return true;
  }
}

const toMb = (bytes: number) => Math.max(1, Math.round(bytes / MB));
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// On Android the picker hands over a content:// link whose last part is not
// the file's name ("document:1000000034", "primary:Download/kirana-sales.csv").
// Copying it into an empty cache folder names the copy after the real file
// ("kirana-sales.csv"). iOS already returns a named file:// copy.
async function withRealName(file: File): Promise<{ file: File; folder: Directory | null }> {
  if (!file.uri.startsWith('content://')) return { file, folder: null };
  const folder = new Directory(Paths.cache, 'picked-file');
  try {
    if (folder.exists) folder.delete();
    folder.create();
    await file.copy(folder);
    const copy = folder.list().find((entry): entry is File => entry instanceof File);
    return copy ? { file: copy, folder } : { file, folder };
  } catch {
    return { file, folder };
  }
}

// UTF-16 text (Excel's "Unicode text" export) read as UTF-8 is full of zero
// characters; decode it from the bytes instead.
function decodeUtf16(bytes: Uint8Array): string {
  let little = true;
  let start = 0;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) start = 2;
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    little = false;
    start = 2;
  } else {
    // No mark: the zero bytes sit on the odd positions in little-endian text.
    let oddZeros = 0;
    let evenZeros = 0;
    for (let i = 0; i < Math.min(bytes.length, 400); i++) {
      if (bytes[i] === 0) {
        if (i % 2 === 1) oddZeros++;
        else evenZeros++;
      }
    }
    little = oddZeros >= evenZeros;
  }
  const parts: string[] = [];
  let codes: number[] = [];
  for (let i = start; i + 1 < bytes.length; i += 2) {
    codes.push(little ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
    if (codes.length === 8192) {
      parts.push(String.fromCharCode(...codes));
      codes = [];
    }
  }
  if (codes.length) parts.push(String.fromCharCode(...codes));
  return parts.join('');
}

// Control characters in the first part of a text: a picture, a zip or
// another program's file renamed to .csv. (Letters in an older encoding are
// not counted: such a file still opens, as it always did.)
function looksBinary(text: string): boolean {
  const head = text.slice(0, 4000);
  if (head.length === 0) return false;
  let odd = 0;
  for (let i = 0; i < head.length; i++) {
    const code = head.charCodeAt(i);
    if (code < 9 || (code > 13 && code < 32)) odd++;
  }
  return odd / head.length > 0.02;
}

async function readCsvText(file: File): Promise<string> {
  const text = await file.text();
  if (!text.slice(0, 2000).includes('\u0000')) return text;
  return decodeUtf16(await file.bytes());
}

// The first bytes of an Excel file: a zip (.xlsx) or an old compound file
// (.xls, and also every password-protected .xlsx).
function excelKind(buffer: ArrayBuffer): 'zip' | 'compound' | 'other' {
  const b = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
  if (b[0] === 0x50 && b[1] === 0x4b) return 'zip';
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'compound';
  return 'other';
}

// How many rows a sheet says it has, from its range ("A1:F200001").
function sheetRows(book: unknown, sheet: string): number | null {
  try {
    const ref = (book as { wb: { Sheets: Record<string, Record<string, unknown>> } }).wb.Sheets[sheet]?.['!ref'];
    if (typeof ref !== 'string') return null;
    const end = /(\d+)$/.exec(ref);
    return end ? Number(end[1]) : null;
  } catch {
    return null;
  }
}

// Runs the shared preview steps, letting the screen draw between them.
async function runSteps(steps: PreviewSteps, options: Pick<ReadOptions, 'onProgress' | 'isCancelled'>): Promise<ImportPreview> {
  let step = steps.next();
  while (!step.done) {
    if (options.isCancelled()) throw new ImportCancelled();
    const { done, total } = step.value;
    options.onProgress({ stage: 'checking', rows: done, total, fraction: total > 0 ? done / total : null });
    await pause();
    step = steps.next();
  }
  return step.value as ImportPreview;
}

function mapFailure(error: unknown): Error {
  if (error instanceof ImportError || error instanceof ImportCancelled) return error;
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'cancelled') return new ImportCancelled();
  if (code === 'too-many-rows') return new ImportError('tooManyRows');
  const message = error instanceof Error ? error.message : String(error);
  if (/no data rows|is empty|has no data/i.test(message)) return new ImportError('empty');
  return new ImportError('failed');
}

// Reads a file the person picked (or the phone handed over) into the shared
// upload preview: CSV text, or one sheet of an Excel workbook (the person
// picks the sheet when there are several). Nothing is saved here. Returns
// null when the person closes the sheet choice. Throws ImportError with the
// reason, or ImportCancelled.
export async function readFileForImport(picked: File, options: ReadOptions): Promise<ImportPreview | null> {
  const { onProgress, isCancelled } = options;
  const { file, folder } = await withRealName(picked);
  try {
    const given = options.name?.trim() ?? '';
    const name = given && HAS_EXTENSION.test(given) ? given : file.name || given;
    // A name without an extension falls back to the type the phone reports.
    const mime = HAS_EXTENSION.test(name) ? '' : mimeType(picked);
    const isExcel = isExcelFile(name) || EXCEL_MIME.test(mime);
    const isText = TEXT_TABLE.test(name) || (!isExcel && TEXT_MIME.test(mime));
    if (!isExcel && !isText) throw new ImportError('unsupported');

    // Guards before anything is read.
    const bytes = fileSize(file);
    if (bytes === null && fileExists(file) && file.uri.startsWith('file://')) throw new ImportError('empty');
    if (bytes !== null && isExcel && bytes > IMPORT_LIMITS.maxExcelBytes) throw new ImportError('tooLargeExcel', toMb(bytes));
    if (bytes !== null && !isExcel && bytes > IMPORT_LIMITS.maxCsvBytes) throw new ImportError('tooLargeCsv', toMb(bytes));
    if (isCancelled()) throw new ImportCancelled();
    onProgress({ stage: 'reading', rows: null, total: null, fraction: null });

    let preview: ImportPreview;
    if (isExcel) {
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength === 0) throw new ImportError('empty');
      if (buffer.byteLength > IMPORT_LIMITS.maxExcelBytes) throw new ImportError('tooLargeExcel', toMb(buffer.byteLength));
      const kind = excelKind(buffer);
      let book: Awaited<ReturnType<typeof readExcelWorkbook>>;
      try {
        book = await readExcelWorkbook(buffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/password|encrypt/i.test(message)) throw new ImportError('password');
        // A compound file named .xlsx is how Excel stores a locked workbook.
        if (kind === 'compound' && /\.xlsx$/i.test(name)) throw new ImportError('password');
        throw new ImportError(kind === 'other' ? 'notSpreadsheet' : 'failed');
      }
      if (isCancelled()) throw new ImportCancelled();
      if (book.sheetNames.length === 0) throw new ImportError('empty');
      const sheet = book.sheetNames.length === 1 ? book.sheetNames[0] : await options.chooseSheet(book.sheetNames);
      if (!sheet) return null;
      const declared = sheetRows(book, sheet);
      if (declared !== null && declared > IMPORT_LIMITS.maxRows + 1) throw new ImportError('tooManyRows');
      const grid = await excelSheetToGrid(book, sheet);
      if (grid.rows.length > IMPORT_LIMITS.maxRows) throw new ImportError('tooManyRows');
      const label = book.sheetNames.length > 1 ? `${stripExtension(name)} · ${sheet}` : stripExtension(name);
      preview = await runSteps(previewSteps(tableSource(grid.columns, grid.rows), label) as unknown as PreviewSteps, options);
    } else {
      const text = await readCsvText(file);
      if (text.trim() === '') throw new ImportError('empty');
      if (looksBinary(text)) throw new ImportError('notSpreadsheet');
      const { grid } = await parseCsvGridAsync(text, {
        chunkSize: CSV_CHUNK,
        maxRows: IMPORT_LIMITS.maxRows,
        isCancelled,
        onProgress: (rows: number, cursor: number, total: number) =>
          onProgress({ stage: 'reading', rows: Math.max(0, rows - 1), total: null, fraction: total > 0 ? Math.min(1, cursor / total) : null }),
      });
      if (grid.length === 0) throw new ImportError('empty');
      preview = await runSteps(previewSteps(csvSource(grid), stripExtension(name)) as unknown as PreviewSteps, options);
    }
    if (preview.rowCount === 0) throw new ImportError('empty');
    if (preview.rowCount > IMPORT_LIMITS.maxRows) throw new ImportError('tooManyRows');
    if (preview.columns.length < 2) throw new ImportError('oneColumn');
    return preview;
  } catch (error) {
    throw mapFailure(error);
  } finally {
    // The copy was only needed to read the file; the rows are stored separately.
    try {
      if (folder?.exists) folder.delete();
    } catch {
      // Leftovers in the cache folder are cleared by the system anyway.
    }
  }
}

// The same file read again with the person's corrections (a column's type,
// decimal mark or date order, the heading row, rows to keep). Big files are
// read in steps so the screen keeps moving.
export async function revisePreview(
  preview: ImportPreview,
  overrides: PreviewOverrides,
  options: Pick<ReadOptions, 'onProgress' | 'isCancelled'>,
): Promise<ImportPreview> {
  // The engine keeps what it read the file from on the preview, out of sight.
  const source: unknown = (preview as unknown as { source?: unknown }).source;
  if (!source) return rebuildPreview(preview, overrides) as unknown as ImportPreview;
  const steps = previewSteps(source as { kind: string }, preview.name, { overrides }) as unknown as PreviewSteps;
  try {
    return await runSteps(steps, options);
  } catch (error) {
    throw mapFailure(error);
  }
}
