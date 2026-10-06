// Excel upload (F6 extension, B7-2): SheetJS 0.20.3, installed and
// pinned from the official cdn.sheetjs.com tarball (the npm "xlsx"
// 0.18.x package is outdated). Loaded ONLY via dynamic import() when
// an Excel file is actually chosen, so it never enters the main
// bundle. Everything here returns plain columns + string/number rows
// that flow into the same preview, type detection and worker path
// as a CSV.

async function loadXlsx() {
  const mod = await import("xlsx");
  return typeof mod.read === "function" ? mod : mod.default;
}

export function isExcelFile(name) {
  return /\.(xlsx|xls)$/i.test(name || "");
}

// Dates come out of SheetJS as JS Date objects (cellDates). Format
// them in local time — toISOString would shift midnight dates into
// the previous day in timezones east of UTC.
function formatCellValue(raw) {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return "";
    // Excel serial → Date can land 1-2 ms shy of midnight; round to
    // the second so "2024-03-05" never becomes "2024-03-04 23:59".
    const v = new Date(Math.round(raw.getTime() / 1000) * 1000);
    const y = v.getFullYear();
    const mo = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    const hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
    return hasTime
      ? `${y}-${mo}-${d} ${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}`
      : `${y}-${mo}-${d}`;
  }
  return raw == null ? "" : raw;
}

// Read a workbook and list its sheets. The caller shows a picker
// when there is more than one.
export async function readExcelWorkbook(arrayBuffer) {
  const XLSX = await loadXlsx();
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true, dense: true });
  return { wb, sheetNames: wb.SheetNames.slice() };
}

// One sheet → { columns, rows } exactly like parseCsvText's output.
// Blank or merged header cells get positional names ("Column 3").
export async function excelSheetToGrid(book, sheetName) {
  const XLSX = await loadXlsx();
  const sheet = book.wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  if (!aoa.length) throw new Error(`Sheet "${sheetName}" is empty.`);
  const headerRow = aoa[0] || [];
  const width = aoa.reduce((w, r) => Math.max(w, r.length), headerRow.length);
  const columns = [];
  for (let i = 0; i < width; i++) {
    const h = headerRow[i];
    let name = h == null || String(h).trim() === "" ? `Column ${i + 1}` : String(h).trim();
    if (columns.includes(name)) name = `${name} (${i + 1})`; // duplicates would overwrite cells
    columns.push(name);
  }
  const rows = [];
  for (let r = 1; r < aoa.length; r++) {
    const src = aoa[r];
    if (!src || src.every((c) => c == null || c === "")) continue; // skip fully blank lines
    const row = {};
    for (let i = 0; i < width; i++) row[columns[i]] = formatCellValue(src[i]);
    rows.push(row);
  }
  if (rows.length === 0) throw new Error(`Sheet "${sheetName}" has no data rows.`);
  return { columns, rows };
}
