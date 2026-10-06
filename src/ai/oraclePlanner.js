// Prompt builders and reply parsing for the two-step Oracle flow:
// 1) question + schema summary → JSON calculation plan (no rows),
// 2) steps + result table → 2-3 plain sentences. Model output is
// only ever parsed as JSON and validated; it is never executed.

import { FILTER_ACTIONS } from "../lib/filterPlan.js";
import { MEASURE_OPS } from "../engine/validatePlan.js";
import { numericColumns } from "../data/dataset.js";
import { aggregationRule } from "../data/columnTypes.js";

export const EXPLAIN_TABLE_LIMIT = 50;

export function buildPlanPrompt(question, schemaText) {
  return `You turn a question about a data table into a JSON calculation plan. You never see the rows — only this summary:

${schemaText}

Reply with ONLY one JSON object, no markdown and no explanations. One of:
1. {"type":"plan","plan":{"filter":{"logic":"and","conditions":[{"column":"<name>","action":"<action>","value":<value>}]},"groupBy":["<name>"],"measures":[{"op":"<op>","column":"<name>","as":"<result name>"}],"sort":{"by":"<result name or groupBy column>","dir":"asc|desc"},"limit":<n>}}
   - filter, groupBy, sort and limit are optional; measures is required.
   - ops: ${MEASURE_OPS.join(", ")}. "count" may omit "column". "share" is each group's percentage of the filtered total.
   - filter actions: ${FILTER_ACTIONS.join(", ")}; conditions are joined by "logic": "and" or "or".
   - between takes [low, high]; is_one_of takes an array; is_empty takes no value.
   - Use only the exact column names from the summary.
   - For "which X is highest/lowest" questions, group by X, sort by the measure and use limit 1 (or a small limit for top lists).
2. {"type":"describe"} — when the question asks what the dataset is about, or needs no calculation.
3. {"error":"<short reason>"} — when the question cannot be answered with these operations.

Question: "${question}"`;
}

export function buildDescribePrompt(question, schemaText) {
  return `You are Oracle, LUMIQ's data analyst. Using ONLY the dataset summary below (you have no access to the rows), answer the user's question in 2-4 plain sentences. Only state numbers that appear in the summary. No markdown headings, no bullet lists, no invented figures.

${schemaText}

Question: "${question}"`;
}

export function buildExplainPrompt(question, steps, table, rowsUsed, totalRows) {
  const rows = Array.isArray(table) ? table.slice(0, EXPLAIN_TABLE_LIMIT) : [];
  const truncated = Array.isArray(table) && table.length > rows.length;
  return `You are Oracle, LUMIQ's data analyst. The browser already ran this calculation on the user's data. Answer the question in 2-3 plain sentences using ONLY numbers that appear in the result table (you may round them). Do not calculate new numbers, do not use markdown headings or bullet lists.

Question: "${question}"

Calculation steps:
${steps.map((s) => `- ${s}`).join("\n")}

Result table (JSON${truncated ? `, first ${rows.length} of ${table.length} rows` : ""}):
${JSON.stringify(rows)}

This was calculated from ${rowsUsed} of ${totalRows} rows.`;
}

// Pulls one JSON object out of a planner reply. Returns
// { kind: "plan", raw } | { kind: "describe" } | { kind: "error", error }.
export function parsePlannerReply(text) {
  if (typeof text !== "string" || !text.trim()) {
    return { kind: "error", error: "The AI returned an empty reply." };
  }
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    return { kind: "error", error: "The AI reply did not contain a JSON plan." };
  }
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { kind: "error", error: "The AI reply was not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "error", error: "The AI reply was not a JSON object." };
  }
  if (typeof parsed.error === "string") {
    return { kind: "error", error: parsed.error.slice(0, 200) };
  }
  if (parsed.type === "describe") return { kind: "describe" };
  if (parsed.type === "plan" && parsed.plan && typeof parsed.plan === "object") {
    return { kind: "plan", raw: parsed.plan };
  }
  // Tolerate a bare plan object ({"measures": ...}) — validation
  // still decides whether it is usable.
  if (parsed.measures) return { kind: "plan", raw: parsed };
  return { kind: "error", error: "The AI reply was not a plan, a describe, or an error." };
}

// Three runnable example questions built from the real columns, shown
// when planning fails twice.
export function exampleQuestions(ds) {
  const numeric = numericColumns(ds);
  const textCols = ds.columns.filter((c) => (ds.columnTypes?.[c]?.type || "text") === "text");
  const group = textCols[0];
  const sumCol = numeric.find((c) => aggregationRule(c, ds.columnTypes?.[c]) === "sum");
  const avgCol = numeric.find((c) => aggregationRule(c, ds.columnTypes?.[c]) === "avg");
  const questions = [];
  if (sumCol && group) questions.push(`What is the total ${sumCol} by ${group}?`);
  if (avgCol) questions.push(`What is the average ${avgCol}?`);
  if (numeric.length && group) questions.push(`Which ${group} has the highest ${numeric[0]}?`);
  for (const col of numeric) {
    if (questions.length >= 3) break;
    const q = `What is the highest ${col}?`;
    if (!questions.includes(q)) questions.push(q);
  }
  return questions.slice(0, 3);
}
