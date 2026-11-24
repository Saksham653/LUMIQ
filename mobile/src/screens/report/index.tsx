import { useMemo } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { FileHeader } from '@/components/file-header';
import { NoFileChosen } from '@/components/no-file-chosen';
import { Numeral } from '@/components/numeral';
import { Radius, Spacing } from '@/constants/theme';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import type { StringKey } from '@/i18n';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset, useDatasets } from '@/state/datasets';
import type { Grade } from '@/utils/file-check';
import { buildReport, reportText } from '@/utils/report';

const GRADE_LABEL: Record<Grade, StringKey> = {
  great: 'check.grade.great',
  good: 'check.grade.good',
  look: 'check.grade.look',
  work: 'check.grade.work',
};

// Report: one page about the file to keep or share. Every number comes from
// the shared engine with a footnote saying how; Share sends the same page as
// text (WhatsApp, email, notes). The file itself is never sent.
export function Report() {
  const dataset = useActiveDataset();
  return dataset ? <DatasetReport key={dataset.id} dataset={dataset} /> : <NoFileChosen />;
}

function DatasetReport({ dataset }: { dataset: Dataset }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { language } = useAppState();
  const { datasetName } = useDatasets();
  const name = datasetName(dataset.id) ?? dataset.name;

  const report = useMemo(() => buildReport(dataset, name, t, numbers, language), [dataset, name, t, numbers, language]);
  const gradeLabel = t(GRADE_LABEL[report.check.grade]);
  const checkTone = report.check.grade === 'great' ? 'success' : report.check.grade === 'good' ? 'default' : 'accent';

  const share = async () => {
    try {
      await Share.share({ title: t('report.shareTitle', { name }), message: reportText(report, t, gradeLabel) });
    } catch {
      Alert.alert(t('report.shareFailed'));
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <FileHeader dataset={dataset} />
      <AppText variant="small" tone="secondary">
        {t('report.intro')}
      </AppText>

      <View style={[styles.page, { backgroundColor: colors.card }]}>
        <View style={styles.block}>
          <AppText variant="small" tone="secondary" style={styles.kicker}>
            {t('report.label')}
          </AppText>
          <AppText variant="title">{name}</AppText>
          <AppText variant="small" tone="secondary">
            {report.meta}
          </AppText>
        </View>

        <Divider />
        <View style={styles.block}>
          <AppText variant="label" accessibilityRole="header">
            {t('report.keyNumbers')}
          </AppText>
          <View style={styles.grid}>
            {report.numbers.map((item, index) => (
              <View
                key={item.label}
                style={[styles.tile, { backgroundColor: colors.background }]}
                accessible
                accessibilityLabel={`${item.label}: ${item.value}. ${item.footnote}`}>
                <AppText variant="small" tone="secondary">
                  {item.label}
                  <AppText variant="small" tone="tertiary">{` ${numbers.count(index + 1)}`}</AppText>
                </AppText>
                <Numeral parts={item.parts} format={numbers.format} size="medium" />
              </View>
            ))}
          </View>
        </View>

        <Divider />
        <View style={styles.block}>
          <AppText variant="label" accessibilityRole="header">
            {t('report.noticed')}
          </AppText>
          {report.noticed.length === 0 ? (
            <AppText tone="secondary">{t('report.nothingNoticed')}</AppText>
          ) : (
            report.noticed.map((item, index) => (
              <View key={index} style={styles.noticed}>
                <AppText variant="label">{item.title}</AppText>
                <AppText variant="small" tone="secondary">
                  {item.body}
                </AppText>
              </View>
            ))
          )}
        </View>

        <Divider />
        <View style={styles.block}>
          <AppText variant="label" accessibilityRole="header">
            {t('report.fileCheck')}
          </AppText>
          <AppText tone={checkTone}>{t('report.checkLine', { score: numbers.count(report.check.score), grade: gradeLabel })}</AppText>
        </View>

        <Divider />
        <View style={styles.block}>
          <AppText variant="label" accessibilityRole="header">
            {t('report.how')}
          </AppText>
          {report.numbers.map((item, index) => (
            <View key={item.label} style={styles.footnote}>
              <AppText variant="small" tone="tertiary" style={styles.footnoteMark}>
                {numbers.count(index + 1)}
              </AppText>
              <AppText variant="small" tone="secondary" style={styles.flex}>
                {item.footnote}
              </AppText>
            </View>
          ))}
        </View>

        <AppText variant="small" tone="secondary" style={styles.footer}>
          {t('report.footer')}
        </AppText>
      </View>

      <View style={styles.actions}>
        <BigButton label={t('report.share')} icon={{ ios: 'square.and.arrow.up', android: 'share' }} onPress={() => void share()} />
        <AppText variant="small" tone="secondary" style={styles.center}>
          {t('report.shareNote')}
        </AppText>
      </View>
    </ScrollView>
  );
}

function Divider() {
  const colors = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.huge },
  page: { padding: Spacing.xl, borderRadius: Radius.xxl, gap: Spacing.lg },
  block: { gap: Spacing.sm },
  kicker: { fontWeight: '700', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { flexGrow: 1, flexBasis: '45%', padding: Spacing.md, borderRadius: Radius.lg, gap: 2 },
  noticed: { gap: 2 },
  footnote: { flexDirection: 'row', gap: Spacing.sm },
  footnoteMark: { minWidth: 14, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  footer: { fontStyle: 'italic' },
  actions: { gap: Spacing.md },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
