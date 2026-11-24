import {
  formatAmount,
  formatCount,
  formatExact,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  resolveNumberFormat,
} from '@core/lib/numberFormat.js';

import type { ColumnType } from '@/data/types';
import { languageInfo, type Language } from '@/i18n';
import type { DefaultCurrency, NumberStyleChoice } from '@/utils/settings-file';

export type NumberFormat = ReturnType<typeof resolveNumberFormat>;

// Every number on screen goes through one of these, so it follows the chosen
// language, the number style picked by hand and the file's own currency.
export type Numbers = {
  format: NumberFormat;
  // Big numbers shortened (4.68M, 46.8 लाख, 4,68 Mio., 468万); money with
  // its currency; percent with one decimal. `column` lets an amount column
  // show the default currency when the file has none.
  amount: (value: number | null | undefined, typeInfo?: ColumnType, column?: string) => string;
  // Whole counts with grouping: 1,240 / 1.240 / 1 240.
  count: (value: number) => string;
  // Exact figures (at most two decimals), never shortened.
  exact: (value: number) => string;
  // A plain number with up to `decimals` decimals.
  number: (value: number, decimals?: number) => string;
  percent: (value: number, decimals?: number) => string;
  // A change with its sign: "+5.5%", "-2 %".
  signedPercent: (value: number) => string;
  date: (timestamp: number) => string;
};

const CURRENCY_SYMBOL: Record<DefaultCurrency, { symbol: string; currency?: string }> = {
  USD: { symbol: '$' },
  EUR: { symbol: '€' },
  GBP: { symbol: '£' },
  JPY: { symbol: '¥', currency: 'JPY' },
  CNY: { symbol: '¥', currency: 'CNY' },
  INR: { symbol: '₹' },
  ILS: { symbol: '₪' },
};

// Columns that hold amounts of money, by name. Rates, counts and scores are
// never given a currency.
const MONEY_NAME = /revenue|sales|amount|price|cost|spend|profit|income|budget|salary|fee|paid|turnover|gmv|earning|expense|value|total/i;
const NOT_MONEY_NAME = /rate|margin|ratio|pct|percent|score|nps|count|qty|quantity|orders|units|returns/i;

function withDefaultCurrency(typeInfo: ColumnType | undefined, column: string | undefined, currency: DefaultCurrency | null) {
  if (!currency || !column || typeInfo?.type !== 'number') return typeInfo;
  if (!MONEY_NAME.test(column) || NOT_MONEY_NAME.test(column)) return typeInfo;
  return { type: 'money', ...CURRENCY_SYMBOL[currency] } as ColumnType;
}

export function makeNumbers(
  language: Language,
  style: NumberStyleChoice = 'auto',
  defaultCurrency: DefaultCurrency | null = null,
): Numbers {
  const format = resolveNumberFormat(language, style);
  const locale = `${languageInfo(language).locale}-u-nu-latn`;
  return {
    format,
    amount: (value, typeInfo, column) =>
      formatAmount(value ?? null, withDefaultCurrency(typeInfo, column, defaultCurrency), format),
    count: (value) => formatCount(value, format),
    exact: (value) => formatExact(value, format),
    number: (value, decimals = 2) => formatNumber(value, format, { maxDecimals: decimals }),
    percent: (value, decimals = 1) => formatPercent(value, format, decimals),
    signedPercent: (value) => formatSignedPercent(value, format),
    date: (timestamp) => {
      try {
        return new Date(timestamp).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {
        return new Date(timestamp).toDateString();
      }
    },
  };
}

// Column names as people would say them: "avg_order_value" → "Avg order value".
export function prettyColumn(column: string): string {
  const spaced = column.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : column;
}
