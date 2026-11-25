import { router } from 'expo-router';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ColumnOverride, DateDecision, ImportAsk, ImportProgress, NumberDecision, PreviewOverrides } from '@/data/import-file';
import type { ColumnKind } from '@/data/types';
import { useLocalT } from '@/i18n/local';
import { useNumbers, useT } from '@/state/app-state';
import { useDatasets, type ImportState } from '@/state/datasets';
import { border, rhythm, sizes, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Divider } from '@/ui/divider';
import { EmptyState } from '@/ui/empty-state';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { Notice } from '@/ui/notice';
import { ProgressBar } from '@/ui/progress';
import { Section } from '@/ui/section';
import { SkeletonCard } from '@/ui/skeleton';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

import { ColumnRow } from './column-row';
import { FlagRow } from './flag-row';
import { DateQuestion, DecimalQuestion } from './question-card';
import { IMPORT_STRINGS } from './strings';

// The column stays this wide on a tablet, in the middle.
const MAX_WIDTH = 640;
// Rows with a blank key cell shown one by one; the rest are counted.
const BLANK_KEY_SHOWN = 5;
const NUMERIC: readonly ColumnKind[] = ['number', 'money', 'percent'];

type Review = Extract<ImportState, { phase: 'review' }>;

// The words for where a reading stands: what is happening, and how far.
function useProgressWords(progress: ImportProgress) {
  const t = useT();
  const lt = useLocalT(IMPORT_STRINGS);
  const numbers = useNumbers();
  const stage = progress.stage === 'opening' ? t('import.opening') : progress.stage === 'reading' ? t('import.reading') : lt('checking');
  let amount: string | null = null;
  if (progress.stage === 'reading' && progress.rows !== null) amount = t('import.rowsRead', { rows: numbers.count(progress.rows) });
  if (progress.stage === 'checking' && progress.rows !== null && progress.total !== null) {
    amount = lt('checkedRows', { rows: numbers.count(progress.rows), total: numbers.count(progress.total) });
  }
  return { stage, amount };
}

function TopBar({ title, closeLabel, onClose }: { title: string; closeLabel: string; onClose: () => void }) {
  return (
    <HStack gap="sm" style={styles.top}>
      <IconButton icon="close" accessibilityLabel={closeLabel} onPress={onClose} />
      <Txt variant="heading" accessibilityRole="header" numberOfLines={2} style={styles.grow}>
        {title}
      </Txt>
    </HStack>
  );
}

function BottomBar({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottom, { borderTopColor: colors.line, backgroundColor: colors.ground, paddingBottom: insets.bottom + space.lg }]}>
      <VStack gap="sm" style={styles.column}>
        {children}
      </VStack>
    </View>
  );
}

