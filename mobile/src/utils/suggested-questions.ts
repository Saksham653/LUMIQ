import { exampleQuestions } from '@core/ai/oraclePlanner.js';
import { aggregationRule } from '@core/data/columnTypes.js';
import { numericColumns } from '@core/data/dataset.js';

import type { Dataset } from '@/data/types';
import { translate, type Language } from '@/i18n';

// Three questions this file can answer, built from its real columns: in
// English the same picks as the web app's examples, in every other language
// the same kinds of question from translated templates. Column names stay
// exactly as in the file so the AI can match them.
export function suggestedQuestions(dataset: Dataset, language: Language): string[] {
  if (language === 'en') return exampleQuestions(dataset) as string[];

  const numeric = numericColumns(dataset) as string[];
  const group = dataset.columns.find((column) => (dataset.columnTypes?.[column]?.type ?? 'text') === 'text');
  const sumColumn = numeric.find((column) => aggregationRule(column, dataset.columnTypes?.[column]) === 'sum');
  const avgColumn = numeric.find((column) => aggregationRule(column, dataset.columnTypes?.[column]) === 'avg');

  const questions: string[] = [];
  if (sumColumn && group) questions.push(translate(language, 'suggest.totalBy', { metric: sumColumn, group }));
  if (avgColumn) questions.push(translate(language, 'suggest.average', { metric: avgColumn }));
  if (numeric.length > 0 && group) questions.push(translate(language, 'suggest.highestIn', { metric: numeric[0], group }));
  for (const column of numeric) {
    if (questions.length >= 3) break;
    const question = translate(language, 'suggest.highest', { metric: column });
    if (!questions.includes(question)) questions.push(question);
  }
  return questions.slice(0, 3);
}
