// AI filters are JSON plans, never code. A plan looks like:
//   { logic: "and", conditions: [{ column, action, value }] }
// Only the actions below are allowed, every column must exist in the
// dataset, and the plan is rebuilt field by field here so nothing the
// model sends reaches the data unchecked.

export const FILTER_ACTIONS = Object.freeze([
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "between",
  "contains",
  "is_one_of",
  "is_empty",
]);

const MAX_CONDITIONS = 20;
const MAX_LIST_VALUES = 50;
const MAX_TEXT_LENGTH = 200;

const isBlank = (v) => v === null || v === undefined || v === "";
const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);
const isScalar = (v) =>
  isFiniteNumber(v) || typeof v === "string" || typeof v === "boolean";

function toNumber(v) {
  if (isFiniteNumber(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

const shorten = (v) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s && s.length > 60 ? s.slice(0, 57) + "..." : String(s);
};

const fail = (error) => ({ ok: false, error });

// Pulls a JSON plan out of a raw model reply. Returns { ok, raw } or
// { ok: false, error } — never throws, never evaluates anything.
export function parseFilterPlanReply(text) {
  if (typeof text !== "string" || !text.trim()) {
    return fail("The AI returned an empty reply.");
  }
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    return fail("The AI reply did not contain a filter plan.");
  }
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return fail("The AI reply was not valid JSON.");
  }
  if (parsed && typeof parsed.error === "string") {
    return fail(`The AI could not build this filter: ${shorten(parsed.error)}`);
  }
  return { ok: true, raw: parsed };
}

// Checks a raw plan against the real column names and the allowed
// actions. Returns { ok: true, plan } with a fresh, normalized plan,
// or { ok: false, error } with a plain-words reason.
export function validateFilterPlan(raw, columns) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return fail("There are no columns to filter on.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("The filter plan is not a JSON object.");
  }
  const logic = raw.logic === undefined ? "and" : raw.logic;
  if (logic !== "and" && logic !== "or") {
    return fail(`Unknown logic "${shorten(raw.logic)}" — only "and" or "or" are allowed.`);
  }
  if (!Array.isArray(raw.conditions) || raw.conditions.length === 0) {
    return fail("The filter plan has no conditions.");
  }
  if (raw.conditions.length > MAX_CONDITIONS) {
    return fail(`Too many conditions (${raw.conditions.length}); the limit is ${MAX_CONDITIONS}.`);
  }

  const conditions = [];
  for (const entry of raw.conditions) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return fail("Each condition must be an object with column, action and value.");
    }
    const column = resolveColumn(entry.column, columns);
    if (column === null) {
      return fail(`Unknown column "${shorten(entry.column)}".`);
    }
    if (typeof entry.action !== "string" || !FILTER_ACTIONS.includes(entry.action)) {
      return fail(`Unknown action "${shorten(entry.action)}".`);
    }
    const checked = checkValue(entry.action, entry.value);
    if (!checked.ok) {
      return fail(`${checked.error} (column "${column}")`);
    }
    conditions.push({ column, action: entry.action, value: checked.value });
  }
  return { ok: true, plan: { logic, conditions } };
}

// Exact match first, then a unique case-insensitive match; null if
// the column does not exist in the dataset.
function resolveColumn(name, columns) {
  if (typeof name !== "string" || name === "") return null;
  if (columns.includes(name)) return name;
  const lower = name.toLowerCase();
  const matches = columns.filter((c) => String(c).toLowerCase() === lower);
  return matches.length === 1 ? matches[0] : null;
}

