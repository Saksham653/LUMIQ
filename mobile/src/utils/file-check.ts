import { computeHealth } from '@core/engine/dataHealth.js';
import { isBlank, max, min } from '@core/lib/stats.js';

import type { ColumnKind, Dataset } from '@/data/types';

export type CheckKind = 'empty' | 'repeats' | 'mixed' | 'unusual';
export const CHECKS: CheckKind[] = ['empty', 'repeats', 'mixed', 'unusual'];

export type Deduction =
  | { points: number; kind: 'empty'; facts: { column: string; empty: number; rows: number; examples: number[] } }
  | { points: number; kind: 'repeats'; facts: { repeats: number; rows: number; examples: number[] } }
  | { points: number; kind: 'mixed'; facts: { column: string; numericish: number; total: number } }
  | {
      points: number;
      kind: 'unusual';
      facts: { column: string; count: number; typical: number; examples: { row: number; value: number }[] };
    }
  | { points: number; kind: 'noRows'; facts: Record<string, never> };

export type Grade = 'great' | 'good' | 'look' | 'work';

export type FileCheck = {
  score: number;
  grade: Grade;
  noRows: boolean;
  // The deductions of each check; an empty list means the check is clear.
  checks: Record<CheckKind, Deduction[]>;
};

export function gradeFor(score: number): Grade {
  if (score >= 90) return 'great';
  if (score >= 75) return 'good';
  if (score >= 50) return 'look';
  return 'work';
}

// The shared health score (same four checks as the web app), grouped by check.
export function checkFile(dataset: Dataset): FileCheck {
  const health = computeHealth(dataset) as { score: number; deductions: Deduction[] };
  const checks: Record<CheckKind, Deduction[]> = { empty: [], repeats: [], mixed: [], unusual: [] };
  let noRows = false;
  for (const deduction of health.deductions) {
    if (deduction.kind === 'noRows') noRows = true;
    else checks[deduction.kind].push(deduction);
  }
  return { score: health.score, grade: gradeFor(health.score), noRows, checks };
}

export type ColumnProfile = {
  name: string;
  type: ColumnKind;
  blanks: number;
  // Numbers: smallest and largest. Dates: earliest and latest (as written).
  // Text: how many different values and the most common ones.
  range: { low: number; high: number } | null;
  dates: { first: string; last: string } | null;
  values: { unique: number; common: string[] } | null;
};

// A short description of one column, worked out from all its rows.
export function profileColumn(dataset: Dataset, name: string): ColumnProfile {
  const type = dataset.columnTypes?.[name]?.type ?? 'text';
  const cells = dataset.data.map((row) => row[name]);
  const filled = cells.filter((cell) => !isBlank(cell));
  const profile: ColumnProfile = { name, type, blanks: cells.length - filled.length, range: null, dates: null, values: null };

  if (type === 'number' || type === 'money' || type === 'percent') {
    const low = min(cells) as number | null;
    const high = max(cells) as number | null;
    if (low !== null && high !== null) profile.range = { low, high };
  } else if (type === 'date') {
    const dated = filled
      .map((cell) => ({ text: String(cell), time: Date.parse(String(cell)) }))
      .filter((entry) => Number.isFinite(entry.time))
      .sort((a, b) => a.time - b.time);
    if (dated.length > 0) profile.dates = { first: dated[0].text, last: dated[dated.length - 1].text };
  }

  if (!profile.range && !profile.dates) {
    const counts = new Map<string, number>();
    for (const cell of filled) counts.set(String(cell), (counts.get(String(cell)) ?? 0) + 1);
    const common = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([value]) => value);
    profile.values = { unique: counts.size, common };
  }
  return profile;
}
