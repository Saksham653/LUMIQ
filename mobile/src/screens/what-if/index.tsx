import { numericColumns } from '@core/data/dataset.js';
import { computeWhatIf } from '@core/engine/whatIf.js';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import type { Dataset } from '@/data/types';
import { useLocalT } from '@/i18n/local';
import {
  FailedNote,
  FileLine,
  NoFileState,
  PrivacyLine,
  isBigFile,
  toolStyles,
  useWorkedOut,
} from '@/screens/file-check/tool-parts';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset } from '@/state/datasets';
import { numeralLine, rhythm, sizes, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Chip, ChipGroup } from '@/ui/chip';
import { EmptyState } from '@/ui/empty-state';
import { Section } from '@/ui/section';
import { Segmented } from '@/ui/segmented';
import { Skeleton, SkeletonBlock, SkeletonCard, SkeletonText } from '@/ui/skeleton';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';
import { prettyColumn } from '@/utils/format';
import { groupColumns, groupValues } from '@/utils/what-if';

import { PercentPicker } from './percent-picker';
import { ResultCard } from './result-card';
import { WHAT_IF_STRINGS } from './strings';

type WhatIfRow = { group: string; before: number | null; after: number | null; diff: number };
type WhatIfResult = { rule: 'sum' | 'avg'; rows: WhatIfRow[]; total: WhatIfRow };
type WhatIfInput = { measure: string; changePct: number; groupColumn?: string; groupValue?: string };
type Scope = 'all' | 'group';

const DEFAULT_CHANGE = 10;
// A chip's width in the skeleton: about one short column name.
const CHIP_SKELETON = 96;
// The numeral's width in the skeleton: about "+10%".
const PERCENT_SKELETON = 120;

// What can be changed in this file, worked out once per file: the number
// columns, and the text columns that split it into a few named groups.
type Prepared = { numeric: string[]; columns: string[] };

function prepare(dataset: Dataset): Prepared {
  return { numeric: numericColumns(dataset) as string[], columns: groupColumns(dataset) };
}

// The shared engine's what-if, the same maths as the web app. A file it
// cannot work out gives null, and the screen says so.
function tryWhatIf(dataset: Dataset, input: WhatIfInput): WhatIfResult | null {
  try {
    const { measure, changePct, groupColumn, groupValue } = input;
    return computeWhatIf(dataset, { measure, changePct, groupColumn, groupValue }) as WhatIfResult;
  } catch {
    return null;
  }
}

// What if…?: a calculator, not a guess. Pick one number column, a change in
// percent and, if wanted, one group; the shared engine recalculates every
// row on the phone, before and after. The file itself is never changed.
export function WhatIf() {
  const { colors } = useTheme();
  const dataset = useActiveDataset();
  const lt = useLocalT(WHAT_IF_STRINGS);
  return (
    // Its own gesture root, so the slider can be dragged whether or not the
    // app has one at its root yet. A gesture root inside another one does
    // nothing by itself.
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.ground }]}>
      {dataset ? <DatasetWhatIf key={dataset.id} dataset={dataset} /> : <NoFileState title={lt('noFileTitle')} />}
    </GestureHandlerRootView>
  );
}

function DatasetWhatIf({ dataset }: { dataset: Dataset }) {
  const { colors } = useTheme();
  const t = useT();
  const lt = useLocalT(WHAT_IF_STRINGS);
  const prepared = useWorkedOut(dataset, prepare, isBigFile(dataset));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={toolStyles.content}>
      <FileLine dataset={dataset} />
      {prepared.status === 'working' ? <WhatIfSkeleton label={lt('working')} /> : null}
      {prepared.status === 'failed' ? <FailedNote title={lt('failedTitle')} /> : null}
      {prepared.status === 'done' && prepared.value.numeric.length === 0 ? (
        <EmptyState
          variant="section"
          align="start"
          title={lt('noNumbersTitle')}
          body={t('insights.noNumbers')}
          action={{ label: t('noFile.goHome'), icon: 'home', onPress: () => router.navigate('/') }}
        />
      ) : null}
      {prepared.status === 'done' && prepared.value.numeric.length > 0 ? (
        <Calculator dataset={dataset} numeric={prepared.value.numeric} columns={prepared.value.columns} />
      ) : null}
      <PrivacyLine />
    </ScrollView>
  );
}

