import { aggregationRule } from '@core/data/columnTypes.js';
import { isBlank, max, mean, median, numericValues, sum } from '@core/lib/stats.js';

import type { ColumnType, Dataset } from '@/data/types';

export type Kpis = {
  rule: 'sum' | 'avg';
  typeInfo: ColumnType | undefined;
  headline: number | null;
  second: number | null;
  highest: number | null;
  highestLabel: string | null;
  values: number;
  rows: number;
};

// The four tiles for one number column, with the shared blank-aware stats:
// amounts are totalled and averaged; rate-like columns (percentages,
// margins, scores) are averaged and their middle value shown instead.
export function computeKpis(dataset: Dataset, metric: string): Kpis {
  const typeInfo = dataset.columnTypes?.[metric];
  const rule = aggregationRule(metric, typeInfo) === 'avg' ? 'avg' : 'sum';
  const cells = dataset.data.map((row) => row[metric]);
  const highest = max(cells) as number | null;

  const labelColumn = dataset.columns[0];
  const highestRow = highest === null ? undefined : dataset.data.find((row) => row[metric] === highest);
  const highestLabel =
    highestRow && labelColumn !== metric && !isBlank(highestRow[labelColumn]) ? String(highestRow[labelColumn]) : null;

  return {
    rule,
    typeInfo,
    headline: (rule === 'avg' ? mean(cells) : sum(cells)) as number | null,
    second: (rule === 'avg' ? median(cells) : mean(cells)) as number | null,
    highest,
    highestLabel,
    values: numericValues(cells).length,
    rows: dataset.data.length,
  };
}
