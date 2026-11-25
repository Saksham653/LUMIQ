import { numericColumns } from '@core/data/dataset.js';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import type { Dataset } from '@/data/types';
import { useLocalT } from '@/i18n/local';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset } from '@/state/datasets';
import { rhythm, space, useTheme } from '@/theme';
import { Chip, ChipGroup } from '@/ui/chip';
import { EmptyState } from '@/ui/empty-state';
import { NoFilesIllustration } from '@/ui/illustrations';
import { Notice } from '@/ui/notice';
import { Section } from '@/ui/section';
import { prettyColumn } from '@/utils/format';
import { describeInsights, type InsightView } from '@/utils/insight-text';

import { ColumnSkeleton } from './column-skeleton';
import { SMALL_FILE_ROWS, afterPaint, computeColumnFacts, type ColumnFacts } from './compute';
import { FigureCard } from './figure-card';
import { FileChip } from './file-chip';
import { ForecastCard } from './forecast-card';
import { MainChart } from './main-chart';
import { Noticed } from './noticed';
import { INSIGHTS_STRINGS } from './strings';

// Files whose figures have already rolled in this session: the first look at
// a file is the rare moment; later visits are still.
const countedUp = new Set<string>();

// Insights for the open file, read as an answer: pick a number column and
// see what it adds up to, how it is spread, where it may go next and what
// stands out. All worked out on the phone with the same engine as the web
// app; nothing is sent anywhere.
export function Insights() {
  const dataset = useActiveDataset();
  // Keyed by file, so opening another file starts again at the top with
  // that file's first number column instead of keeping the old scroll.
  return dataset ? <DatasetInsights key={dataset.id} dataset={dataset} /> : <NoFile />;
}

// No file is open: an invitation to pick one on Home.
function NoFile() {
  const { colors } = useTheme();
  const t = useT();
  const tl = useLocalT(INSIGHTS_STRINGS);
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={styles.emptyContent}>
      <EmptyState
        illustration={<NoFilesIllustration />}
        title={tl('emptyTitle')}
        body={tl('emptyBody')}
        action={{ label: t('noFile.goHome'), icon: 'home', onPress: () => router.navigate('/') }}
      />
    </ScrollView>
  );
}

type ColumnAnswerProps = {
  metric: string;
  facts: ColumnFacts;
  // The figures roll into place: the first look at this file only.
  roll: boolean;
  onAsk: () => void;
};

// One column's answer: the figures, each with how it was worked out, the
// chart, and the forecast when the chart runs through time.
function ColumnAnswer({ metric, facts, roll, onAsk }: ColumnAnswerProps) {
  const t = useT();
  const tl = useLocalT(INSIGHTS_STRINGS);
  const numbers = useNumbers();
  const { kpis } = facts;

  const amount = (value: number | null | undefined) => numbers.amount(value, kpis.typeInfo, metric);
  const parts = (value: number | null) => numbers.amountParts(value, kpis.typeInfo, metric);
  const values = numbers.count(kpis.values);
  // Rates, margins and scores are averaged, and their middle value shown;
  // amounts are added up and averaged.
  const averaged = kpis.rule === 'avg';

  return (
    // The charts read a finger through the gesture handler, which needs a
    // root above them. Under another root this one does nothing.
    <GestureHandlerRootView style={styles.cards}>
      <FigureCard
        size="hero"
        roll={roll}
        label={t(averaged ? 'insights.average' : 'insights.total')}
        parts={parts(kpis.headline)}
        proof={t(averaged ? 'insights.averageOfRows' : 'insights.totalHow', { rows: values })}
      />
      <View style={styles.grid}>
        <FigureCard
          style={styles.half}
          roll={roll}
          label={t(averaged ? 'insights.middle' : 'insights.average')}
          parts={parts(kpis.second)}
          proof={averaged ? t('insights.middleHow') : t('insights.averageHow', { rows: values })}
        />
        <FigureCard
          style={styles.half}
          roll={roll}
          label={t('insights.highest')}
          parts={parts(kpis.highest)}
          proof={
            kpis.highestLabel
              ? tl('highestOfIn', { n: values, label: kpis.highestLabel })
              : tl('highestOf', { n: values })
          }
        />
        <FigureCard
          style={styles.half}
          roll={roll}
          label={t('insights.rowsLabel')}
          parts={{ prefix: '', number: numbers.count(kpis.rows), suffix: '' }}
          proof={t('insights.rowsHow')}
        />
      </View>
      <MainChart metric={metric} facts={facts} amount={amount} onAsk={onAsk} />
      {facts.forecast ? <ForecastCard metric={metric} outcome={facts.forecast} amount={amount} /> : null}
    </GestureHandlerRootView>
  );
}

