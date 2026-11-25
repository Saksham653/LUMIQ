import { detectTimeColumn } from '@core/engine/insights.js';
import { isBlank } from '@core/lib/stats.js';
import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import type { Dataset } from '@/data/types';
import type { Language, StringKey } from '@/i18n';
import { useLocalT } from '@/i18n/local';
import {
  FailedNote,
  FileLine,
  NoFileState,
  isBigFile,
  toolStyles,
  useWorkedOut,
} from '@/screens/file-check/tool-parts';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset, useDatasets } from '@/state/datasets';
import { numeralLine, rhythm, sizes, space, typeScale, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Ring } from '@/ui/charts/ring';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Numeral } from '@/ui/numeral';
import { Skeleton, SkeletonBlock, SkeletonCard, SkeletonText } from '@/ui/skeleton';
import { HStack, VStack } from '@/ui/stack';
import { Tag } from '@/ui/tag';
import { Txt } from '@/ui/text';
import { profileColumn, type Grade } from '@/utils/file-check';
import { prettyColumn, type Numbers } from '@/utils/format';
import { describeInsights } from '@/utils/insight-text';
import { buildReport, reportText, type Report as ReportData } from '@/utils/report';

import { REPORT_STRINGS } from './strings';

const GRADE_LABEL: Record<Grade, StringKey> = {
  great: 'check.grade.great',
  good: 'check.grade.good',
  look: 'check.grade.look',
  work: 'check.grade.work',
};

// The height of a number tile in the skeleton: its padding, its label and a
// medium numeral.
const TILE_SKELETON = space.md * 2 + typeScale.small.line + numeralLine.medium;

type Translate = (key: StringKey, params?: Record<string, string | number>) => string;

// The span of time the file covers, as the file writes it.
type DateRange = { column: string; first: string; last: string };
// The shared engine's time column: which column, and where each of its
// values sits in time.
type TimeColumn = { column: string; keyOf: (value: unknown) => number | null };

// The earliest and latest dates in the file. A column given as dates is read
// the way File check reads it. Otherwise months, weeks or quarters are put in
// order the way the shared engine orders them for its trends; when two
// different values share one place in time ("Jan 2024" and "Jan 2025" are
// both January), the order cannot be told and no range is claimed.
function dateRange(dataset: Dataset): DateRange | null {
  for (const column of dataset.columns) {
    if (dataset.columnTypes?.[column]?.type !== 'date') continue;
    const dates = profileColumn(dataset, column).dates;
    if (dates) return { column, first: dates.first, last: dates.last };
  }

  const time = detectTimeColumn(dataset) as TimeColumn | null;
  if (!time) return null;
  const byPlace = new Map<number, string>();
  for (const row of dataset.data) {
    const cell = row[time.column];
    if (isBlank(cell)) continue;
    const place = time.keyOf(cell);
    if (place === null || !Number.isFinite(place)) continue;
    const text = String(cell).trim();
    const seen = byPlace.get(place);
    if (seen !== undefined && seen !== text) return null;
    byPlace.set(place, text);
  }
  if (byPlace.size === 0) return null;
  const places = [...byPlace.keys()].sort((a, b) => a - b);
  const first = byPlace.get(places[0]);
  const last = byPlace.get(places[places.length - 1]);
  return first !== undefined && last !== undefined ? { column: time.column, first, last } : null;
}

type ReportInput = { dataset: Dataset; name: string; t: Translate; numbers: Numbers; language: Language };
type ReportWork = { report: ReportData; top: { title: string; body: string } | null; dates: DateRange | null };

// Everything on the page, worked out once on the phone: the report the
// share sends (the shared engine's headline numbers with their footnotes,
// what LUMIQ noticed, the File check score), the top group from the same
// findings, and the span of dates.
function workOut({ dataset, name, t, numbers, language }: ReportInput): ReportWork {
  const report = buildReport(dataset, name, t, numbers, language);
  const top = describeInsights(dataset, t, numbers, language).find((view) => view.id.startsWith('top-'));
  return {
    report,
    top: top === undefined ? null : { title: top.title, body: top.body },
    dates: dateRange(dataset),
  };
}

// Report: one page about the file, the kind a person would forward. Every
// number comes from the shared engine with a footnote saying how; Share
// sends the same report as text (WhatsApp, email, notes). The file itself is
// never sent.
export function Report() {
  const dataset = useActiveDataset();
  const lt = useLocalT(REPORT_STRINGS);
  return dataset ? <DatasetReport key={dataset.id} dataset={dataset} /> : <NoFileState title={lt('noFileTitle')} />;
}

