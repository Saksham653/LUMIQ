import { computeInsights } from '@core/engine/insights.js';

import type { IconName } from '@/components/app-icon';
import type { Dataset } from '@/data/types';
import { inSentence, type Language, type StringKey } from '@/i18n';
import { prettyColumn, type Numbers } from '@/utils/format';

type Translate = (key: StringKey, params?: Record<string, string | number>) => string;

type RawInsight = {
  type: 'top' | 'trend_up' | 'trend_down' | 'unusual';
  facts?: Record<string, unknown>;
};

export type InsightView = {
  id: string;
  icon: IconName;
  tone: 'primary' | 'accent' | 'secondary';
  title: string;
  body: string;
};

// The shared engine's findings (same rules as the web app), worded in the
// chosen language from their raw facts, with numbers in that language's format.
export function describeInsights(dataset: Dataset, t: Translate, numbers: Numbers, language: Language): InsightView[] {
  const insights = computeInsights(dataset, dataset.data) as RawInsight[];
  const amount = (value: unknown, column: unknown) =>
    numbers.amount(typeof value === 'number' ? value : null, dataset.columnTypes?.[String(column)], String(column));

  const views: InsightView[] = [];
  insights.forEach((insight, index) => {
    const f = insight.facts;
    if (!f) return;
    const id = `${insight.type}-${index}`;

    if (insight.type === 'top') {
      const params = {
        group: String(f.group),
        metric: prettyColumn(String(f.metric)),
        share: numbers.number(Number(f.share), 1),
        total: amount(f.total, f.metric),
        groups: Number(f.groups),
        groupColumn: inSentence(prettyColumn(String(f.groupColumn)), language),
      };
      views.push({
        id,
        icon: { ios: 'chart.pie.fill', android: 'pie_chart' },
        tone: 'primary',
        title: t('insight.top.title', params),
        body: t('insight.top.body', params),
      });
    } else if (insight.type === 'trend_up' || insight.type === 'trend_down') {
      const up = insight.type === 'trend_up';
      const params = {
        metric: prettyColumn(String(f.metric)),
        change: numbers.number(Number(f.change), 1),
        from: amount(f.from, f.metric),
        fromLabel: String(f.fromLabel),
        to: amount(f.to, f.metric),
        toLabel: String(f.toLabel),
      };
      views.push({
        id,
        icon: up ? { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' } : { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down' },
        tone: 'primary',
        title: t(up ? 'insight.trendUp.title' : 'insight.trendDown.title', params),
        body: t('insight.trend.body', params),
      });
    } else if (insight.type === 'unusual') {
      const params = {
        column: prettyColumn(String(f.column)),
        value: amount(f.value, f.column),
        typical: amount(f.typical, f.column),
      };
      views.push({
        id,
        icon: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
        // Amber means "needs a look".
        tone: 'accent',
        title: t('insight.unusual.title', params),
        body: t(f.direction === 'above' ? 'insight.unusualAbove.body' : 'insight.unusualBelow.body', params),
      });
    }
  });
  return views;
}
