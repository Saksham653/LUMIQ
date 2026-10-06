// What-if's analysis runner. The AI sees the schema summary (all
// rows, no raw rows) and is told not to invent probabilities. State
// stays owned by the caller.

import { callGroq } from "../ai/client.js";
import { buildSchemaSummary, renderSchemaSummary } from "../ai/schemaSummary.js";

export function useScenario({ apiKey, ds, scenarioInput, setScenarios, setScenarioLoading }) {
  const runScenario = async () => {
    if (!ds || !scenarioInput.trim() || !apiKey || apiKey === "demo") return;
    setScenarioLoading(true); setScenarios([]);
    const isScenario = /what if|if we|suppose|assume|scenario|increase|decrease|double|halve|drop|rise|grow|shrink|change|impact|affect/i.test(scenarioInput);
    // Scenario Forge sees the schema summary (all rows, no raw rows)
    // and no longer asks for invented probability figures.
    const scenarioSummary = renderSchemaSummary(buildSchemaSummary(ds));
    const prompt = isScenario
      ? `Quantitative strategist. Scenario: "${scenarioInput}"\n\nDataset summary, computed on all rows (you have no access to the rows; use only figures from this summary):\n${scenarioSummary}\n\nReturn ONLY a valid JSON array, no markdown. Do not state probabilities or invent figures that are not in the summary:\n[{"label":"Optimistic","impact":"+X%","description":"...","key_driver":"..."},{"label":"Base Case","impact":"+X%","description":"...","key_driver":"..."},{"label":"Pessimistic","impact":"-X%","description":"...","key_driver":"..."}]`
      : `Expert data analyst. Question: "${scenarioInput}"\n\nDataset summary, computed on all rows (you have no access to the rows; use only figures from this summary):\n${scenarioSummary}\n\nReturn ONLY a valid JSON array, no markdown:\n[{"label":"Overview","impact":"—","description":"Direct answer using the summary figures","key_driver":"context"},{"label":"Key Insight","impact":"—","description":"Most important finding","key_driver":"primary signal"},{"label":"What To Watch","impact":"—","description":"Critical risk or variable","key_driver":"risk factor"}]`;
    try {
      const result = await callGroq(apiKey, [{ role: "user", content: prompt }], () => { });
      const match = result.replace(/```json|```/g, "").trim().match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON in response");
      setScenarios(JSON.parse(match[0]));
    } catch (e) {
      setScenarios([{ label: "Error", probability: 0, impact: "N/A", description: `Could not process: ${e.message}`, key_driver: "Error" }]);
    }
    setScenarioLoading(false);
  };

  return { runScenario };
}
