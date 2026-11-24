import { excelSheetToGrid, isExcelFile, readExcelWorkbook } from '@core/data/excel.js';
import { buildPreviewFromGrid, buildUploadPreview } from '@core/data/uploadPreview.js';
import { Directory, File, Paths } from 'expo-file-system';

import type { ColumnType, Row } from '@/data/types';
import type { StringKey } from '@/i18n';

// An import failure carrying the plain-language message to show.
export class ImportError extends Error {
  constructor(readonly messageKey: StringKey) {
    super(messageKey);
  }
}

export type ImportPreview = {
  name: string;
  columns: string[];
  rows: Row[];
  rowCount: number;
  types: Record<string, ColumnType>;
};

const TEXT_TABLE = /\.(csv|tsv|txt)$/i;
const HAS_EXTENSION = /\.[a-z0-9]{1,5}$/i;
const EXCEL_MIME = /spreadsheetml|ms-excel/i;
const TEXT_MIME = /^text\/|csv|tab-separated/i;

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

// Reads a picked file into the shared upload preview: CSV text, or one sheet
// of an Excel workbook (the user picks the sheet when there are several).
// Returns null when the user cancels the sheet choice.
export async function previewFromFile(
  picked: File,
  chooseSheet: (names: string[]) => Promise<string | null>,
): Promise<ImportPreview | null> {
  const { file, folder } = await withRealName(picked);
  try {
    const name = file.name;
    // A name without an extension falls back to the type the phone reports.
    const mime = HAS_EXTENSION.test(name) ? '' : mimeType(picked);
    const isExcel = isExcelFile(name) || EXCEL_MIME.test(mime);
    const isText = TEXT_TABLE.test(name) || (!isExcel && TEXT_MIME.test(mime));
    if (!isExcel && !isText) throw new ImportError('import.unsupported');

    if (isExcel) {
      const book = await readExcelWorkbook(await file.arrayBuffer());
      const sheet = book.sheetNames.length === 1 ? book.sheetNames[0] : await chooseSheet(book.sheetNames);
      if (!sheet) return null;
      const grid = await excelSheetToGrid(book, sheet);
      const label = book.sheetNames.length > 1 ? `${stripExtension(name)} · ${sheet}` : stripExtension(name);
      return buildPreviewFromGrid(grid.columns, grid.rows, label) as ImportPreview;
    }
    return buildUploadPreview(await file.text(), stripExtension(name)) as ImportPreview;
  } catch (error) {
    if (error instanceof ImportError) throw error;
    if (error instanceof Error && /no data rows|is empty/i.test(error.message)) throw new ImportError('import.empty');
    throw new ImportError('import.failed');
  } finally {
    // The copy was only needed to read the file; the rows are stored separately.
    try {
      if (folder?.exists) folder.delete();
    } catch {
      // Leftovers in the cache folder are cleared by the system anyway.
    }
  }
}
