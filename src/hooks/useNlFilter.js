// The AI Data Filter: natural-language request → validated JSON
// filter plan (never code). State lives here, in the shell, so the
// applied filter survives tab switches.

import { useState } from "react";
import { callGroq } from "../ai/client.js";
import {
  validateFilterPlan,
  describeFilterPlan,
  parseFilterPlanReply,
  FILTER_ACTIONS,
} from "../lib/filterPlan.js";

export function useNlFilter({ apiKey, ds }) {
  const [nlFilterQuery, setNlFilterQuery] = useState("");
  const [nlFilterLoading, setNlFilterLoading] = useState(false);
  const [nlFilterError, setNlFilterError] = useState("");
  const [activeNlFilter, setActiveNlFilter] = useState(null);

  const applyNlFilter = async () => {
    if (!nlFilterQuery.trim() || nlFilterLoading) return;
    if (!apiKey || apiKey === "demo") return; // the KeyNudge under the bar explains
    setNlFilterLoading(true);
    setNlFilterError("");

    try {
      const columnHints = ds.columns
        .map((c) => `${c} (${ds.columnTypes?.[c]?.type || "text"})`)
        .join(", ");
      const prompt = `You translate a user's request into a JSON filter plan for a data table.
Columns: ${columnHints}
User request: "${nlFilterQuery}"

Reply with ONLY a JSON object, no markdown and no explanations, in exactly this shape:
{"logic":"and","conditions":[{"column":"<column name>","action":"<action>","value":<value>}]}

Allowed actions: ${FILTER_ACTIONS.join(", ")}.
Rules:
- "logic" is "and" or "or".
- greater_than and less_than take a number. between takes [low, high]. is_one_of takes an array of values. is_empty takes no value.
- Use only the listed column names, exactly as written.
- If the request cannot be expressed with these actions, reply {"error":"<short reason>"} instead.`;

      // temperature 0: a filter plan should be deterministic JSON
      const reply = await callGroq(apiKey, [{ role: "user", content: prompt }], () => { }, { temperature: 0 });

      // The reply is data, never code: parse it as JSON and check every
      // column and action against the real dataset before using it.
      const parsed = parseFilterPlanReply(reply);
      if (!parsed.ok) {
        setNlFilterError(parsed.error);
        return;
      }
      const checked = validateFilterPlan(parsed.raw, ds.columns);
      if (!checked.ok) {
        setNlFilterError(`Could not apply this filter: ${checked.error}`);
        return;
      }

      setActiveNlFilter({
        query: nlFilterQuery,
        plan: checked.plan,
        description: describeFilterPlan(checked.plan),
      });
      setNlFilterQuery("");
    } catch (e) {
      setNlFilterError(e?.message || "The AI filter request failed.");
      console.error("NL Filter Error:", e);
    } finally {
      setNlFilterLoading(false);
    }
  };

  const clearNlFilter = () => {
    setActiveNlFilter(null);
    setNlFilterError("");
  };

  return {
    nlFilterQuery,
    setNlFilterQuery,
    nlFilterLoading,
    nlFilterError,
    setNlFilterError,
    activeNlFilter,
    setActiveNlFilter,
    applyNlFilter,
    clearNlFilter,
  };
}
