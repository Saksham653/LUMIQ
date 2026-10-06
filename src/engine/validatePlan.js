// Validates a calculation plan before anything runs. A plan is JSON:
//   { filter?, groupBy?, measures: [{op, column?, as?}], sort?, limit? }
// Unknown columns, unknown ops, numeric ops on non-number columns and
// any extra keys are rejected with a plain-words error. The returned
// plan is rebuilt field by field — model output never passes through.

import { validateFilterPlan, resolveColumnName } from "../lib/filterPlan.js";
import { NUMERIC_TYPES } from "../data/columnTypes.js";

export const MEASURE_OPS = Object.freeze(["sum", "avg", "min", "max", "count", "median", "share"]);
const NUMERIC_OPS = ["sum", "avg", "min", "max", "median", "share"];

const TOP_KEYS = ["filter", "groupBy", "measures", "sort", "limit"];
const MEASURE_KEYS = ["op", "column", "as"];
const SORT_KEYS = ["by", "dir"];

const MAX_GROUPBY = 3;
const MAX_MEASURES = 8;
const MAX_LIMIT = 1000;

const fail = (error) => ({ ok: false, error });

const shorten = (v) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s && s.length > 60 ? s.slice(0, 57) + "..." : String(s);
};

function unknownKeys(obj, allowed) {
  return Object.keys(obj).filter((k) => !allowed.includes(k));
}

export function validatePlan(raw, columns, columnTypes = {}) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return fail("There are no columns to calculate on.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("The plan is not a JSON object.");
  }
  const extra = unknownKeys(raw, TOP_KEYS);
  if (extra.length) {
    return fail(`Unknown key "${shorten(extra[0])}" in the plan — allowed keys are ${TOP_KEYS.join(", ")}.`);
  }

  const plan = {};

  // filter — reuses the Phase 1 filter-plan validator
  if (raw.filter !== undefined && raw.filter !== null) {
    const f = validateFilterPlan(raw.filter, columns);
    if (!f.ok) return fail(`In the filter: ${f.error}`);
    plan.filter = f.plan;
  }

  // groupBy — a single column name is tolerated and wrapped
  if (raw.groupBy !== undefined && raw.groupBy !== null) {
    const list = Array.isArray(raw.groupBy) ? raw.groupBy : [raw.groupBy];
    if (list.length > MAX_GROUPBY) {
      return fail(`Too many groupBy columns (${list.length}); the limit is ${MAX_GROUPBY}.`);
    }
    const groupBy = [];
    for (const entry of list) {
      const col = typeof entry === "string" ? resolveColumnName(entry, columns) : null;
      if (!col) return fail(`Unknown groupBy column "${shorten(entry)}".`);
      if (!groupBy.includes(col)) groupBy.push(col);
    }
    if (groupBy.length) plan.groupBy = groupBy;
  }

  // measures — required, at least one
  if (!Array.isArray(raw.measures) || raw.measures.length === 0) {
    return fail("The plan needs at least one measure (or a count).");
  }
  if (raw.measures.length > MAX_MEASURES) {
    return fail(`Too many measures (${raw.measures.length}); the limit is ${MAX_MEASURES}.`);
  }
  const measures = [];
  const aliases = new Set();
  for (const entry of raw.measures) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return fail("Each measure must be an object with op, column and optional as.");
    }
    const extraM = unknownKeys(entry, MEASURE_KEYS);
    if (extraM.length) {
      return fail(`Unknown key "${shorten(extraM[0])}" in a measure — allowed keys are ${MEASURE_KEYS.join(", ")}.`);
    }
    if (typeof entry.op !== "string" || !MEASURE_OPS.includes(entry.op)) {
      return fail(`Unknown measure op "${shorten(entry.op)}" — allowed ops are ${MEASURE_OPS.join(", ")}.`);
    }
    let column;
    if (entry.column === undefined || entry.column === null) {
      if (entry.op !== "count") return fail(`The "${entry.op}" measure needs a column.`);
      column = undefined;
    } else {
      column = typeof entry.column === "string" ? resolveColumnName(entry.column, columns) : null;
      if (!column) return fail(`Unknown measure column "${shorten(entry.column)}".`);
      if (NUMERIC_OPS.includes(entry.op) && !NUMERIC_TYPES.includes(columnTypes[column]?.type)) {
        return fail(`"${entry.op}" needs a number column, but "${column}" is ${columnTypes[column]?.type || "not numeric"}.`);
      }
    }
    let as = entry.as;
    if (as !== undefined) {
      if (typeof as !== "string" || !/^[\w .%-]{1,40}$/.test(as)) {
        return fail(`The measure name "${shorten(as)}" is not usable.`);
      }
    } else {
      as = column ? `${entry.op}_${column}` : "count";
    }
    if (aliases.has(as)) return fail(`Two measures share the name "${as}".`);
    aliases.add(as);
    measures.push(column ? { op: entry.op, column, as } : { op: entry.op, as });
  }
  plan.measures = measures;

  // sort — by a groupBy column or a measure name
  if (raw.sort !== undefined && raw.sort !== null) {
    if (typeof raw.sort !== "object" || Array.isArray(raw.sort)) {
      return fail("sort must be an object like {\"by\": \"total_revenue\", \"dir\": \"desc\"}.");
    }
    const extraS = unknownKeys(raw.sort, SORT_KEYS);
    if (extraS.length) {
      return fail(`Unknown key "${shorten(extraS[0])}" in sort — allowed keys are ${SORT_KEYS.join(", ")}.`);
    }
    const sortable = [...(plan.groupBy || []), ...measures.map((m) => m.as)];
    if (typeof raw.sort.by !== "string" || !sortable.includes(raw.sort.by)) {
      return fail(`Cannot sort by "${shorten(raw.sort.by)}" — sortable fields are ${sortable.join(", ")}.`);
    }
    const dir = raw.sort.dir === undefined ? "desc" : raw.sort.dir;
    if (dir !== "asc" && dir !== "desc") {
      return fail(`Sort direction must be "asc" or "desc", not "${shorten(raw.sort.dir)}".`);
    }
    plan.sort = { by: raw.sort.by, dir };
  }

  // limit
  if (raw.limit !== undefined && raw.limit !== null) {
    if (!Number.isInteger(raw.limit) || raw.limit < 1 || raw.limit > MAX_LIMIT) {
      return fail(`limit must be a whole number between 1 and ${MAX_LIMIT}.`);
    }
    plan.limit = raw.limit;
  }

  return { ok: true, plan };
}
