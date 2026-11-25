import { collectLabelledCandidates, verifyNumbers } from '@core/ai/numberCheck.js';
import { buildDescribePrompt, buildExplainPrompt, buildPlanPrompt, parsePlannerReply } from '@core/ai/oraclePlanner.js';
import { buildSchemaSummary, renderSchemaSummary, schemaNumberCandidates } from '@core/ai/schemaSummary.js';
import { runPlan } from '@core/engine/runPlan.js';
import { validatePlan } from '@core/engine/validatePlan.js';
import { describeNumberFormat } from '@core/lib/numberFormat.js';

import type { Dataset } from '@/data/types';
import type { Language } from '@/i18n';
import type { NumberFormat } from '@/utils/format';

import { askAi } from './ask-client';

export type AskStage = 'planning' | 'calculating' | 'writing';

// One earlier exchange, so follow-ups like "and by category?" work: the
// question, the validated plan and its plain-English steps. Never rows.
export type AskContextItem = { question: string; plan: unknown; steps: string[] };

export type SentPrompt = { label: 'plan' | 'retry' | 'answer'; text: string };
export type AnswerSegment = { text: string; number?: number; verified?: boolean };

export type AskProof = {
  steps: string[];
  table: Record<string, unknown>[];
  rowsUsed: number;
  totalRows: number;
  fromSummary: boolean;
  sent: SentPrompt[];
};

export type AskResult =
  | {
      kind: 'answer';
      text: string;
      segments: AnswerSegment[];
      checked: number;
      unverified: number;
      proof: AskProof;
      context: AskContextItem | null;
      questionsLeft: number | null;
    }
  | { kind: 'cannot'; reason: string; proof: AskProof; questionsLeft: number | null };

type PlanCheck = { ok: true; plan: unknown } | { ok: false; error: string };
type PlanResult = { table: Record<string, unknown>[]; rowsUsed: number; totalRows: number; steps: string[] };

// Questions come in any language (and Hinglish); the plan must still name
// the columns exactly as the file does.
const PLAN_NOTE =
  '\n\nThe question may be written in any language, for example English, Hindi, Hinglish, Spanish, French, German, Japanese, Chinese or Hebrew. The JSON must still use the exact column names from the summary.';

// Answers come back in the app's language.
const ANSWER_LANGUAGE: Record<Language, string> = {
  en: '',
  hi: 'Write the answer in simple, everyday Hindi (Devanagari script).',
  es: 'Write the answer in simple, everyday Spanish.',
  fr: 'Write the answer in simple, everyday French.',
  de: 'Write the answer in simple, everyday German, addressing the reader as "du".',
  ja: 'Write the answer in simple, everyday Japanese, in the polite です/ます style.',
  zh: 'Write the answer in simple, everyday Simplified Chinese.',
  he: 'Write the answer in simple, everyday Hebrew, in gender-neutral wording.',
};
const KEEP_NAMES = 'Keep column names, group names and dates exactly as they appear above.';

// No totals the phone did not calculate, so every figure can be checked.
const ONLY_GIVEN_NUMBERS = 'Only repeat numbers given above; do not add them up or combine them yourself.';

// The answer's language, then the exact number format the check will read
// back: the same format the app shows numbers in.
const answerPrompt = (prompt: string, language: Language, format: NumberFormat) => {
  const rules = [ANSWER_LANGUAGE[language], language === 'en' ? '' : KEEP_NAMES, describeNumberFormat(format), ONLY_GIVEN_NUMBERS];
  return `${prompt}\n\n${rules.filter(Boolean).join(' ')}`;
};

// Lets the screen draw the next stage before the phone starts calculating.
const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

// The shared validator, typed: a usable plan or the reason it was rejected.
const checkPlan = (raw: unknown, dataset: Dataset) => validatePlan(raw, dataset.columns, dataset.columnTypes) as PlanCheck;

