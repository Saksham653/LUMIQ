import { isBlank } from '@core/lib/stats.js';

import type { Dataset } from '@/data/types';

const MAX_GROUPS = 30;

// Text columns that split the file into a few named groups (2 to 30), the
// ones a "change only one group" choice makes sense for. Most common first.
export function groupColumns(dataset: Dataset): string[] {
  return dataset.columns.filter((column) => {
    if ((dataset.columnTypes?.[column]?.type ?? 'text') !== 'text') return false;
    const groups = new Set(dataset.data.map((row) => row[column]).filter((value) => !isBlank(value))).size;
    return groups >= 2 && groups <= MAX_GROUPS && groups < dataset.data.length;
  });
}

// The groups in a column, biggest (most rows) first, with their row counts.
export function groupValues(dataset: Dataset, column: string): { value: string; rows: number }[] {
  const counts = new Map<string, number>();
  for (const row of dataset.data) {
    const cell = row[column];
    if (isBlank(cell)) continue;
    const key = String(cell);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, rows]) => ({ value, rows })).sort((a, b) => b.rows - a.rows);
}

// "+5.5%" / "-2%" / "0%": a change in percent, one decimal at most.
export function signedPercent(value: number): string {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}
