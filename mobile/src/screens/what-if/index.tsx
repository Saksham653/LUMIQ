import { numericColumns } from '@core/data/dataset.js';
import { computeWhatIf } from '@core/engine/whatIf.js';
import SegmentedControl from '@expo/ui/community/segmented-control';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { ChoiceChips } from '@/components/choice-chips';
import { FileHeader } from '@/components/file-header';
import { NoFileChosen } from '@/components/no-file-chosen';
import { Radius, Spacing } from '@/constants/theme';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useNumbers, useT } from '@/state/app-state';
import { useActiveDataset } from '@/state/datasets';
import { prettyColumn } from '@/utils/format';
import { groupColumns, groupValues, signedPercent } from '@/utils/what-if';

import { PercentPicker } from './percent-picker';
import { ResultCard } from './result-card';

type WhatIfRow = { group: string; before: number | null; after: number | null; diff: number };
type WhatIfResult = { rule: 'sum' | 'avg'; rows: WhatIfRow[]; total: WhatIfRow };

const DEFAULT_CHANGE = 10;

// What if…?: a calculator, not a guess. Pick a number column, a change in
// percent and, if wanted, one group; the shared engine recalculates every
// row on the phone, before and after. The file itself is never changed.
export function WhatIf() {
  const dataset = useActiveDataset();
  return dataset ? <DatasetWhatIf key={dataset.id} dataset={dataset} /> : <NoFileChosen />;
}

