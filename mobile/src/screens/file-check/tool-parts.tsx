import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { SAMPLES } from '@/data/samples';
import type { Dataset } from '@/data/types';
import { defineStrings, useLocalT } from '@/i18n/local';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';
import { rhythm, sizes, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { Icon } from '@/ui/icon';
import { NoFilesIllustration } from '@/ui/illustrations';
import { List, ListRow } from '@/ui/list';
import { Notice } from '@/ui/notice';
import { HStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// The pieces the three tools of the More tab share (File check, What if and
// Report): the open file at the top, the invitation when no file is open,
// the privacy line, the note for a file that could not be worked out, and the
// way their numbers are worked out without freezing the first frame.

export const TOOL_STRINGS = defineStrings({
  en: {
    noFileBody: 'Open one of your files on Home, or try it now on a sample file.',
    trySample: 'Try a sample file',
    changeFileLabel: 'Choose another file',
    failedBody: 'Something in this file stopped the phone from working it out. Try another file from Home.',
  },
  hi: {
    noFileBody: 'होम पर अपनी कोई फ़ाइल खोलें, या अभी किसी सैंपल फ़ाइल पर आज़माएं।',
    trySample: 'सैंपल फ़ाइल आज़माएं',
    changeFileLabel: 'दूसरी फ़ाइल चुनें',
    failedBody: 'इस फ़ाइल में किसी चीज़ की वजह से फ़ोन हिसाब नहीं कर पाया। होम से कोई दूसरी फ़ाइल आज़माएं।',
  },
});

// --- Working it out ------------------------------------------------------------

// A file at least this big (rows times columns) is worked out after the
// screen has drawn its shape, so a skeleton shows while the phone works.
// A smaller file is worked out at once: a skeleton for a few milliseconds
// would only flicker.
const BIG_FILE_CELLS = 20000;

export function isBigFile(dataset: Dataset): boolean {
  return dataset.data.length * Math.max(1, dataset.columns.length) >= BIG_FILE_CELLS;
}

export type Worked<T> = { status: 'working' } | { status: 'done'; value: T } | { status: 'failed' };

const WORKING: Worked<never> = { status: 'working' };

function attempt<I, T>(work: (input: I) => T, input: I): Worked<T> {
  try {
    return { status: 'done', value: work(input) };
  } catch {
    return { status: 'failed' };
  }
}

// Works out `work(input)`: at once, or (with `later`) after the first frame
// has been drawn, so the skeleton is on screen while the phone is busy. Pass
// a function from module scope and an input that keeps its identity between
// renders (a dataset, or an object made with useMemo).
export function useWorkedOut<I, T>(input: I, work: (input: I) => T, later: boolean): Worked<T> {
  const now = useMemo<Worked<T>>(() => (later ? WORKING : attempt(work, input)), [input, work, later]);
  const [done, setDone] = useState<{ input: I; result: Worked<T> } | null>(null);

  useEffect(() => {
    if (!later) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One frame for the skeleton to be drawn, then the work.
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        if (!cancelled) setDone({ input, result: attempt(work, input) });
      }, 0);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [input, work, later]);

  if (!later) return now;
  return done !== null && done.input === input ? done.result : WORKING;
}

// --- The open file -------------------------------------------------------------

// The open file's name (one line: a long name loses its middle) and its
// size, with the way to another file.
export function FileLine({ dataset }: { dataset: Dataset }) {
  const t = useT();
  const lt = useLocalT(TOOL_STRINGS);
  const numbers = useNumbers();
  const { datasetName } = useDatasets();
  const name = datasetName(dataset.id) ?? dataset.name;
  const size = t('home.rowsCols', {
    rows: numbers.count(dataset.data.length),
    cols: numbers.count(dataset.columns.length),
  });

  return (
    <List>
      <ListRow
        icon="file"
        title={name}
        titleLines={1}
        subtitle={size}
        trailing={
          <Button
            variant="plain"
            size="sm"
            label={t('common.changeFile')}
            accessibilityLabel={lt('changeFileLabel')}
            onPress={() => router.navigate('/')}
          />
        }
      />
    </List>
  );
}

// --- No file open ----------------------------------------------------------------

// The invitation when no file is open: a drawing, what this tool needs, the
// way to Home (the one filled button), and a sample file to try it on here
// and now.
export function NoFileState({ title }: { title: string }) {
  const { colors } = useTheme();
  const t = useT();
  const lt = useLocalT(TOOL_STRINGS);
  const { setActiveDatasetId } = useAppState();
  const sample = SAMPLES[0];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={styles.emptyContent}>
      <EmptyState
        illustration={<NoFilesIllustration size="lg" />}
        title={title}
        body={lt('noFileBody')}
        action={{ label: t('noFile.goHome'), icon: 'home', onPress: () => router.navigate('/') }}>
        {sample !== undefined ? (
          <Button variant="plain" label={lt('trySample')} onPress={() => setActiveDatasetId(sample.id)} />
        ) : null}
      </EmptyState>
    </ScrollView>
  );
}

// --- Could not be worked out ----------------------------------------------------

// A file the phone could not work out: what happened, and the way on.
export function FailedNote({ title }: { title: string }) {
  const t = useT();
  const lt = useLocalT(TOOL_STRINGS);
  return (
    <Notice tone="bad" title={title} action={{ label: t('noFile.goHome'), onPress: () => router.navigate('/') }}>
      {lt('failedBody')}
    </Notice>
  );
}

// --- The promise ---------------------------------------------------------------

// The privacy line with its lock, read as one line.
export function PrivacyLine() {
  const { colors } = useTheme();
  const t = useT();
  return (
    <HStack gap="sm" px="xs" accessible accessibilityLabel={t('privacy.short')}>
      <Icon name="lock" size={sizes.iconSmall} color={colors.inkSoft} />
      <Txt variant="small" tone="soft" style={styles.grow}>
        {t('privacy.short')}
      </Txt>
    </HStack>
  );
}

// The scrolling page of a tool: 16 from the screen's edges, 24 between its
// parts.
export const toolStyles = StyleSheet.create({
  content: { padding: rhythm.screenEdge, gap: rhythm.sectionGap, paddingBottom: space.huge },
  // Centred words take their width from their column.
  stretch: { alignSelf: 'stretch' },
  grow: { flex: 1 },
});

const styles = StyleSheet.create({
  emptyContent: { flexGrow: 1, paddingHorizontal: rhythm.screenEdge, paddingBottom: space.huge },
  grow: { flex: 1 },
});