// The same proof flow as the web app's Ask:
// 1. the question plus a summary of the columns (no rows) goes to the AI,
//    which replies with a JSON calculation plan;
// 2. the plan is checked (one corrected retry) and run on every row, here on
//    the phone;
// 3. the AI words the result table;
// 4. every number in that wording is checked against the table.
export async function answerQuestion({
  dataset,
  question,
  context,
  language,
  numberFormat,
  signal,
  onStage,
}: {
  dataset: Dataset;
  question: string;
  context: AskContextItem[];
  language: Language;
  // How the AI should write numbers, and how the check reads them back.
  numberFormat: NumberFormat;
  signal: AbortSignal;
  onStage: (stage: AskStage) => void;
}): Promise<AskResult> {
  const summary = buildSchemaSummary(dataset);
  const schemaText = renderSchemaSummary(summary);
  const sent: SentPrompt[] = [];
  const totalRows = dataset.data.length;

  onStage('planning');
  const planPrompt = buildPlanPrompt(question, schemaText, context.slice(-3)) + PLAN_NOTE;
  sent.push({ label: 'plan', text: planPrompt });
  const planReply = await askAi(planPrompt, 'plan', { temperature: 0, signal });
  let questionsLeft = planReply.questionsLeft;
  let parsed = parsePlannerReply(planReply.text);

  // Questions that need no calculation are answered from the summary alone
  // and checked against the summary's own figures.
  if (parsed.kind === 'describe') {
    onStage('writing');
    const prompt = answerPrompt(buildDescribePrompt(question, schemaText), language, numberFormat);
    sent.push({ label: 'answer', text: prompt });
    const answer = await askAi(prompt, 'describe', { signal });
    const check = verifyNumbers(answer.text, schemaNumberCandidates(summary), numberFormat);
    return {
      kind: 'answer',
      text: answer.text,
      segments: check.segments,
      checked: check.checked,
      unverified: check.unverified,
      proof: { steps: [], table: [], rowsUsed: totalRows, totalRows, fromSummary: true, sent },
      context: null,
      questionsLeft: answer.questionsLeft ?? questionsLeft,
    };
  }

  let checked: PlanCheck = parsed.kind === 'plan' ? checkPlan(parsed.raw, dataset) : { ok: false, error: parsed.error };
  if (!checked.ok) {
    // One corrected attempt, then decline honestly.
    const retryPrompt = `${planPrompt}\n\nYour previous reply was rejected: ${checked.error}\nReply again with ONLY a corrected JSON object.`;
    sent.push({ label: 'retry', text: retryPrompt });
    const retryReply = await askAi(retryPrompt, 'plan-retry', { temperature: 0, signal });
    questionsLeft = retryReply.questionsLeft ?? questionsLeft;
    parsed = parsePlannerReply(retryReply.text);
    checked =
      parsed.kind === 'plan'
        ? checkPlan(parsed.raw, dataset)
        : { ok: false, error: parsed.kind === 'error' ? parsed.error : 'The reply was not a plan.' };
    if (!checked.ok) {
      return {
        kind: 'cannot',
        reason: checked.error,
        proof: { steps: [], table: [], rowsUsed: 0, totalRows, fromSummary: false, sent },
        questionsLeft,
      };
    }
  }

  onStage('calculating');
  await nextFrame();
  const result = runPlan(dataset.data, dataset.columns, checked.plan) as PlanResult;

  onStage('writing');
  const explainPrompt = answerPrompt(
    buildExplainPrompt(question, result.steps, result.table, result.rowsUsed, result.totalRows),
    language,
    numberFormat,
  );
  sent.push({ label: 'answer', text: explainPrompt });
  const answer = await askAi(explainPrompt, 'explain', { signal });
  // Each value with the row it came from: a number the answer ties to a row
  // ("October 1,200") must be that row's value, not just any value in the table.
  const candidates = collectLabelledCandidates(result.table, [result.rowsUsed, result.totalRows, result.table.length]);
  const check = verifyNumbers(answer.text, candidates, numberFormat);
  return {
    kind: 'answer',
    text: answer.text,
    segments: check.segments,
    checked: check.checked,
    unverified: check.unverified,
    proof: { ...result, fromSummary: false, sent },
    context: { question, plan: checked.plan, steps: result.steps },
    questionsLeft: answer.questionsLeft ?? questionsLeft,
  };
}
