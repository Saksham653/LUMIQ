// Report's decision-brief generator. The prompt carries the schema
// summary (computed on all rows), never raw rows. Text/loading state
// stays owned by the caller so the brief survives screen switches.

import { useRef } from "react";
import { callGroq } from "../ai/client.js";
import { buildReportData } from "../engine/reportData.js";

export function useNarrative({ apiKey, ds, setNarrativeText, setNarrativeLoading }) {
  const narrativeAbortRef = useRef(null);

  const generateNarrative = async () => {
    if (!ds || !apiKey || apiKey === "demo") return;
    narrativeAbortRef.current?.abort();
    const controller = new AbortController();
    narrativeAbortRef.current = controller;
    setNarrativeLoading(true); setNarrativeText("");
    // The summary may only word the report numbers the engine already
    // calculated — the same numbers the footnotes document.
    const report = buildReportData(ds);
    const facts = report.items.map((it, i) => `${i + 1}. ${it.label}: ${it.value}`).join("\n");
    const prompt = `You are a business analyst. The browser calculated these figures for the dataset "${ds.name}" (footnoted in the report):
${facts}

Write a 3-5 sentence executive summary using ONLY these numbers (you may round them). Plain sentences, no markdown headings, no invented figures.`;
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