function DatasetReport({ dataset }: { dataset: Dataset }) {
  const { colors } = useTheme();
  const t = useT();
  const lt = useLocalT(REPORT_STRINGS);
  const numbers = useNumbers();
  const { language } = useAppState();
  const { datasetName } = useDatasets();
  const name = datasetName(dataset.id) ?? dataset.name;

  const input = useMemo<ReportInput>(
    () => ({ dataset, name, t, numbers, language }),
    [dataset, name, t, numbers, language],
  );
  const worked = useWorkedOut(input, workOut, isBigFile(dataset));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={toolStyles.content}>
      {worked.status === 'working' ? <ReportSkeleton label={lt('working')} /> : null}
      {worked.status === 'failed' ? (
        <>
          <FileLine dataset={dataset} />
          <FailedNote title={lt('failedTitle')} />
        </>
      ) : null}
      {worked.status === 'done' ? <ReportPage dataset={dataset} name={name} work={worked.value} /> : null}
    </ScrollView>
  );
}

function ReportPage({ dataset, name, work }: { dataset: Dataset; name: string; work: ReportWork }) {
  const t = useT();
  const lt = useLocalT(REPORT_STRINGS);
  const numbers = useNumbers();
  const { report, top, dates } = work;

  const noRows = dataset.data.length === 0;
  const gradeLabel = t(GRADE_LABEL[report.check.grade]);
  const gradeIsGood = report.check.grade === 'great' || report.check.grade === 'good';
  // What LUMIQ noticed, less the top group, which has its own card.
  const others = report.noticed.filter((item) => top === null || item.title !== top.title || item.body !== top.body);

  // The existing share path: the same report, as text.
  const share = async () => {
    try {
      await Share.share({ title: t('report.shareTitle', { name }), message: reportText(report, t, gradeLabel) });
    } catch {
      Alert.alert(t('report.shareFailed'));
    }
  };

  return (
    <>
      <Txt variant="small" tone="soft">
        {t('report.intro')}
      </Txt>

      {/* The file: its name and size, and the day the report was made. */}
      <Card style={styles.card}>
        <ReportHead icon="report" title={lt('kicker')} />
        <Txt variant="title">{name}</Txt>
        <Txt variant="small" tone="soft">
          {report.meta}
        </Txt>
      </Card>

      <ReportCard icon="numbers" title={t('report.keyNumbers')}>
        <View style={styles.grid}>
          {report.numbers.map((item, index) => (
            <Card
              key={`${index}-${item.label}`}
              variant="sunk"
              size="sm"
              style={styles.tile}
              accessible
              accessibilityLabel={`${item.label}: ${item.value}. ${item.footnote}`}>
              <HStack gap="xs" align="start">
                <Txt variant="small" tone="soft" style={styles.grow}>
                  {item.label}
                </Txt>
                {/* The footnote it is worked out by, under "How each number was worked out". */}
                <Txt variant="small" tone="faint" snug>
                  {numbers.count(index + 1)}
                </Txt>
              </HStack>
              <Numeral value={item.parts.number} prefix={item.parts.prefix} unit={item.parts.suffix} size="medium" />
            </Card>
          ))}
        </View>
        {/* Only the count of rows: the file has no number columns to add up. */}
        {report.numbers.length <= 1 ? (
          <Txt variant="small" tone="soft">
            {t('insights.noNumbers')}
          </Txt>
        ) : null}
      </ReportCard>

      <ReportCard icon="chart-bar" title={lt('topGroup')}>
        {top ? (
          <VStack gap="xs">
            <Txt variant="heading">{top.title}</Txt>
            <Txt variant="small" tone="soft">
              {top.body}
            </Txt>
          </VStack>
        ) : (
          <Txt tone="soft">{lt('noTopGroup')}</Txt>
        )}
      </ReportCard>

      <ReportCard icon="file-check" title={t('report.fileCheck')}>
        <HStack gap="lg" align="center" wrap>
          <Ring
            value={noRows ? null : report.check.score}
            format={numbers.count}
            size="sm"
            summary={
              noRows ? t('check.noRows') : lt('scoreSpoken', { score: numbers.count(report.check.score), grade: gradeLabel })
            }
          />
          <VStack gap="sm" style={styles.grow}>
            {noRows ? (
              <Txt tone="soft">{t('check.noRows')}</Txt>
            ) : (
              <>
                <Tag tone={gradeIsGood ? 'good' : 'warn'} label={gradeLabel} />
                <Txt>{t('report.checkLine', { score: numbers.count(report.check.score), grade: gradeLabel })}</Txt>
              </>
            )}
          </VStack>
        </HStack>
        <Button
          variant="plain"
          icon="chevron"
          iconPosition="end"
          label={lt('openCheck')}
          onPress={() => router.push('/file-check')}
          style={styles.start}
        />
      </ReportCard>

      <ReportCard icon="calendar" title={lt('dates')}>
        {dates ? (
          <VStack gap="xs">
            <Txt variant="heading">
              {dates.first === dates.last ? dates.first : t('check.dateRange', { first: dates.first, last: dates.last })}
            </Txt>
            <Txt variant="small" tone="soft">
              {lt('dateColumn', { column: prettyColumn(dates.column) })}
            </Txt>
          </VStack>
        ) : (
          <Txt tone="soft">{lt('noDates')}</Txt>
        )}
      </ReportCard>

      {/* Hidden only when the top group, in its own card above, is all LUMIQ noticed. */}
      {others.length > 0 || top === null ? (
        <ReportCard icon="insights" title={t('report.noticed')}>
          {others.length === 0 ? (
            <Txt tone="soft">{t('report.nothingNoticed')}</Txt>
          ) : (
            others.map((item, index) => (
              <VStack key={index} gap="xs">
                <Txt variant="label">{item.title}</Txt>
                <Txt variant="small" tone="soft">
                  {item.body}
                </Txt>
              </VStack>
            ))
          )}
        </ReportCard>
      ) : null}

      <ReportCard icon="info" title={t('report.how')}>
        {report.numbers.map((item, index) => (
          <HStack key={`${index}-${item.label}`} gap="sm" align="start">
            <Txt variant="small" tone="faint" style={styles.mark}>
              {numbers.count(index + 1)}
            </Txt>
            <Txt variant="small" tone="soft" style={styles.grow}>
              {item.footnote}
            </Txt>
          </HStack>
        ))}
      </ReportCard>

      <Txt variant="small" tone="soft">
        {t('report.footer')}
      </Txt>

      <VStack gap="sm">
        <Button icon="share" label={t('report.share')} fullWidth onPress={() => void share()} />
        <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
          {lt('shareContains')}
        </Txt>
      </VStack>
    </>
  );
}

