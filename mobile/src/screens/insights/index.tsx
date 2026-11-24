import { numericColumns } from '@core/data/dataset.js';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ChoiceChips } from '@/components/choice-chips';
import { FileHeader } from '@/components/file-header';
import { HBarChart } from '@/components/h-bar-chart';
import { NoFileChosen } from '@/components/no-file-chosen';
import { Section } from '@/components/section';
import { Radius, Spacing } from '@/constants/theme';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { inSentence } from '@/i18n';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset } from '@/state/datasets';
import { buildChart } from '@/utils/chart';
import { prettyColumn } from '@/utils/format';
import { describeInsights } from '@/utils/insight-text';
import { computeKpis } from '@/utils/kpis';

import { InsightCard } from './insight-card';
import { KpiCard } from './kpi-card';

// Insights for the chosen file: pick a number column, see four big numbers,
// a chart and what LUMIQ noticed. All worked out on the phone with the same
// engine as the web app; nothing is sent anywhere.
export function Insights() {
  const dataset = useActiveDataset();
  // Keyed by file, so opening another file starts again at the top with
  // that file's first number column instead of keeping the old scroll.
  return dataset ? <DatasetInsights key={dataset.id} dataset={dataset} /> : <NoFileChosen />;
}

function DatasetInsights({ dataset }: { dataset: Dataset }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { language } = useAppState();
  const formatCount = numbers.count;

  const numeric = useMemo(() => numericColumns(dataset) as string[], [dataset]);
  const [picked, setPicked] = useState<string | null>(null);
  const metric = picked && numeric.includes(picked) ? picked : (numeric[0] ?? null);

  const kpis = useMemo(() => (metric ? computeKpis(dataset, metric) : null), [dataset, metric]);
  const chart = useMemo(() => (metric ? buildChart(dataset, metric) : null), [dataset, metric]);
  const insights = useMemo(() => describeInsights(dataset, t, numbers, language), [dataset, t, numbers, language]);

  const amount = (value: number | null) => numbers.amount(value, kpis?.typeInfo, metric ?? undefined);
  const peak = chart ? chart.bars.reduce((best, bar) => (bar.value > best.value ? bar : best), chart.bars[0]) : null;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <FileHeader dataset={dataset} />

      {!metric || !kpis ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText tone="secondary" style={styles.center}>
            {t('insights.noNumbers')}
          </AppText>
        </View>
      ) : (
        <>
          <Section title={t('insights.showing')}>
            <ChoiceChips
              choices={numeric.map((column) => ({ value: column, label: prettyColumn(column) }))}
              selected={metric}
              onSelect={setPicked}
            />
          </Section>

          <View style={styles.kpiGrid}>
            <KpiCard
              label={t(kpis.rule === 'avg' ? 'insights.average' : 'insights.total')}
              value={amount(kpis.headline)}
              note={t(kpis.rule === 'avg' ? 'insights.averageOfRows' : 'insights.totalHow', { rows: formatCount(kpis.values) })}
            />
            <KpiCard
              label={t(kpis.rule === 'avg' ? 'insights.middle' : 'insights.average')}
              value={amount(kpis.second)}
              note={kpis.rule === 'avg' ? t('insights.middleHow') : t('insights.averageHow', { rows: formatCount(kpis.values) })}
            />
            <KpiCard
              label={t('insights.highest')}
              value={amount(kpis.highest)}
              note={kpis.highestLabel ? t('insights.highestIn', { label: kpis.highestLabel }) : ''}
              highlight
            />
            <KpiCard label={t('insights.rowsLabel')} value={formatCount(kpis.rows)} note={t('insights.rowsHow')} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="heading">
              {chart?.groupColumn
                ? t('insights.chartBy', { metric: prettyColumn(metric), group: inSentence(prettyColumn(chart.groupColumn), language) })
                : t('insights.chartRows', { metric: prettyColumn(metric) })}
            </AppText>
            {chart && peak ? (
              <>
                <AppText variant="small" tone="secondary">
                  {t('insights.chartHighest', { label: peak.label, value: amount(peak.value) })}
                </AppText>
                <HBarChart bars={chart.bars} formatValue={amount} />
              </>
            ) : (
              <AppText tone="secondary">{t('insights.noChart')}</AppText>
            )}
          </View>
        </>
      )}

      <Section title={t('insights.noticed')}>
        {insights.length > 0 ? (
          insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
        ) : (
          <AppText tone="secondary">{t('insights.nothingNoticed')}</AppText>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.xxxl },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  emptyCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.lg, borderWidth: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
