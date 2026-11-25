import { numericColumns } from '@core/data/dataset.js';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import type { ColumnKind, Dataset } from '@/data/types';
import { listJoin, type Language, type StringKey } from '@/i18n';
import { useLocalT } from '@/i18n/local';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset } from '@/state/datasets';
import { rhythm, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import type { IconName } from '@/ui/icon-set';
import { List } from '@/ui/list';
import { Notice } from '@/ui/notice';
import { Section } from '@/ui/section';
import { Skeleton, SkeletonBlock, SkeletonCard, SkeletonRow, SkeletonText } from '@/ui/skeleton';
import { VStack } from '@/ui/stack';
import {
  CHECKS,
  checkFile,
  profileColumn,
  type CheckKind,
  type ColumnProfile,
  type Deduction,
  type FileCheck as FileCheckResult,
  type Grade,
} from '@/utils/file-check';

import { CheckRow, type CheckResult } from './check-row';
import { ColumnRow } from './column-card';
import { FixCard, type FixItem } from './fix-card';
import { ScoreBlock } from './score-card';
import { CHECK_STRINGS } from './strings';
import { FailedNote, FileLine, NoFileState, PrivacyLine, isBigFile, toolStyles, useWorkedOut } from './tool-parts';

const FIRST_COLUMNS = 4;
// How many things worth fixing lead the screen.
const TOP_FIXES = 3;
// The width of the large ring (`size="lg"` in ui/charts/ring.tsx), for its
// place in the skeleton.
const RING_LG = 200;

// Files whose score has already been revealed in this session: the ring
// draws only the first time a file is checked.
const revealed = new Set<string>();

const CHECK_TITLE: Record<CheckKind, StringKey> = {
  empty: 'check.empty',
  repeats: 'check.repeats',
  mixed: 'check.mixed',
  unusual: 'check.unusual',
};
const CHECK_ICON: Record<CheckKind, IconName> = {
  empty: 'row',
  repeats: 'copy',
  mixed: 'column',
  unusual: 'chart-bar',
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

// A lost point that belongs to one of the four checks.
type Found = Exclude<Deduction, { kind: 'noRows' }>;

// "17, 18, 19, 20" — with "…" when there are more than the examples shown.
const rowList = (rows: string[], total: number, language: Language) =>
  `${listJoin(rows, language)}${total > rows.length ? (language === 'ja' || language === 'zh' ? '、…' : ', …') : ''}`;

// Everything the screen shows, worked out once per file on the phone: the
// shared health score (the same four checks as the web app), how LUMIQ read
// each column, and whether there were numbers to compare at all.
type CheckWork = { check: FileCheckResult; profiles: ColumnProfile[]; hasNumbers: boolean };

function workOut(dataset: Dataset): CheckWork {
  return {
    check: checkFile(dataset),
    profiles: dataset.columns.map((column) => profileColumn(dataset, column)),
    hasNumbers: (numericColumns(dataset) as string[]).length > 0,
  };
}

// File check: is the file clean and ready? One score first, with its grade
// in words; then the three things most worth fixing, each with why and the
// rows or values that show it; then every check with its result; then how
// LUMIQ read each column. All worked out on the phone.
export function FileCheck() {
  const dataset = useActiveDataset();
  const lt = useLocalT(CHECK_STRINGS);
  return dataset ? <DatasetCheck key={dataset.id} dataset={dataset} /> : <NoFileState title={lt('noFileTitle')} />;
}

function DatasetCheck({ dataset }: { dataset: Dataset }) {
  const { colors } = useTheme();
  const lt = useLocalT(CHECK_STRINGS);
  const [firstLook] = useState(() => !revealed.has(dataset.id));
  useEffect(() => {
    revealed.add(dataset.id);
  }, [dataset.id]);

  const worked = useWorkedOut(dataset, workOut, isBigFile(dataset));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={toolStyles.content}>
      <FileLine dataset={dataset} />
      {worked.status === 'working' ? <CheckSkeleton label={lt('working')} /> : null}
      {worked.status === 'failed' ? <FailedNote title={lt('failedTitle')} /> : null}
      {worked.status === 'done' ? <CheckDetails dataset={dataset} work={worked.value} animate={firstLook} /> : null}
      <PrivacyLine />
    </ScrollView>
  );
}

function CheckDetails({ dataset, work, animate }: { dataset: Dataset; work: CheckWork; animate: boolean }) {
  const t = useT();
  const lt = useLocalT(CHECK_STRINGS);
  const numbers = useNumbers();
  const { language } = useAppState();
  const [allColumns, setAllColumns] = useState(false);

  const { check, profiles, hasNumbers } = work;
  const rows = dataset.data.length;
  const count = numbers.count;
  const exact = numbers.exact;
  const amountIn = (column: string, value: number) => numbers.amount(value, dataset.columnTypes?.[column], column);
  const pointsOf = (list: Deduction[]) => list.reduce((total, item) => total + item.points, 0);

  // --- The score ---------------------------------------------------------------

  const grade = check.noRows ? lt('noRowsTitle') : t(GRADE_LABEL[check.grade]);
  const sentence = check.noRows ? t('check.noRows') : t(GRADE_SENTENCE[check.grade]);
  const spoken = check.noRows
    ? `${grade}. ${sentence}`
    : `${lt('scoreSpoken', { score: count(check.score), grade })} ${sentence}`;

  // --- The checks --------------------------------------------------------------

  const resultOf = (kind: CheckKind): CheckResult => {
    // Unusual values are looked for in number columns only.
    if (kind === 'unusual' && !hasNumbers) return 'notChecked';
    return check.checks[kind].length === 0 ? 'clear' : 'found';
  };
  const clearCount = CHECKS.filter((kind) => resultOf(kind) === 'clear').length;

  const summaryFor = (kind: CheckKind): string => {
    const result = resultOf(kind);
    if (result === 'notChecked') return lt('noNumbersToCheck');
    const found = check.checks[kind];
    if (result === 'clear') return t('check.noneFound');
    const first = found[0];
    if (first.kind === 'repeats') {
      return t('check.repeatsSummary', {
        repeats: count(first.facts.repeats),
        rows: count(first.facts.rows),
        points: first.points,
      });
    }
    return t('check.foundIn', { columns: found.length, total: dataset.columns.length, points: pointsOf(found) });
  };

  const resultLabel = (result: CheckResult): string =>
    result === 'clear' ? t('check.ok') : result === 'found' ? lt('toFix') : lt('notChecked');

  // Every place a check found something, as lines.
  const detailsFor = (kind: CheckKind): string[] => {
    const lines: string[] = [];
    for (const item of check.checks[kind]) {
      if (item.kind === 'empty') {
        lines.push(
          t('check.emptyLine', {
            column: item.facts.column,
            empty: count(item.facts.empty),
            rows: count(item.facts.rows),
            points: item.points,
          }),
        );
        lines.push(t('check.rows', { rows: rowList(item.facts.examples.map(count), item.facts.empty, language) }));
      } else if (item.kind === 'repeats') {
        lines.push(t('check.rows', { rows: rowList(item.facts.examples.map(count), item.facts.repeats, language) }));
      } else if (item.kind === 'mixed') {
        lines.push(
          t('check.mixedLine', {
            column: item.facts.column,
            numericish: item.facts.numericish,
            total: item.facts.total,
            points: item.points,
          }),
        );
      } else if (item.kind === 'unusual') {
        // Exact figures, not lakh: the point is to find the cell to fix.
        lines.push(t('check.unusualLine', { column: item.facts.column, typical: exact(item.facts.typical), points: item.points }));
        for (const example of item.facts.examples) {
          lines.push(t('check.unusualExample', { row: count(example.row), value: exact(example.value) }));
        }
      }
    }
    return lines;
  };

  // --- The three things most worth fixing --------------------------------------

  // Every lost point, the costliest first (a tie keeps the order of the
  // checks), and the first three of them.
  const everything = CHECKS.flatMap((kind) => check.checks[kind]).filter(
    (item): item is Found => item.kind !== 'noRows',
  );
  const worst = [...everything].sort((a, b) => b.points - a.points).slice(0, TOP_FIXES);

  const fixFor = (item: Found): FixItem => {
    const points = lt('points', { points: count(item.points) });
    const tip = t(FIX_TIP[item.kind]);
    if (item.kind === 'empty') {
      return {
        key: `empty-${item.facts.column}`,
        title: lt('fixEmpty', { column: item.facts.column }),
        points,
        reason: lt('whyEmpty', { empty: count(item.facts.empty), rows: count(item.facts.rows) }),
        evidence: [t('check.rows', { rows: rowList(item.facts.examples.map(count), item.facts.empty, language) })],
        tip,
      };
    }
    if (item.kind === 'repeats') {
      return {
        key: 'repeats',
        title: lt('fixRepeats'),
        points,
        reason: lt('whyRepeats', { repeats: count(item.facts.repeats), rows: count(item.facts.rows) }),
        evidence: [t('check.rows', { rows: rowList(item.facts.examples.map(count), item.facts.repeats, language) })],
        tip,
      };
    }
    if (item.kind === 'mixed') {
      return {
        key: `mixed-${item.facts.column}`,
        title: lt('fixMixed', { column: item.facts.column }),
        points,
        reason: lt('whyMixed', { numericish: count(item.facts.numericish), total: count(item.facts.total) }),
        evidence: [],
        tip,
      };
    }
    return {
      key: `unusual-${item.facts.column}`,
      title: lt('fixUnusual', { column: item.facts.column }),
      points,
      reason:
        item.facts.count === 1
          ? lt('whyUnusualOne', { typical: exact(item.facts.typical) })
          : lt('whyUnusualMany', { count: count(item.facts.count), typical: exact(item.facts.typical) }),
      evidence: item.facts.examples.map((example) =>
        t('check.unusualExample', { row: count(example.row), value: exact(example.value) }),
      ),
      tip,
    };
  };

  // --- The columns -------------------------------------------------------------

  const shown = allColumns ? profiles : profiles.slice(0, FIRST_COLUMNS);
  const columnSummary = (profile: ColumnProfile) => {
    if (profile.range) {
      return t('check.range', { low: amountIn(profile.name, profile.range.low), high: amountIn(profile.name, profile.range.high) });
    }
    if (profile.dates) return t('check.dateRange', { first: profile.dates.first, last: profile.dates.last });
    if (profile.values) return t('check.values', { unique: count(profile.values.unique), common: listJoin(profile.values.common, language) });
    return t('check.noneFound');
  };

  return (
    <>
      <ScoreBlock
        score={check.noRows ? null : check.score}
        format={count}
        animate={animate}
        outOf={t('check.outOf')}
        grade={grade}
        sentence={sentence}
        checkedLine={check.noRows ? null : t('check.checkedRows', { rows: count(rows), total: count(rows) })}
        spoken={spoken}
      />

      {check.noRows ? null : worst.length > 0 ? (
        <Section title={lt('worthFixing')}>
          {worst.map((item) => {
            const fix = fixFor(item);
            return <FixCard key={fix.key} item={fix} />;
          })}
        </Section>
      ) : (
        <Notice tone="good" title={lt('allClearTitle')}>
          {clearCount === CHECKS.length ? lt('allClearBody') : lt('allClearSomeBody')}
        </Notice>
      )}

      {check.noRows ? null : (
        <Section title={t('check.whatWeChecked')} count={t('check.clearCount', { clear: count(clearCount) })}>
          <List>
            {CHECKS.map((kind) => {
              const result = resultOf(kind);
              return (
                <CheckRow
                  key={kind}
                  icon={CHECK_ICON[kind]}
                  title={t(CHECK_TITLE[kind])}
                  summary={summaryFor(kind)}
                  result={result}
                  resultLabel={resultLabel(result)}
                  details={result === 'found' ? detailsFor(kind) : []}
                  tip={t(FIX_TIP[kind])}
                  seeLabel={t('check.seeIt')}
                  hideLabel={t('check.hide')}
                />
              );
            })}
          </List>
        </Section>
      )}

      {profiles.length > 0 ? (
        <Section
          title={t('check.yourColumns')}
          count={t('check.columnsCount', { count: count(dataset.columns.length), rows: count(rows) })}>
          <List>
            {shown.map((profile) => (
              <ColumnRow
                key={profile.name}
                name={profile.name}
                type={profile.type}
                typeLabel={t(TYPE_LABEL[profile.type])}
                summary={columnSummary(profile)}
                note={profile.blanks > 0 ? t('check.blanks', { count: count(profile.blanks) }) : null}
              />
            ))}
          </List>
          {profiles.length > FIRST_COLUMNS ? (
            <Button
              variant="plain"
              fullWidth
              label={allColumns ? t('check.showFewer') : t('check.seeAll', { count: count(profiles.length) })}
              aria-expanded={allColumns}
              onPress={() => setAllColumns((now) => !now)}
            />
          ) : null}
        </Section>
      ) : null}
    </>
  );
}

// The shape of the screen while a big file is being checked: the ring, the
// grade and its sentence, three cards, and the rows of the checks.
function CheckSkeleton({ label }: { label: string }) {
  return (
    <Skeleton label={label} delay={0} style={styles.skeleton}>
      <VStack gap="md" align="center">
        <SkeletonBlock width={RING_LG} height={RING_LG} radius="pill" />
        <SkeletonText lines={1} variant="title" width="50%" />
        <SkeletonText lines={2} width="80%" />
      </VStack>
      <VStack gap="md">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </VStack>
      <VStack gap="sm">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </VStack>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: rhythm.sectionGap, paddingTop: space.xs },
});