// The quiet heading of a card: a small icon and what the card holds.
function ReportHead({ icon, title }: { icon: IconName; title: string }) {
  const { colors } = useTheme();
  return (
    <HStack gap="sm">
      <Icon name={icon} size={sizes.iconSmall} color={colors.inkSoft} />
      <Txt variant="label" tone="soft" accessibilityRole="header" style={styles.grow}>
        {title}
      </Txt>
    </HStack>
  );
}

// One calm card of the page: paper with a thin edge and no shadow, its
// quiet heading, and what it holds.
function ReportCard({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <Card style={styles.card}>
      <ReportHead icon={icon} title={title} />
      {children}
    </Card>
  );
}

// The shape of the page while a big file's report is being made: the file
// card, the number tiles, two cards and the share button.
function ReportSkeleton({ label }: { label: string }) {
  return (
    <Skeleton label={label} delay={0} style={styles.skeleton}>
      <SkeletonText lines={2} variant="small" />
      <SkeletonCard style={styles.card}>
        <SkeletonText lines={1} variant="label" width="35%" />
        <SkeletonText lines={1} variant="title" width="70%" />
        <SkeletonText lines={1} variant="small" width="50%" />
      </SkeletonCard>
      <SkeletonCard style={styles.card}>
        <SkeletonText lines={1} variant="label" width="40%" />
        <View style={styles.grid}>
          <SkeletonBlock width="45%" height={TILE_SKELETON} style={styles.tileSkeleton} />
          <SkeletonBlock width="45%" height={TILE_SKELETON} style={styles.tileSkeleton} />
          <SkeletonBlock width="45%" height={TILE_SKELETON} style={styles.tileSkeleton} />
          <SkeletonBlock width="45%" height={TILE_SKELETON} style={styles.tileSkeleton} />
        </View>
      </SkeletonCard>
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
      <SkeletonBlock height={sizes.control} radius="pill" />
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // Two tiles to a row, a lone last tile takes the whole row.
  tile: { flexGrow: 1, flexBasis: '45%', gap: space.xs },
  tileSkeleton: { flexGrow: 1 },
  grow: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  start: { alignSelf: 'flex-start' },
  // The footnote's number keeps one column, however its words wrap.
  mark: { minWidth: space.lg },
  skeleton: { gap: rhythm.sectionGap, paddingTop: space.xs },
});
