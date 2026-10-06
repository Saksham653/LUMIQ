// Blank cells (null, undefined, "") are never treated as 0. These
// helpers keep only real numbers and return null when a calculation
// has nothing to work on, so callers can show "—" instead of a fake 0.

export const isBlank = (v) => v === null || v === undefined || v === "";

export const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

// Keeps only real numbers: blanks, text and NaN are dropped.
export function numericValues(values) {
  const out = [];
  for (const v of values) if (isNumber(v)) out.push(v);
  return out;
}

export function sum(values) {
  const nums = numericValues(values);
  if (nums.length === 0) return null;
  let s = 0;
  for (const n of nums) s += n;
  return s;
}

// The average of 10, blank, 20 is 15: blanks are skipped, not counted
// as zeros, and the divisor is the number of real values.
export function mean(values) {
  const nums = numericValues(values);
  if (nums.length === 0) return null;
  let s = 0;
  for (const n of nums) s += n;
  return s / nums.length;
}

export function min(values) {
  let m = null;
  for (const v of values) if (isNumber(v) && (m === null || v < m)) m = v;
  return m;
}

export function max(values) {
  let m = null;
  for (const v of values) if (isNumber(v) && (m === null || v > m)) m = v;
  return m;
}

// Middle value; the average of the two central values on even
// counts. Blanks are skipped like everywhere else.
export function median(values) {
  const nums = numericValues(values).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

// Pairs where BOTH columns hold real numbers — a row with a blank in
// either column is left out of a correlation entirely.
export function numericPairs(rows, colA, colB) {
  const xs = [];
  const ys = [];
  for (const row of rows) {
    const a = row?.[colA];
    const b = row?.[colB];
    if (isNumber(a) && isNumber(b)) {
      xs.push(a);
      ys.push(b);
    }
  }
  return { xs, ys };
}

// Numeric cells of a column with their original row index, so outlier
// detection can skip blanks and still point at the right row.
export function numericEntries(rows, col) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i]?.[col];
    if (isNumber(v)) out.push({ index: i, value: v });
  }
  return out;
}
