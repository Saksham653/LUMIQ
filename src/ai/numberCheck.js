// Checks every number an AI answer states against the result table
// it was given. Handles Western and Indian comma grouping, %, K and M
// suffixes, lakh and crore. A number counts as verified when some
// table value matches it at the precision the answer used (so 4.68M
// matches 4,677,000, and 20% matches 19.99).

// The trailing guard rejects a following word character or a further
// decimal part ("1.2.3"), but allows an ordinary sentence period
// right after a number or unit ("…was 4.68M.").
const NUMBER_RE = /(?<![\w.])[-+]?\d[\d,]*(?:\.\d+)?(?:\s*(lakhs?|crores?)|(k|m|%))?(?!\w|\.\d)/gi;

const UNIT_SCALE = { k: 1e3, m: 1e6, lakh: 1e5, lakhs: 1e5, crore: 1e7, crores: 1e7 };

// Every extracted number carries a tolerance of half a step of its
// last shown digit: "3.4K" → ±50, "45%" → ±0.5, "4,677,000" → ±0.5.
export function extractNumbers(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  for (const m of text.matchAll(NUMBER_RE)) {
    const raw = m[0];
    const unitWord = (m[1] || m[2] || "").toLowerCase();
    const core = raw
      .replace(/\s*(lakhs?|crores?|k|m|%)$/i, "")
      .replace(/,/g, "")
      .trim();
    const base = Number(core);
    if (!Number.isFinite(base)) continue;
    const scale = UNIT_SCALE[unitWord] || 1;
    const decimals = (core.split(".")[1] || "").length;
    const halfStep = 0.5 * Math.pow(10, -decimals);
    out.push({
      index: m.index,
      length: raw.length,
      raw,
      value: base * scale,
      tolerance: halfStep * scale,
      unit: unitWord || null,
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
export function verifyNumbers(text, candidates) {
  const numbers = extractNumbers(text);
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