function Calculator({ dataset, numeric, columns }: { dataset: Dataset; numeric: string[]; columns: string[] }) {
  const t = useT();
  const lt = useLocalT(WHAT_IF_STRINGS);
  const numbers = useNumbers();
  const { language } = useAppState();

  const [picked, setPicked] = useState<string | null>(null);
  const [change, setChange] = useState(DEFAULT_CHANGE);
  const [onlyGroup, setOnlyGroup] = useState(false);
  const [pickedColumn, setPickedColumn] = useState<string | null>(null);
  const [pickedValue, setPickedValue] = useState<string | null>(null);

  const measure = picked !== null && numeric.includes(picked) ? picked : numeric[0];
  const groupColumn = onlyGroup
    ? pickedColumn !== null && columns.includes(pickedColumn)
      ? pickedColumn
      : (columns[0] ?? null)
    : null;
  const values = useMemo(() => (groupColumn ? groupValues(dataset, groupColumn) : []), [dataset, groupColumn]);
  const group = groupColumn ? (values.find((entry) => entry.value === pickedValue) ?? values[0] ?? null) : null;

  const result = useMemo(
    () =>
      tryWhatIf(dataset, {
        measure,
        changePct: change,
        groupColumn: group && groupColumn ? groupColumn : undefined,
        groupValue: group?.value,
      }),
    [dataset, measure, change, groupColumn, group],
  );

  const reset = () => {
    setPicked(null);
    setChange(DEFAULT_CHANGE);
    setOnlyGroup(false);
    setPickedColumn(null);
    setPickedValue(null);
  };

  const typeInfo = dataset.columnTypes?.[measure];
  const amount = (value: number | null) => numbers.amount(value, typeInfo, measure);
  const metric = prettyColumn(measure);
  const pct = numbers.percent(Math.abs(change), 1);

  const description =
    change === 0
      ? t('whatIf.noChange')
      : group && groupColumn
        ? t(change > 0 ? 'whatIf.upGroup' : 'whatIf.downGroup', { metric, pct, column: prettyColumn(groupColumn), group: group.value })
        : t(change > 0 ? 'whatIf.upEvery' : 'whatIf.downEvery', { metric, pct });

  const changedRows = group ? group.rows : dataset.data.length;

  const steps = (
    <>
      <Txt variant="small" tone="soft">
        {t('whatIf.intro')}
      </Txt>

      <Section title={t('whatIf.step1')}>
        <ChipGroup wrap value={measure} onChange={setPicked} accessibilityLabel={t('whatIf.step1')}>
          {numeric.map((column) => (
            <Chip key={column} value={column} label={prettyColumn(column)} />
          ))}
        </ChipGroup>
      </Section>

      <Section title={t('whatIf.step2')}>
        <PercentPicker
          value={change}
          onChange={setChange}
          description={description}
          sliderLabel={t('whatIf.changeA11y')}
          presetsLabel={lt('presets')}
        />
      </Section>

      <Section title={t('whatIf.step3')}>
        {columns.length > 0 ? (
          <VStack gap="md">
            <Segmented<Scope>
              options={[
                { value: 'all', label: t('whatIf.allRows') },
                { value: 'group', label: t('whatIf.oneGroup') },
              ]}
              value={onlyGroup ? 'group' : 'all'}
              onChange={(next) => setOnlyGroup(next === 'group')}
              accessibilityLabel={t('whatIf.step3')}
            />
            {onlyGroup && groupColumn ? (
              <VStack gap="sm">
                {columns.length > 1 ? (
                  <>
                    <Txt variant="small" tone="soft">
                      {t('whatIf.whichColumn')}
                    </Txt>
                    <ChipGroup
                      wrap
                      value={groupColumn}
                      onChange={(column) => {
                        setPickedColumn(column);
                        setPickedValue(null);
                      }}
                      accessibilityLabel={t('whatIf.whichColumn')}>
                      {columns.map((column) => (
                        <Chip key={column} value={column} label={prettyColumn(column)} />
                      ))}
                    </ChipGroup>
                  </>
                ) : null}
                <Txt variant="small" tone="soft">
                  {t('whatIf.whichGroup', { column: prettyColumn(groupColumn) })}
                </Txt>
                <ChipGroup
                  value={group?.value ?? null}
                  onChange={setPickedValue}
                  accessibilityLabel={t('whatIf.whichGroup', { column: prettyColumn(groupColumn) })}>
                  {values.map((entry) => (
                    <Chip key={entry.value} value={entry.value} label={entry.value} />
                  ))}
                </ChipGroup>
              </VStack>
            ) : null}
          </VStack>
        ) : (
          <Txt variant="small" tone="soft">
            {t('whatIf.noGroups')}
          </Txt>
        )}
        <Txt variant="small" tone="soft">
          {t('whatIf.rowsCount', { count: numbers.count(changedRows), total: numbers.count(dataset.data.length) })}
        </Txt>
      </Section>
    </>
  );

  if (result === null) {
    return (
      <>
        {steps}
        <FailedNote title={lt('failedTitle')} />
      </>
    );
  }

  const { before, after, diff } = result.total;
  const average = result.rule === 'avg';
  const label = t(average ? 'whatIf.averageAfter' : 'whatIf.totalAfter', { metric });

  // The difference as one plain sentence, every number written by the app.
  let sentence: string;
  if (before === null || after === null) {
    sentence = lt('unknown', { metric });
  } else if (Math.abs(diff) < 1e-9) {
    sentence = lt(average ? 'avgSame' : 'sumSame', { metric, now: amount(before) });
  } else {
    const words = { metric, before: amount(before), after: amount(after), diff: amount(Math.abs(diff)) };
    sentence = diff > 0 ? lt(average ? 'avgUp' : 'sumUp', words) : lt(average ? 'avgDown' : 'sumDown', words);
  }

  const groupRow = group ? result.rows.find((row) => row.group === group.value) : undefined;
  const overall = before !== null && before !== 0 ? numbers.signedPercent((diff / Math.abs(before)) * 100) : null;
  const joiner = language === 'ja' || language === 'zh' ? '' : ' ';
  const groupLine =
    group && groupRow
      ? `${t('whatIf.groupLine', { group: group.value, before: amount(groupRow.before), after: amount(groupRow.after) })}${
          overall ? `${joiner}${t('whatIf.overall', { pct: overall })}` : ''
        }`
      : null;

  return (
    <>
      {steps}
      <ResultCard
        title={t('whatIf.result')}
        label={label}
        parts={numbers.amountParts(after, typeInfo, measure)}
        spokenValue={amount(after)}
        sentence={sentence}
        groupLine={groupLine}
        nowLabel={t('whatIf.now')}
        afterLabel={`${t('whatIf.after')} (${numbers.signedPercent(change)})`}
        before={before}
        after={after}
        beforeText={amount(before)}
        afterText={amount(after)}
      />
      <Button variant="quiet" icon="undo" label={t('whatIf.reset')} fullWidth onPress={reset} />
    </>
  );
}

