// Ask's two-step proof flow (F8), moved verbatim from App.jsx.
// Message/input/loading state stays owned by the app root so the
// chat survives a trip to API Settings; the abort ref and the
// retry-last-question state live here.

import { useRef, useState } from "react";
import { callGroq } from "../ai/client.js";
import { validatePlan } from "../engine/validatePlan.js";
import { runPlan } from "../engine/runPlan.js";
import { buildSchemaSummary, renderSchemaSummary, schemaNumberCandidates } from "../ai/schemaSummary.js";
import {
  buildPlanPrompt,
  buildDescribePrompt,
  buildExplainPrompt,
  parsePlannerReply,
  exampleQuestions,
} from "../ai/oraclePlanner.js";
import { collectCandidates, verifyNumbers } from "../ai/numberCheck.js";

export function useOracleChat({ apiKey, ds, oracleInput, setOracleInput, oracleLoading, setOracleLoading, setOracleMessages }) {
  const oracleAbortRef = useRef(null);
  const [oracleLastFailed, setOracleLastFailed] = useState(null);

  // Merges fields into the last (streaming) Oracle message.
  const updateLastOracle = (patch) => {
    setOracleMessages((prev) => {
      const u = [...prev];
      u[u.length - 1] = { ...u[u.length - 1], ...patch };
      return u;
    });
  };

  // The proof flow (F8). 1) The question plus a schema summary — no
  // raw rows — goes to the AI, which returns a JSON calculation plan.
  // 2) The plan is validated (one corrected retry) and the browser
  // runs it on every row. 3) The AI words the result table, streamed.
  // 4) Every number in the wording is checked against that table and
  // unmatched ones are marked. The proof (steps, table, N of M rows,
  // exact prompts sent) is attached to the message.
  const runOracleFlow = async (question, controller) => {
    const summary = buildSchemaSummary(ds);
    const schemaText = renderSchemaSummary(summary);
    const sent = [];

    updateLastOracle({ content: "Planning the calculation…" });
    const planPrompt = buildPlanPrompt(question, schemaText);
    sent.push({ label: "Plan request (schema summary only — no rows)", text: planPrompt });
    const planReply = await callGroq(apiKey, [{ role: "user", content: planPrompt }], null, { signal: controller.signal, temperature: 0 });
    let parsed = parsePlannerReply(planReply);

    // Questions that need no calculation are answered from the
    // summary alone and checked against the summary's own figures.
    if (parsed.kind === "describe") {
      const describePrompt = buildDescribePrompt(question, schemaText);
      sent.push({ label: "Answer request (schema summary only)", text: describePrompt });
      updateLastOracle({ content: "" });
      const answer = await callGroq(apiKey, [{ role: "user", content: describePrompt }], (text) => updateLastOracle({ content: text }), { signal: controller.signal });
      const check = verifyNumbers(answer, schemaNumberCandidates(summary));
      updateLastOracle({
        content: answer,
        segments: check.segments,
        unverified: check.unverified,
        proof: {
          steps: ["No calculation was needed — answered from the dataset summary (column names, types and per-column statistics; no rows were sent)."],
          table: [],
          rowsUsed: ds.data.length,
          totalRows: ds.data.length,
          sent,
        },
      });
      return;
    }

    let checked = parsed.kind === "plan"
      ? validatePlan(parsed.raw, ds.columns, ds.columnTypes)
      : { ok: false, error: parsed.error };
    if (!checked.ok) {
      // One corrected attempt, then decline honestly.
      updateLastOracle({ content: "Correcting the calculation plan…" });
      const retryPrompt = `${planPrompt}\n\nYour previous reply was rejected: ${checked.error}\nReply again with ONLY a corrected JSON object.`;
      sent.push({ label: "Corrected plan request", text: retryPrompt });
      const retryReply = await callGroq(apiKey, [{ role: "user", content: retryPrompt }], null, { signal: controller.signal, temperature: 0 });
      parsed = parsePlannerReply(retryReply);
      checked = parsed.kind === "plan"
        ? validatePlan(parsed.raw, ds.columns, ds.columnTypes)
        : { ok: false, error: parsed.kind === "error" ? parsed.error : "The reply was not a plan." };
      if (!checked.ok) {
        const examples = exampleQuestions(ds);
        updateLastOracle({
          content: `I couldn't work that out from this data.\n\nQuestions I can answer here:\n• ${examples.join("\n• ")}`,
          proof: {
            steps: [`The calculation plan was rejected twice. Last reason: ${checked.error}`],
            table: [],
            rowsUsed: 0,
            totalRows: ds.data.length,
            sent,
          },
        });
        return;
      }
    }

    const result = runPlan(ds.data, ds.columns, checked.plan);
    const explainPrompt = buildExplainPrompt(question, result.steps, result.table, result.rowsUsed, result.totalRows);
    sent.push({ label: "Answer request (steps + result table — no rows)", text: explainPrompt });
    updateLastOracle({ content: "" });
    const answer = await callGroq(apiKey, [{ role: "user", content: explainPrompt }], (text) => updateLastOracle({ content: text }), { signal: controller.signal });
    const candidates = collectCandidates(result.table, [result.rowsUsed, result.totalRows, result.table.length]);
    const check = verifyNumbers(answer, candidates);
    updateLastOracle({
      content: answer,
      segments: check.segments,
      unverified: check.unverified,
      proof: { steps: result.steps, table: result.table, rowsUsed: result.rowsUsed, totalRows: result.totalRows, sent },
    });
  };

  // Pass retryText to re-send a failed question (the Retry button);
  // otherwise the textarea content is sent.
  const sendOracleMessage = async (retryText) => {
    const userMsg = (typeof retryText === "string" ? retryText : oracleInput).trim();
    if (!userMsg || oracleLoading) return;
    if (typeof retryText !== "string") setOracleInput("");
    setOracleLastFailed(null);
    setOracleMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setOracleLoading(true);
    const controller = new AbortController();
    oracleAbortRef.current = controller;
    try {
      setOracleMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
      if (apiKey && apiKey !== "demo") {
        if (!ds) {
          updateLastOracle({ content: "Select a dataset from the sidebar first — I calculate every answer from its rows." });
        } else {
          await runOracleFlow(userMsg, controller);
        }
      } else {
        updateLastOracle({ content: "Add a free Groq key to ask questions in your own words — then I plan the calculation, run it on all your rows in your browser, and show the work under every answer." });
      }
      setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], streaming: false }; return u; });
    } catch (err) {
      if (err.aborted) {
        // Stopped by the user — keep whatever already streamed in
        setOracleMessages((prev) => { const u = [...prev]; const last = u[u.length - 1]; u[u.length - 1] = { role: "assistant", content: last.content ? `${last.content} ⏹` : "⏹ Stopped.", streaming: false }; return u; });
      } else {
        setOracleLastFailed(userMsg);
        setOracleMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: `⚠ ${err.message}`, streaming: false }; return u; });
      }
    }
    oracleAbortRef.current = null;
    setOracleLoading(false);
  };

  return { sendOracleMessage, oracleAbortRef, oracleLastFailed };
}
