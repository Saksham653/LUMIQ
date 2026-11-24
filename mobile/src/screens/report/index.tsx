import { useMemo } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { FileHeader } from '@/components/file-header';
import { NoFileChosen } from '@/components/no-file-chosen';
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
  const checkTone = report.check.grade === 'great' ? 'success' : report.check.grade === 'good' ? 'primary' : 'accent';

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
      <AppText tone="secondary">{t('report.intro')}</AppText>

      <View style={[styles.page, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.block}>
          <AppText variant="small" tone="primary" style={styles.kicker}>
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
              <View key={item.label} style={[styles.tile, { backgroundColor: colors.background }]} accessible>
                <AppText variant="small" tone="secondary">
                  {`${item.label} [${index + 1}]`}
                </AppText>
                <AppText variant="heading">{item.value}</AppText>
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
                <AppText variant="label">{`•  ${item.title}`}</AppText>
                <AppText variant="small" tone="secondary" style={styles.indent}>
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
          <AppText tone={checkTone}>{t('report.checkLine', { score: report.check.score, grade: gradeLabel })}</AppText>
        </View>

        <Divider />
        <View style={styles.block}>
          <AppText variant="label" accessibilityRole="header">
            {t('report.how')}
          </AppText>
          {report.numbers.map((item, index) => (
            <AppText key={item.label} variant="small" tone="secondary">
              {`[${index + 1}] ${item.footnote}`}
            </AppText>
          ))}
        </View>

        <AppText variant="small" tone="secondary" style={styles.footer}>
          {t('report.footer')}
        </AppText>
      </View>

      <BigButton label={t('report.share')} onPress={() => void share()} />
      <AppText variant="small" tone="secondary" style={styles.center}>
        {t('report.shareNote')}
      </AppText>
    </ScrollView>
  );
}

function Divider() {
  const colors = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  page: { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.lg },
  block: { gap: Spacing.sm },
  kicker: { fontWeight: '700', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { flexGrow: 1, flexBasis: '45%', padding: Spacing.md, borderRadius: Radius.md, gap: 2 },
  noticed: { gap: 2 },
  indent: { paddingLeft: Spacing.lg },
  divider: { height: StyleSheet.hairlineWidth },
  footer: { fontStyle: 'italic' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