// The shape of the calculator while a big file is being read: the steps
// with their chips, the change with its slider, and the result.
function WhatIfSkeleton({ label }: { label: string }) {
  return (
    <Skeleton label={label} delay={0} style={styles.skeleton}>
      <SkeletonText lines={2} variant="small" />
      <VStack gap="md">
        <SkeletonText lines={1} variant="heading" width="45%" />
        <HStack gap="sm">
          <SkeletonBlock width={CHIP_SKELETON} height={sizes.target} radius="pill" />
          <SkeletonBlock width={CHIP_SKELETON} height={sizes.target} radius="pill" />
          <SkeletonBlock width={CHIP_SKELETON} height={sizes.target} radius="pill" />
        </HStack>
      </VStack>
      <VStack gap="md">
        <SkeletonText lines={1} variant="heading" width="35%" />
        <SkeletonCard style={styles.skeletonCard}>
          <SkeletonBlock width={PERCENT_SKELETON} height={numeralLine.large} style={styles.centre} />
          <SkeletonText lines={1} />
          <SkeletonBlock height={sizes.target} radius="pill" />
        </SkeletonCard>
      </VStack>
      <SkeletonCard style={styles.skeletonCard}>
        <SkeletonText lines={1} variant="label" width="60%" />
        <SkeletonBlock width="55%" height={numeralLine.hero} />
        <SkeletonText lines={2} />
      </SkeletonCard>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skeleton: { gap: rhythm.sectionGap, paddingTop: space.xs },
  skeletonCard: { gap: space.md },
  centre: { alignSelf: 'center' },
});
