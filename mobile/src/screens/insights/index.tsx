import { numericColumns } from '@core/data/dataset.js';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { HBarChart } from '@/components/h-bar-chart';
import { Section } from '@/components/section';
import { Radius, Spacing } from '@/constants/theme';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';
import { useActiveDataset, useDatasets } from '@/state/datasets';
import { buildChart } from '@/utils/chart';
import { formatAmount, formatCount, prettyColumn } from '@/utils/format';
import { describeInsights } from '@/utils/insight-text';
import { computeKpis } from '@/utils/kpis';

import { InsightCard } from './insight-card';
import { KpiCard } from './kpi-card';
import { MetricChips } from './metric-chips';

// Insights for the chosen file: pick a number column, see four big numbers,
// a chart and what LUMIQ noticed. All worked out on the phone with the same
// engine as the web app; nothing is sent anywhere.
export function Insights() {
  const colors = useTheme();
  const t = useT();
  const dataset = useActiveDataset();

  if (!dataset) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppIcon name={{ ios: 'doc.text.magnifyingglass', android: 'manage_search' }} size={36} color={colors.secondary} />
          <AppText variant="heading" style={styles.center}>
            {t('insights.noFileTitle')}
          </AppText>
          <AppText tone="secondary" style={styles.center}>
            {t('soon.noFile')}
          </AppText>
        </View>
        <BigButton label={t('soon.goHome')} onPress={() => router.navigate('/')} />
      </ScrollView>
    );
  }

  // Keyed by file, so opening another file starts again at the top with
  // that file's first number column instead of keeping the old scroll.
  return <DatasetInsights key={dataset.id} dataset={dataset} />;
}

function DatasetInsights({ dataset }: { dataset: Dataset }) {
  const colors = useTheme();
  const t = useT();
  const { language } = useAppState();
  const { datasetName } = useDatasets();

  const numeric = useMemo(() => numericColumns(dataset) as string[], [dataset]);
  const [picked, setPicked] = useState<string | null>(null);
  const metric = picked && numeric.includes(picked) ? picked : (numeric[0] ?? null);

  const kpis = useMemo(() => (metric ? computeKpis(dataset, metric) : null), [dataset, metric]);
  const chart = useMemo(() => (metric ? buildChart(dataset, metric) : null), [dataset, metric]);
  const insights = useMemo(() => describeInsights(dataset, t, language), [dataset, t, language]);

  const amount = (value: number | null) => formatAmount(value, kpis?.typeInfo, language);
  const name = datasetName(dataset.id) ?? dataset.name;
  const peak = chart ? chart.bars.reduce((best, bar) => (bar.value > best.value ? bar : best), chart.bars[0]) : null;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.fileRow}>
        <View style={styles.fileText}>
          <AppText variant="heading">{name}</AppText>
          <AppText variant="small" tone="secondary">
            {t('home.rowsCols', { rows: formatCount(dataset.data.length), cols: dataset.columns.length })}
          </AppText>
        </View>
        <Pressable onPress={() => router.navigate('/')} accessibilityRole="button" hitSlop={8} style={styles.changeFile}>
          <AppText variant="label" tone="primary">
            {t('insights.changeFile')}
          </AppText>
        </Pressable>
      </View>

      {!metric || !kpis ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText tone="secondary" style={styles.center}>
            {t('insights.noNumbers')}
          </AppText>
        </View>
      ) : (
        <>
          <Section title={t('insights.showing')}>
            <MetricChips columns={numeric} selected={metric} onSelect={setPicked} />
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
                ? t('insights.chartBy', { metric: prettyColumn(metric), group: prettyColumn(chart.groupColumn).toLowerCase() })
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
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  fileText: { flex: 1, gap: 2 },
  changeFile: { paddingVertical: Spacing.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  emptyCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.lg, borderWidth: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