function DatasetInsights({ dataset }: { dataset: Dataset }) {
  const { colors } = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { language, numberStyle, defaultCurrency } = useAppState();

  const numeric = useMemo(() => numericColumns(dataset) as string[], [dataset]);
  const [picked, setPicked] = useState<string | null>(null);
  const metric = picked !== null && numeric.includes(picked) ? picked : (numeric[0] ?? null);

  // Roll the figures only the first time this file is shown in this session,
  // and not again once another column is picked.
  const [firstLook] = useState(() => !countedUp.has(dataset.id));
  const [switched, setSwitched] = useState(false);
  useEffect(() => {
    countedUp.add(dataset.id);
  }, [dataset.id]);

  const smallFile = dataset.data.length <= SMALL_FILE_ROWS;

  // A small file: worked out in place, once per column choice.
  const inlineFacts = useMemo(
    () => (smallFile && metric !== null ? computeColumnFacts(dataset, metric) : null),
    [smallFile, dataset, metric],
  );
  // A big file: each column is worked out once, just after its outline is
  // drawn, and kept, so going back to a column is instant.
  const [keptFacts, setKeptFacts] = useState<Record<string, ColumnFacts>>({});
  const pendingColumn = !smallFile && metric !== null && keptFacts[metric] === undefined ? metric : null;
  useEffect(() => {
    if (pendingColumn === null) return undefined;
    return afterPaint(() => {
      const worked = computeColumnFacts(dataset, pendingColumn);
      setKeptFacts((before) => ({ ...before, [pendingColumn]: worked }));
    });
  }, [dataset, pendingColumn]);
  const facts = smallFile ? inlineFacts : metric !== null ? (keptFacts[metric] ?? null) : null;

  // What LUMIQ noticed belongs to the whole file, worded in the app's
  // language and number style. The same two ways as above.
  const wordsKey = `${language}|${numberStyle}|${defaultCurrency ?? ''}`;
  const inlineNoticed = useMemo(
    () => (smallFile ? describeInsights(dataset, t, numbers, language) : null),
    [smallFile, dataset, t, numbers, language],
  );
  const [keptNoticed, setKeptNoticed] = useState<{ key: string; items: InsightView[] } | null>(null);
  const noticedPending = !smallFile && keptNoticed?.key !== wordsKey;
  useEffect(() => {
    if (!noticedPending) return undefined;
    return afterPaint(() => {
      setKeptNoticed({ key: wordsKey, items: describeInsights(dataset, t, numbers, language) });
    });
  }, [noticedPending, wordsKey, dataset, t, numbers, language]);
  const noticed = smallFile ? inlineNoticed : keptNoticed !== null && keptNoticed.key === wordsKey ? keptNoticed.items : null;

  const choose = (column: string) => {
    setSwitched(true);
    setPicked(column);
  };
  const ask = () => router.navigate('/ask');

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={styles.content}>
      <View style={styles.sections}>
        <FileChip dataset={dataset} />

        {metric === null ? (
          // A file with no number columns: nothing to add up, and why.
          <Notice icon="numbers">{t('insights.noNumbers')}</Notice>
        ) : (
          <>
            <Section size="sm" title={t('insights.showing')}>
              <ChipGroup
                value={metric}
                onChange={choose}
                inset="lg"
                accessibilityLabel={t('insights.showing')}
                style={styles.bleed}>
                {numeric.map((column) => (
                  <Chip key={column} value={column} label={prettyColumn(column)} />
                ))}
              </ChipGroup>
            </Section>
            {facts === null ? (
              <ColumnSkeleton />
            ) : (
              <ColumnAnswer metric={metric} facts={facts} roll={firstLook && !switched} onAsk={ask} />
            )}
          </>
        )}

        <Noticed items={noticed} onAsk={ask} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // 16 from the screen's edges, 24 between sections.
  content: { paddingHorizontal: rhythm.screenEdge, paddingTop: space.sm, paddingBottom: space.huge },
  sections: { gap: rhythm.sectionGap },
  // The empty screen fills the room under the title and sits in its middle.
  emptyContent: { flexGrow: 1, paddingHorizontal: rhythm.screenEdge, paddingBottom: space.huge },
  // Cards 12 apart.
  cards: { gap: rhythm.cardGap },
  // Two figures to a row, the last alone across the width.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: rhythm.cardGap },
  half: { flexBasis: '40%', flexGrow: 1 },
  // The chips scroll from one edge of the screen to the other, the first one
  // in line with everything else.
  bleed: { marginHorizontal: -rhythm.screenEdge },
});