// A big file being read: its name, a progress line with the rows read so
// far, and Cancel. Under it, the shape of the review that is coming.
function Reading({ name, progress, onCancel }: { name: string | null; progress: ImportProgress; onCancel: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const lt = useLocalT(IMPORT_STRINGS);
  const words = useProgressWords(progress);
  return (
    <>
      <TopBar title={lt('openingTitle')} closeLabel={t('common.cancel')} onClose={onCancel} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <VStack gap="md">
            <HStack gap="md">
              <Icon name="file" color={colors.inkSoft} />
              <Txt variant="heading" numberOfLines={2} style={styles.grow}>
                {name ?? lt('openingTitle')}
              </Txt>
            </HStack>
            <ProgressBar value={progress.fraction} label={words.stage} valueText={words.amount ?? undefined} tone="action" />
            <Txt tone="soft" accessibilityLiveRegion="polite">
              {words.amount ? `${words.stage} ${words.amount}` : words.stage}
            </Txt>
            <Txt variant="small" tone="soft">
              {lt('readingPart')}
            </Txt>
            <HStack gap="sm">
              <Icon name="lock" size={sizes.iconSmall} color={colors.inkSoft} />
              <Txt variant="small" tone="soft" style={styles.grow}>
                {t('privacy.short')}
              </Txt>
            </HStack>
          </VStack>
        </Card>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={4} />
      </ScrollView>
      <BottomBar>
        <Button variant="quiet" label={t('common.cancel')} fullWidth onPress={onCancel} />
      </BottomBar>
    </>
  );
}

// The file is read and waits for the person: its name and size, the
// questions LUMIQ could not settle, the rows that look wrong, the columns
// with what each holds, and "Use this file".
function ReviewView({ state, onCancel }: { state: Review; onCancel: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const lt = useLocalT(IMPORT_STRINGS);
  const numbers = useNumbers();
  const { reviseImport, confirmImport } = useDatasets();
  const { preview, first, revising, failed, saving } = state;
  const working = revising !== null || saving;
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const overrides: PreviewOverrides = preview.overrides ?? {};

  const revise = (next: PreviewOverrides) => {
    void reviseImport(next);
  };
  const setColumn = (column: string, patch: ColumnOverride) => {
    const columns = { ...(overrides.columns ?? {}) };
    columns[column] = { ...(columns[column] ?? {}), ...patch };
    revise({ ...overrides, columns });
  };
  const toggleKeep = (index: number) => {
    const keep = overrides.keepRows ?? [];
    revise({ ...overrides, keepRows: keep.includes(index) ? keep.filter((i) => i !== index) : [...keep, index] });
  };
  // Another heading row names the columns afresh: earlier corrections go.
  const chooseHeaderRow = (row: number) => {
    setOpenColumn(null);
    revise({ headerRow: row });
  };

  const infoOf = (column: string) => preview.columnInfo.find((info) => info.column === column) ?? null;

  // Questions asked when the file was first read stay on screen once
  // answered, so the answer can still be changed.
  const asked: ImportAsk[] = [];
  for (const ask of [...first.asks, ...preview.asks]) {
    if (!preview.columns.includes(ask.column)) continue;
    if (asked.some((a) => a.column === ask.column && a.about === ask.about)) continue;
    asked.push(ask);
  }
  const questions = asked.flatMap((ask) => {
    const info = infoOf(ask.column);
    if (!info) return [];
    const current = preview.asks.find((a) => a.column === ask.column && a.about === ask.about);
    if (ask.about === 'decimal-mark') {
      if (!NUMERIC.includes(info.type) || !info.number) return [];
      const sample = (current?.sample ?? ask.sample ?? info.number.sample) as NumberDecision['sample'];
      return [
        <DecimalQuestion
          key={`${ask.column}-decimal`}
          column={ask.column}
          sample={sample}
          examples={ask.examples}
          value={info.number.decimal}
          disabled={working}
          onChange={(decimal) => setColumn(ask.column, { decimal })}
        />,
      ];
    }
    if (info.type !== 'date' || !info.date) return [];
    const sample = (current?.sample ?? ask.sample ?? info.date.sample) as DateDecision['sample'];
    const order = info.date.order === 'dmy' || info.date.order === 'mdy' ? info.date.order : null;
    return [
      <DateQuestion
        key={`${ask.column}-date`}
        column={ask.column}
        sample={sample}
        examples={ask.examples}
        value={order}
        disabled={working}
        onChange={(dateOrder) => setColumn(ask.column, { dateOrder })}
      />,
    ];
  });

  // Headings found below a title, or put back in row 1 by the person.
  let headerNotice: ReactNode = null;
  if (preview.header.row > 0) {
    const above = preview.header.row;
    headerNotice = (
      <Notice
        tone="info"
        title={lt('headerFound', { row: numbers.count(preview.header.row + 1) })}
        action={{ label: lt('headerUseFirst'), onPress: () => chooseHeaderRow(0), busy: revising !== null }}>
        {above === 1 ? lt('headerFoundBodyOne') : lt('headerFoundBody', { count: numbers.count(above) })}
      </Notice>
    );
  } else if (first.header.detected && first.header.row > 0) {
    const found = first.header.row;
    headerNotice = (
      <Notice
        tone="info"
        title={lt('headerFirst')}
        action={{ label: lt('headerUseFound', { row: numbers.count(found + 1) }), onPress: () => chooseHeaderRow(found), busy: revising !== null }}
      />
    );
  }

  const major = preview.flags.filter((flag) => flag.reason !== 'blank-key');
  const blankKeys = preview.flags.filter((flag) => flag.reason === 'blank-key');
  const shownFlags = [...major, ...blankKeys.slice(0, BLANK_KEY_SHOWN)].sort((a, b) => a.index - b.index);
  const flaggedTotal = preview.flagCounts['repeated-header'] + preview.flagCounts['total-row'] + preview.flagCounts['blank-key'];
  const hiddenFlags = flaggedTotal - shownFlags.length;

  return (
    <>
      <TopBar title={lt('title')} closeLabel={lt('close')} onClose={onCancel} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <HStack gap="md" align="start">
            <Icon name="file" color={colors.inkSoft} />
            <VStack gap="xs" style={styles.grow}>
              <Txt variant="heading" numberOfLines={3}>
                {preview.name}
              </Txt>
              <Txt tone="soft">
                {t('home.rowsCols', { rows: numbers.count(preview.rowCount), cols: numbers.count(preview.columns.length) })}
              </Txt>
            </VStack>
          </HStack>
        </Card>

        {failed ? <Notice tone="bad" title={lt('reviseFailed')} live /> : null}
        {headerNotice}

        {questions.length > 0 ? (
          <Section title={lt('questions')}>
            <Txt variant="small" tone="soft">
              {lt('questionsNote')}
            </Txt>
            {questions}
          </Section>
        ) : null}

        {shownFlags.length > 0 ? (
          <Section title={lt('rowsTitle')} count={numbers.count(flaggedTotal)}>
            <Card>
              <VStack gap="lg">
                {shownFlags.map((flag, i) => (
                  <Fragment key={`${flag.reason}-${flag.index}-${flag.column ?? ''}`}>
                    {i > 0 ? <Divider /> : null}
                    <FlagRow flag={flag} disabled={working} onToggleKeep={() => toggleKeep(flag.index)} />
                  </Fragment>
                ))}
              </VStack>
            </Card>
            {hiddenFlags > 0 ? (
              <Txt variant="small" tone="soft">
                {lt('moreRows', { count: numbers.count(hiddenFlags) })}
              </Txt>
            ) : null}
          </Section>
        ) : null}

        <Section title={lt('columnsTitle')} count={numbers.count(preview.columns.length)}>
          <Txt variant="small" tone="soft">
            {lt('columnsNote')}
          </Txt>
          <Card>
            <VStack gap="lg">
              {preview.columnInfo.map((info, i) => (
                <Fragment key={info.column}>
                  {i > 0 ? <Divider /> : null}
                  <ColumnRow
                    info={info}
                    open={openColumn === info.column}
                    disabled={working}
                    onToggle={() => setOpenColumn(openColumn === info.column ? null : info.column)}
                    onChange={(type) => {
                      setOpenColumn(null);
                      setColumn(info.column, { type });
                    }}
                  />
                </Fragment>
              ))}
            </VStack>
          </Card>
        </Section>
      </ScrollView>
      <BottomBar>
        {revising !== null ? <ProgressBar value={revising.fraction} label={lt('updating')} tone="action" /> : null}
        <Button label={lt('useFile')} icon="check" fullWidth busy={saving} disabled={revising !== null} onPress={confirmImport} />
        <Button variant="plain" label={t('common.cancel')} fullWidth disabled={saving} onPress={onCancel} />
      </BottomBar>
    </>
  );
}

// Nothing is being opened (the screen was reached without a file).
function Nothing({ onOpen, onClose }: { onOpen: () => void; onClose: () => void }) {
  const lt = useLocalT(IMPORT_STRINGS);
  return (
    <>
      <TopBar title={lt('title')} closeLabel={lt('close')} onClose={onClose} />
      <ScrollView contentContainerStyle={[styles.content, styles.fill]}>
        <EmptyState title={lt('nothingTitle')} body={lt('nothingBody')} action={{ label: lt('nothingAction'), icon: 'add', onPress: onOpen }} />
      </ScrollView>
    </>
  );
}

// The import review: shown while a big file is read (progress and Cancel),
// and before a file is saved whenever something needs the person's word or
// is worth a look. Files with nothing to decide never come here.
export function ImportReview() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { importState, cancelImport, importFile } = useDatasets();
  // Once the import ends (saved or stopped) the screen slides away: it keeps
  // showing what it showed last instead of flashing the empty state.
  const [lastShown, setLastShown] = useState<ImportState>(importState);
  if (importState.phase !== 'idle' && importState !== lastShown) setLastShown(importState);
  const state = importState.phase === 'idle' ? lastShown : importState;

  // Whatever takes this screen away without saving (Cancel, Back, a swipe)
  // stops the import: it runs when the screen goes. After a save there is
  // nothing left to stop. (cancelImport never changes, so this runs once.)
  useEffect(() => () => cancelImport(), [cancelImport]);

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      cancelImport();
      router.replace('/');
    }
  };

  let body: ReactNode;
  if (state.phase === 'reading') {
    body = <Reading name={state.name} progress={state.progress} onCancel={leave} />;
  } else if (state.phase === 'review') {
    body = <ReviewView state={state} onCancel={leave} />;
  } else {
    body = (
      <Nothing
        onClose={leave}
        onOpen={() => {
          leave();
          void importFile();
        }}
      />
    );
  }

  return <View style={[styles.screen, { backgroundColor: colors.ground, paddingTop: insets.top }]}>{body}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    minHeight: sizes.target,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  content: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: rhythm.screenEdge,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
    gap: rhythm.sectionGap,
  },
  fill: { flexGrow: 1 },
  bottom: { paddingHorizontal: rhythm.screenEdge, paddingTop: space.md, borderTopWidth: border.hairline },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  grow: { flex: 1 },
});
