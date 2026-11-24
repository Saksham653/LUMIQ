import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FileHeader } from '@/components/file-header';
import { NoFileChosen } from '@/components/no-file-chosen';
import { Section } from '@/components/section';
import { Radius, Spacing } from '@/constants/theme';
import type { ColumnKind, Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { listJoin, type Language, type StringKey } from '@/i18n';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset } from '@/state/datasets';
import { CHECKS, checkFile, profileColumn, type CheckKind, type Deduction, type Grade } from '@/utils/file-check';

import { CheckRow } from './check-row';
import { ColumnCard } from './column-card';
import { ScoreCard } from './score-card';

const FIRST_COLUMNS = 4;

const CHECK_TITLE: Record<CheckKind, StringKey> = {
  empty: 'check.empty',
  repeats: 'check.repeats',
  mixed: 'check.mixed',
  unusual: 'check.unusual',
};
const FIX_TIP: Record<CheckKind, StringKey> = {
  empty: 'check.fixTip.empty',
  repeats: 'check.fixTip.repeats',
  mixed: 'check.fixTip.mixed',
  unusual: 'check.fixTip.unusual',
};
const GRADE_LABEL: Record<Grade, StringKey> = {
  great: 'check.grade.great',
  good: 'check.grade.good',
  look: 'check.grade.look',
  work: 'check.grade.work',
};
const GRADE_SENTENCE: Record<Grade, StringKey> = {
  great: 'check.sentence.great',
  good: 'check.sentence.good',
  look: 'check.sentence.look',
  work: 'check.sentence.work',
};
const TYPE_LABEL: Record<ColumnKind, StringKey> = {
  number: 'check.type.number',
  money: 'check.type.money',
  percent: 'check.type.percent',
  date: 'check.type.date',
  text: 'check.type.text',
};

// "17, 18, 19, 20" — with "…" when there are more than the examples shown.
const rowList = (rows: string[], total: number, language: Language) =>
  `${listJoin(rows, language)}${total > rows.length ? (language === 'ja' || language === 'zh' ? '、…' : ', …') : ''}`;

// File check: is the file clean and ready? The shared health score (the same
// four checks as the web app), every lost point explained, where it is and
// how to fix it, plus how LUMIQ read each column. All on the phone.
export function FileCheck() {
  const dataset = useActiveDataset();
  return dataset ? <DatasetCheck key={dataset.id} dataset={dataset} /> : <NoFileChosen />;
}

