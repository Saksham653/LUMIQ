import { buildReportData } from '@core/engine/reportData.js';

import type { ColumnType, Dataset } from '@/data/types';
import type { Language, StringKey } from '@/i18n';
import { checkFile, type Grade } from '@/utils/file-check';
import { prettyColumn, type Numbers } from '@/utils/format';
import { describeInsights } from '@/utils/insight-text';

type Translate = (key: StringKey, params?: Record<string, string | number>) => string;

type EngineItem = { kind: 'rows' | 'sum' | 'avg'; column: string | null; value: number | null; typeInfo?: ColumnType };

// Column names that already say what they are ("Avg order value", "Total
// sales") are used as the label as they are, not as "Average Avg order value".
const SAYS_AVERAGE = /^(avg|average|mean)\b/i;
const SAYS_TOTAL = /^(total|sum)\b/i;

export type ReportNumber = { label: string; value: string; footnote: string };

export type Report = {
  name: string;
  meta: string;
  numbers: ReportNumber[];
  noticed: { title: string; body: string }[];
  check: { score: number; grade: Grade };
};

// The report's contents, worded in the app's language: the shared engine's
// headline numbers with their footnotes, what LUMIQ noticed, and the File
// check score. Everything is worked out on the phone.
export function buildReport(dataset: Dataset, name: string, t: Translate, formatter: Numbers, language: Language): Report {
  const engine = buildReportData(dataset) as { items: EngineItem[] };
  const rows = formatter.count(dataset.data.length);

  const numbers = engine.items.map((item): ReportNumber => {
    if (item.kind === 'rows' || !item.column) {
      return { label: t('report.rows'), value: formatter.count(item.value ?? 0), footnote: t('report.footRows', { name }) };
    }
    const column = prettyColumn(item.column);
    const saysItself = item.kind === 'avg' ? SAYS_AVERAGE.test(column) : SAYS_TOTAL.test(column);
    return {
      label: saysItself ? column : t(item.kind === 'avg' ? 'report.average' : 'report.total', { column }),
      value: formatter.amount(item.value, item.typeInfo, item.column),
      footnote: t(item.kind === 'avg' ? 'report.footAvg' : 'report.footSum', { column, rows }),
    };
  });

  const check = checkFile(dataset);
  return {
    name,
    meta: t('report.meta', { rows, cols: dataset.columns.length, date: formatter.date(Date.now()) }),
    numbers,
    noticed: describeInsights(dataset, t, formatter, language).map(({ title, body }) => ({ title, body })),
    check: { score: check.score, grade: check.grade },
  };
}

// The report as a plain-text message (WhatsApp, email, notes): the same
// contents as the screen, footnotes as [1], [2]…
export function reportText(report: Report, t: Translate, gradeLabel: string): string {
  const lines = [`📊 ${t('report.shareTitle', { name: report.name })}`, report.meta, '', t('report.keyNumbers')];
  report.numbers.forEach((item, index) => lines.push(`• ${item.label}: ${item.value} [${index + 1}]`));
  lines.push('', t('report.noticed'));
  if (report.noticed.length === 0) lines.push(`• ${t('report.nothingNoticed')}`);
  report.noticed.forEach((item) => lines.push(`• ${item.title} — ${item.body}`));
  lines.push('', `${t('report.fileCheck')}: ${t('report.checkLine', { score: report.check.score, grade: gradeLabel })}`);
  lines.push('', t('report.how'));
  report.numbers.forEach((item, index) => lines.push(`[${index + 1}] ${item.footnote}`));
  lines.push('', t('report.footer'));
  return lines.join('\n');
}