function DatasetWhatIf({ dataset }: { dataset: Dataset }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const formatCount = numbers.count;

  const numeric = useMemo(() => numericColumns(dataset) as string[], [dataset]);
  const columns = useMemo(() => groupColumns(dataset), [dataset]);

  const [picked, setPicked] = useState<string | null>(null);
  const [change, setChange] = useState(DEFAULT_CHANGE);
  const [onlyGroup, setOnlyGroup] = useState(false);
  const [pickedColumn, setPickedColumn] = useState<string | null>(null);
  const [pickedValue, setPickedValue] = useState<string | null>(null);

  const measure = picked && numeric.includes(picked) ? picked : (numeric[0] ?? null);
  const groupColumn = onlyGroup ? (pickedColumn && columns.includes(pickedColumn) ? pickedColumn : (columns[0] ?? null)) : null;
  const values = useMemo(() => (groupColumn ? groupValues(dataset, groupColumn) : []), [dataset, groupColumn]);
  const group = groupColumn ? (values.find((entry) => entry.value === pickedValue) ?? values[0] ?? null) : null;

  const result = useMemo(
    () =>
      measure
        ? (computeWhatIf(dataset, {
            measure,
            changePct: change,
            groupColumn: group ? groupColumn : undefined,
            groupValue: group?.value,
          }) as WhatIfResult)
        : null,
    [dataset, measure, change, groupColumn, group],
  );

  const reset = () => {
    setPicked(null);
    setChange(DEFAULT_CHANGE);
    setOnlyGroup(false);
    setPickedColumn(null);
    setPickedValue(null);
  };

  if (!measure || !result) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <FileHeader dataset={dataset} />
        <AppText tone="secondary">{t('insights.noNumbers')}</AppText>
      </ScrollView>
    );
  }

  const typeInfo = dataset.columnTypes?.[measure];
  const amount = (value: number | null) => numbers.amount(value, typeInfo, measure);
  const metric = prettyColumn(measure);
  const pct = Math.abs(change);

  const description =
    change === 0
      ? t('whatIf.noChange')
      : group && groupColumn
        ? t(change > 0 ? 'whatIf.upGroup' : 'whatIf.downGroup', { metric, pct, column: prettyColumn(groupColumn), group: group.value })
        : t(change > 0 ? 'whatIf.upEvery' : 'whatIf.downEvery', { metric, pct });

  const { before, after, diff } = result.total;
  const beforeValue = before ?? 0;
  const afterValue = after ?? 0;
  const headline = t(result.rule === 'avg' ? 'whatIf.averageWouldBe' : 'whatIf.totalWouldBe', { metric, value: amount(after) });
  const detail =
    Math.abs(diff) < 1e-9
      ? t('whatIf.same', { now: amount(before) })
      : t(diff > 0 ? 'whatIf.more' : 'whatIf.less', { diff: amount(Math.abs(diff)), now: amount(before) });

  const groupRow = group ? result.rows.find((row) => row.group === group.value) : undefined;
  const overall = beforeValue !== 0 ? signedPercent((diff / Math.abs(beforeValue)) * 100) : null;
  const groupLine =
    group && groupRow
      ? `${t('whatIf.groupLine', { group: group.value, before: amount(groupRow.before), after: amount(groupRow.after) })}${
          overall ? ` ${t('whatIf.overall', { pct: overall })}` : ''
        }`
      : null;

  const changedRows = group ? group.rows : dataset.data.length;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <FileHeader dataset={dataset} />
      <AppText tone="secondary">{t('whatIf.intro')}</AppText>

      <Step title={t('whatIf.step1')}>
        <ChoiceChips
          choices={numeric.map((column) => ({ value: column, label: prettyColumn(column) }))}
          selected={measure}
          onSelect={setPicked}
        />
      </Step>

      <Step title={t('whatIf.step2')}>
        <PercentPicker value={change} onChange={setChange} description={description} sliderLabel={t('whatIf.changeA11y')} />
      </Step>

      <Step title={t('whatIf.step3')}>
        {columns.length > 0 ? (
          <>
            <SegmentedControl
              values={[t('whatIf.allRows'), t('whatIf.oneGroup')]}
              selectedIndex={onlyGroup ? 1 : 0}
              onChange={(event) => setOnlyGroup(event.nativeEvent.selectedSegmentIndex === 1)}
              accessibilityLabel={t('whatIf.step3')}
              style={styles.segmented}
            />
            {onlyGroup && groupColumn && (
              <View style={styles.groupPick}>
                {columns.length > 1 && (
                  <>
                    <AppText variant="small" tone="secondary">
                      {t('whatIf.whichColumn')}
                    </AppText>
                    <ChoiceChips
                      choices={columns.map((column) => ({ value: column, label: prettyColumn(column) }))}
                      selected={groupColumn}
                      onSelect={(column) => {
                        setPickedColumn(column);
                        setPickedValue(null);
                      }}
                    />
                  </>
                )}
                <AppText variant="small" tone="secondary">
                  {t('whatIf.whichGroup', { column: prettyColumn(groupColumn) })}
                </AppText>
                <ChoiceChips
                  choices={values.map((entry) => ({ value: entry.value, label: entry.value }))}
                  selected={group?.value ?? null}
                  onSelect={setPickedValue}
                />
              </View>
            )}
          </>
        ) : (
          <AppText variant="small" tone="secondary">
            {t('whatIf.noGroups')}
          </AppText>
        )}
        <AppText variant="small" tone="secondary">
          {t('whatIf.rowsCount', { count: formatCount(changedRows), total: formatCount(dataset.data.length) })}
        </AppText>
      </Step>

      <ResultCard
        title={t('whatIf.result')}
        headline={headline}
        detail={detail}
        groupLine={groupLine}
        nowLabel={t('whatIf.now')}
        afterLabel={`${t('whatIf.after')} (${signedPercent(change)})`}
        before={beforeValue}
        after={afterValue}
        beforeText={amount(before)}
        afterText={amount(after)}
      />

      <BigButton variant="tonal" label={t('whatIf.reset')} onPress={reset} />
    </ScrollView>
  );
}

// One numbered step of the calculator, on its own card.
function Step({ title, children }: { title: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={[styles.step, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AppText variant="label" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  step: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  segmented: { height: 44 },
  groupPick: { gap: Spacing.sm },
});
