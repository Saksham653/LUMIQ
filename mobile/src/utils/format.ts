import type { ColumnType } from '@/data/types';
import { translate, type Language } from '@/i18n';

const INDIAN_SYMBOLS = new Set(['', '₹', 'Rs', 'Rs.', 'INR']);

// 46.77 → "46.77", 3.90 → "3.9", 7.0 → "7"
function trimNumber(value: number, decimals: number) {
  return String(Number(value.toFixed(decimals)));
}

// Puts the decimals back without trailing zeros: 4.50 → "4.5", 7.00 → "7".
function withFraction(grouped: string, fraction: string | undefined) {
  const digits = fraction?.replace(/0+$/, '');
  return digits ? `${grouped}.${digits}` : grouped;
}

// Indian digit grouping: 1234567 → "12,34,567".
function groupIndian(value: number, decimals: number) {
  const [whole, fraction] = value.toFixed(decimals).split('.');
  const lastThree = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree;
  return withFraction(grouped, fraction);
}

function groupInternational(value: number, decimals: number) {
  const [whole, fraction] = value.toFixed(decimals).split('.');
  return withFraction(whole.replace(/\B(?=(\d{3})+(?!\d))/g, ','), fraction);
}

// A number for people, not spreadsheets: rupee amounts and plain numbers in
// lakh / crore (लाख / करोड़ in Hindi), other currencies in K / M / B, and
// percentages with one decimal. Blanks show as a dash, never as 0.
export function formatAmount(value: number | null | undefined, typeInfo: ColumnType | undefined, language: Language): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (typeInfo?.type === 'percent') return `${trimNumber(value, 1)}%`;

  const symbol = typeInfo?.type === 'money' ? (typeInfo.symbol ?? '') : '';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const decimals = Number.isInteger(abs) ? 0 : abs < 100 ? 2 : 1;
  let core: string;

  if (INDIAN_SYMBOLS.has(symbol)) {
    if (abs >= 1e7) core = `${trimNumber(abs / 1e7, 2)} ${translate(language, 'unit.crore')}`;
    else if (abs >= 1e5) core = `${trimNumber(abs / 1e5, abs >= 1e6 ? 1 : 2)} ${translate(language, 'unit.lakh')}`;
    else core = groupIndian(abs, decimals);
  } else if (abs >= 1e9) core = `${trimNumber(abs / 1e9, 2)}B`;
  else if (abs >= 1e6) core = `${trimNumber(abs / 1e6, 2)}M`;
  else if (abs >= 1e4) core = `${trimNumber(abs / 1e3, 1)}K`;
  else core = groupInternational(abs, decimals);

  return `${sign}${symbol}${core}`;
}

// Whole counts with digit grouping, e.g. rows: 1240 → "1,240".
export function formatCount(value: number): string {
  return groupIndian(Math.round(value), 0);
}

// Exact figures for a result table, so they can be matched with the words of
// an answer: digit grouping and at most two decimals, never lakh or K.
export function formatExact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  return `${value < 0 ? '-' : ''}${groupIndian(abs, Number.isInteger(abs) ? 0 : 2)}`;
}

// Column names as people would say them: "avg_order_value" → "Avg order value".
export function prettyColumn(column: string): string {
  const spaced = column.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : column;
}

export function formatDate(timestamp: number, language: Language): string {
  try {
    return new Date(timestamp).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return new Date(timestamp).toDateString();
  }
}
