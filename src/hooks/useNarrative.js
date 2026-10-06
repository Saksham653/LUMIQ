// Report's decision-brief generator. The prompt carries the schema
// summary (computed on all rows), never raw rows. Text/loading state
// stays owned by the caller so the brief survives screen switches.

import { useRef } from "react";
import { callGroq } from "../ai/client.js";
import { buildSchemaSummary, renderSchemaSummary } from "../ai/schemaSummary.js";

export function useNarrative({ apiKey, ds, setNarrativeText, setNarrativeLoading }) {
  const narrativeAbortRef = useRef(null);

  const generateNarrative = async () => {
    if (!ds || !apiKey || apiKey === "demo") return;
    narrativeAbortRef.current?.abort();
    const controller = new AbortController();
    narrativeAbortRef.current = controller;
    setNarrativeLoading(true); setNarrativeText("");
    // The brief sees the schema summary (computed on all rows), never
    // raw rows.
    const prompt = `You are a senior business analyst. Write a DECISION BRIEF from this dataset summary. It was computed on all rows; you have no access to the rows themselves, so use only figures that appear in the summary.\n\n${renderSchemaSummary(buildSchemaSummary(ds))}\n\nFormat:\nHEADLINE: [one sentence]\n\nWHAT HAPPENED: [2-3 sentences with real numbers from the summary]\n\nWHY IT MATTERS: [business implication]\n\nTHE RISK: [what could go wrong]\n\nRECOMMENDED ACTION: [one concrete next step]\n\nUnder 280 words. Be direct.`;
    try {
      await callGroq(apiKey, [{ role: "user", content: prompt }], (text) => setNarrativeText(text), { signal: controller.signal });
    } catch (err) {
      if (narrativeAbortRef.current === controller && !err.aborted) {
        setNarrativeText(`Error: ${err.message} Use Generate / Regenerate to retry.`);
      }
    }
    if (narrativeAbortRef.current === controller) {
      setNarrativeLoading(false);
      narrativeAbortRef.current = null;
    }
  };

  return { generateNarrative, narrativeAbortRef };
}