function checkValue(action, value) {
  switch (action) {
    case "equals":
    case "not_equals":
      if (!isScalar(value)) return fail("The value must be a plain text, number or true/false value.");
      if (typeof value === "string" && value.length > MAX_TEXT_LENGTH) return fail("The value is too long.");
      return { ok: true, value };
    case "greater_than":
    case "less_than": {
      const n = toNumber(value);
      if (n === null) return fail("The value must be a number.");
      return { ok: true, value: n };
    }
    case "between": {
      if (!Array.isArray(value) || value.length !== 2) {
        return fail("A between filter needs exactly two numbers: [low, high].");
      }
      const a = toNumber(value[0]);
      const b = toNumber(value[1]);
      if (a === null || b === null) return fail("Both between values must be numbers.");
      return { ok: true, value: [Math.min(a, b), Math.max(a, b)] };
    }
    case "contains": {
      if (!isScalar(value) || String(value) === "") return fail("The value must be a non-empty text or number.");
      if (typeof value === "string" && value.length > MAX_TEXT_LENGTH) return fail("The value is too long.");
      return { ok: true, value };
    }
    case "is_one_of": {
      if (!Array.isArray(value) || value.length === 0) {
        return fail("An is-one-of filter needs a list of values.");
      }
      if (value.length > MAX_LIST_VALUES) {
        return fail(`The list of values is too long (limit ${MAX_LIST_VALUES}).`);
      }
      if (!value.every(isScalar)) return fail("Every listed value must be plain text, a number or true/false.");
      return { ok: true, value: [...value] };
    }
    case "is_empty":
      return { ok: true, value: null };
    default:
      return fail(`Unknown action "${shorten(action)}".`);
  }
}

// Text values compare case-insensitively; numeric-looking values
// compare as numbers so 300 matches "300".
function looseEquals(a, b) {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== null && nb !== null) return na === nb;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function rowMatches(row, cond) {
  const v = row?.[cond.column];
  if (cond.action === "is_empty") return isBlank(v);
  // Blank cells only ever match "is empty" — they are never treated
  // as 0 or "" for comparisons.
  if (isBlank(v)) return false;
  switch (cond.action) {
    case "equals":
      return looseEquals(v, cond.value);
    case "not_equals":
      return !looseEquals(v, cond.value);
    case "greater_than": {
      const n = toNumber(v);
      return n !== null && n > cond.value;
    }
    case "less_than": {
      const n = toNumber(v);
      return n !== null && n < cond.value;
    }
    case "between": {
      const n = toNumber(v);
      return n !== null && n >= cond.value[0] && n <= cond.value[1];
    }
    case "contains":
      return String(v).toLowerCase().includes(String(cond.value).toLowerCase());
    case "is_one_of":
      return cond.value.some((item) => looseEquals(v, item));
    default:
      return false;
  }
}

// Applies a validated plan to rows. Pure and never throws.
export function applyFilterPlan(rows, plan) {
  if (!Array.isArray(rows)) return [];
  const conditions = plan?.conditions;
  if (!Array.isArray(conditions) || conditions.length === 0) return rows;
  const test =
    plan.logic === "or"
      ? (row) => conditions.some((c) => rowMatches(row, c))
      : (row) => conditions.every((c) => rowMatches(row, c));
  return rows.filter(test);
}

const ACTION_WORDS = {
  equals: "is",
  not_equals: "is not",
  greater_than: "is more than",
  less_than: "is less than",
  contains: "contains",
};

const fmtVal = (v) =>
  typeof v === "number" ? v.toLocaleString() : `"${String(v)}"`;

// Renders a validated plan in plain words for the user, e.g.
// `revenue is more than 300,000 and region is "North"`.
export function describeFilterPlan(plan) {
  const conditions = plan?.conditions;
  if (!Array.isArray(conditions) || conditions.length === 0) return "";
  const parts = conditions.map((c) => {
    switch (c.action) {
      case "between":
        return `${c.column} is between ${fmtVal(c.value[0])} and ${fmtVal(c.value[1])}`;
      case "is_one_of":
        return `${c.column} is one of ${c.value.map(fmtVal).join(", ")}`;
      case "is_empty":
        return `${c.column} is empty`;
      default:
        return `${c.column} ${ACTION_WORDS[c.action]} ${fmtVal(c.value)}`;
    }
  });
  return parts.join(plan.logic === "or" ? " or " : " and ");
}