function DatasetCheck({ dataset }: { dataset: Dataset }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { language } = useAppState();
  const [allColumns, setAllColumns] = useState(false);

  const result = useMemo(() => checkFile(dataset), [dataset]);
  const profiles = useMemo(() => dataset.columns.map((column) => profileColumn(dataset, column)), [dataset]);
  const shown = allColumns ? profiles : profiles.slice(0, FIRST_COLUMNS);
  const clearCount = CHECKS.filter((kind) => result.checks[kind].length === 0).length;

  const amountIn = (column: string, value: number) => numbers.amount(value, dataset.columnTypes?.[column], column);
  const formatCount = numbers.count;
  const formatExact = numbers.exact;
  const points = (list: Deduction[]) => list.reduce((total, item) => total + item.points, 0);

  const summaryFor = (kind: CheckKind): string => {
    const found = result.checks[kind];
    if (found.length === 0) return t('check.noneFound');
    const first = found[0];
    if (first.kind === 'repeats') {
      return t('check.repeatsSummary', { repeats: formatCount(first.facts.repeats), rows: formatCount(first.facts.rows), points: first.points });
    }
    return t('check.foundIn', { columns: found.length, total: dataset.columns.length, points: points(found) });
  };

  const detailsFor = (kind: CheckKind) => {
    const lines: string[] = [];
    for (const item of result.checks[kind]) {
      if (item.kind === 'empty') {
        lines.push(t('check.emptyLine', { column: item.facts.column, empty: formatCount(item.facts.empty), rows: formatCount(item.facts.rows), points: item.points }));
        lines.push(t('check.rows', { rows: rowList(item.facts.examples.map(formatCount), item.facts.empty, language) }));
      } else if (item.kind === 'repeats') {
        lines.push(t('check.rows', { rows: rowList(item.facts.examples.map(formatCount), item.facts.repeats, language) }));
      } else if (item.kind === 'mixed') {
        lines.push(t('check.mixedLine', { column: item.facts.column, numericish: item.facts.numericish, total: item.facts.total, points: item.points }));
      } else if (item.kind === 'unusual') {
        // Exact figures, not lakh: the point is to find the cell to fix.
        lines.push(t('check.unusualLine', { column: item.facts.column, typical: formatExact(item.facts.typical), points: item.points }));
        for (const example of item.facts.examples) {
          lines.push(t('check.unusualExample', { row: example.row, value: formatExact(example.value) }));
        }
      }
    }
    return (
      <>
        {lines.map((line, index) => (
          <AppText key={index} variant="small">
            {line}
          </AppText>
        ))}
        <AppText variant="small" tone="secondary" style={styles.tip}>
          {t(FIX_TIP[kind])}
        </AppText>
      </>
    );
  };

  const columnSummary = (profile: (typeof profiles)[number]) => {
    if (profile.range) {
      return t('check.range', { low: amountIn(profile.name, profile.range.low), high: amountIn(profile.name, profile.range.high) });
    }
    if (profile.dates) return t('check.dateRange', { first: profile.dates.first, last: profile.dates.last });
    if (profile.values) return t('check.values', { unique: formatCount(profile.values.unique), common: listJoin(profile.values.common, language) });
    return t('check.noneFound');
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <FileHeader dataset={dataset} />
      <AppText tone="secondary">{t('check.intro')}</AppText>

      <ScoreCard
        score={result.score}
        grade={result.grade}
        outOf={t('check.outOf')}
        gradeLabel={t(GRADE_LABEL[result.grade])}
        sentence={result.noRows ? t('check.noRows') : t(GRADE_SENTENCE[result.grade])}
        privacy={t('privacy.short')}
      />

      {!result.noRows && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <AppText variant="heading" style={styles.flex}>
              {t('check.whatWeChecked')}
            </AppText>
            <AppText variant="small" snug tone={clearCount === CHECKS.length ? 'success' : 'secondary'}>
              {t('check.clearCount', { clear: clearCount })}
            </AppText>
          </View>
          {CHECKS.map((kind) => (
            <CheckRow
              key={kind}
              title={t(CHECK_TITLE[kind])}
              summary={summaryFor(kind)}
              clear={result.checks[kind].length === 0}
              okLabel={t('check.ok')}
              seeLabel={t('check.seeIt')}
              hideLabel={t('check.hide')}>
              {detailsFor(kind)}
            </CheckRow>
          ))}
        </View>
      )}

      <Section title={t('check.yourColumns')}>
        <AppText variant="small" tone="secondary">
          {t('check.columnsCount', { count: dataset.columns.length, rows: formatCount(dataset.data.length) })}
        </AppText>
        {shown.map((profile) => (
          <ColumnCard
            key={profile.name}
            name={profile.name}
            type={profile.type}
            typeLabel={t(TYPE_LABEL[profile.type])}
            summary={columnSummary(profile)}
            note={profile.blanks > 0 ? t('check.blanks', { count: formatCount(profile.blanks) }) : null}
          />
        ))}
        {profiles.length > FIRST_COLUMNS && (
          <Pressable onPress={() => setAllColumns((value) => !value)} accessibilityRole="button" style={[styles.more, { borderColor: colors.border }]}>
            <AppText variant="label" tone="primary" style={styles.center}>
              {allColumns ? t('check.showFewer') : t('check.seeAll', { count: profiles.length })}
            </AppText>
          </Pressable>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  flex: { flex: 1 },
  tip: { marginTop: Spacing.xs },
  more: { minHeight: 48, justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
