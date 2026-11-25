import { router, type Href } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SAMPLES } from '@/data/samples';
import { useLocalT } from '@/i18n/local';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset, useDatasets } from '@/state/datasets';
import { border, duration, easing, radius, rhythm, sizes, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { List, ListRow } from '@/ui/list';
import { Press } from '@/ui/press';
import { Section } from '@/ui/section';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

import { BrandLockup } from './brand-lockup';
import { HeroCard, HOME_MAX_WIDTH } from './hero-card';
import { MyFileRow } from './my-file-card';
import { SampleRow } from './sample-card';
import { HOME_STRINGS } from './strings';

// A new file fades in; a removed one fades out on the exit curve and the list
// closes the gap. The fades stay when the phone asks for less motion; nothing
// moves then.
const ADDED = FadeIn.duration(duration.sweep).reduceMotion(ReduceMotion.Never);
const REMOVED = FadeOut.duration(duration.exit).easing(easing.exit).reduceMotion(ReduceMotion.Never);
const REFLOW = LinearTransition.duration(duration.exit).reduceMotion(ReduceMotion.System);

// The app's name is the same in every language.
const APP_NAME = 'LUMIQ';
// The language control shows both scripts whatever the language (brand spec,
// section 6), and is at least this wide.
const LANGUAGE_SCRIPTS = 'A अ';
const LANGUAGE_MIN_WIDTH = 68;

// The Story has its own route in Home's stack. It is written beside this
// screen, so the route's name is not yet among the typed routes.
const STORY = '/story' as Href;
// What if, File check, Report and Language live in the More tab. Going there
// from Home keeps More's own first screen under them, so Back leads somewhere.
const IN_MORE = { withAnchor: true } as const;

type Way = { key: string; icon: IconName; title: string; go: () => void };

// Home leads with what the open file is saying: the hero with its one finding,
// then every way into that file, the privacy line, the person's own files, the
// button that adds one, and the sample files. Tapping a file makes it the
// open one and shows its Insights.
export function Home() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const tl = useLocalT(HOME_STRINGS);
  const numbers = useNumbers();
  const { activeDatasetId, setActiveDatasetId } = useAppState();
  const { myFiles, importFile, removeFile, importing, lastAddedId, datasetName } = useDatasets();
  const active = useActiveDataset();

  const open = (id: string) => {
    setActiveDatasetId(id);
    router.navigate('/insights');
  };

  const confirmDelete = (id: string, name: string) =>
    Alert.alert(t('home.deleteTitle', { name }), t('home.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeFile(id) },
    ]);

  const playStory = () => router.push(STORY);
  const ask = () => router.navigate('/ask');

  // Every way into the open file, as one list.
  const ways: Way[] = [
    { key: 'story', icon: 'story', title: tl('story'), go: playStory },
    { key: 'insights', icon: 'insights', title: t('tabs.insights'), go: () => router.navigate('/insights') },
    { key: 'ask', icon: 'ask', title: t('tabs.ask'), go: ask },
    { key: 'what-if', icon: 'what-if', title: t('more.whatIf'), go: () => router.navigate('/what-if', IN_MORE) },
    {
      key: 'file-check',
      icon: 'file-check',
      title: t('more.fileCheck'),
      go: () => router.navigate('/file-check', IN_MORE),
    },
    { key: 'report', icon: 'report', title: t('more.report'), go: () => router.navigate('/report', IN_MORE) },
  ];

  const hasOpenFile = active !== null && activeDatasetId !== null;

  // The promise, with its lock. One line for a screen reader.
  const privacy = (
    <HStack gap="sm" px="xs" accessible accessibilityLabel={t('privacy.short')}>
      <Icon name="lock" size={sizes.iconSmall} color={colors.inkSoft} />
      <Txt variant="small" tone="soft" style={styles.grow}>
        {t('privacy.short')}
      </Txt>
    </HStack>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={[
        styles.content,
        // Home has no title bar. An iPhone keeps the scroll view clear of the
        // status bar by itself; elsewhere the room is added here.
        { paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + space.xs },
      ]}>
      <VStack gap="md">
        <HStack gap="md" justify="between" style={styles.top}>
          <BrandLockup label={APP_NAME} />
          <Press
            weight="sm"
            accessibilityRole="button"
            accessibilityLabel={tl('changeLanguage')}
            onPress={() => router.navigate('/language', IN_MORE)}
            style={[styles.language, { backgroundColor: colors.surface, borderColor: colors.inkFaint }]}>
            <Txt variant="label" snug>
              {LANGUAGE_SCRIPTS}
            </Txt>
          </Press>
        </HStack>

        {active !== null && activeDatasetId !== null ? (
          <>
            <HeroCard
              dataset={active}
              name={datasetName(activeDatasetId) ?? active.name}
              meta={t('home.rowsCols', {
                rows: numbers.count(active.data.length),
                cols: numbers.count(active.columns.length),
              })}
              onPlay={playStory}
              onAsk={ask}
            />
            <List>
              {ways.map((way) => (
                <ListRow key={way.key} icon={way.icon} title={way.title} chevron onPress={way.go} />
              ))}
            </List>
            {privacy}
          </>
        ) : null}
      </VStack>

      <Section title={t('home.myFiles')}>
        {myFiles.length > 0 || importing ? (
          // Clipped, so rows closing a gap never slide out over what is below.
          <List style={styles.clip}>
            {/* A file is being read: its row is here already, working. */}
            {importing ? <ListRow key="importing" icon="file" title={t('import.reading')} busy /> : null}
            {myFiles.map((file) => (
              <Animated.View
                key={file.id}
                entering={file.id === lastAddedId ? ADDED : undefined}
                exiting={REMOVED}
                layout={REFLOW}>
                <MyFileRow
                  name={file.name}
                  meta={t('home.fileMeta', {
                    rows: numbers.count(file.rows),
                    cols: numbers.count(file.columns),
                    date: numbers.date(file.addedAt),
                  })}
                  selected={file.id === activeDatasetId}
                  selectedLabel={t('home.selected')}
                  deleteLabel={t('home.deleteA11y', { name: file.name })}
                  onOpen={() => open(file.id)}
                  onDelete={() => confirmDelete(file.id, file.name)}
                />
              </Animated.View>
            ))}
          </List>
        ) : (
          <Card size="lg" style={styles.empty}>
            <View style={[styles.emptyTile, { backgroundColor: colors.surfaceSunk }]}>
              <Icon name="file" color={colors.inkSoft} />
            </View>
            <Txt tone="soft" align="center" style={styles.stretch}>
              {t('home.noFiles')}
            </Txt>
          </Card>
        )}
        <Button
          variant="quiet"
          icon="add"
          label={t('home.addFile')}
          busy={importing}
          fullWidth
          onPress={() => void importFile()}
        />
        {hasOpenFile ? null : privacy}
      </Section>

      <Section title={t('home.samples')}>
        <List>
          {SAMPLES.map((sample) => (
            <SampleRow
              key={sample.id}
              sampleKey={sample.key}
              name={t(sample.nameKey)}
              description={t(sample.descKey)}
              meta={t('home.rowsCols', { rows: numbers.count(sample.rows), cols: numbers.count(sample.columns) })}
              selected={sample.id === activeDatasetId}
              selectedLabel={t('home.selected')}
              onPress={() => open(sample.id)}
            />
          ))}
        </List>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // 16 from the screen's edges, 24 between sections. On a wide screen the
  // column stays in the middle.
  content: {
    width: '100%',
    maxWidth: HOME_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: rhythm.screenEdge,
    paddingBottom: space.huge,
    gap: rhythm.sectionGap,
  },
  top: { minHeight: sizes.target },
  // The language control (brand spec, section 6): a pill at least 48 high and
  // 68 wide, surface with the 1.5 faint edge. Its colours are added at render.
  language: {
    minHeight: sizes.target,
    minWidth: LANGUAGE_MIN_WIDTH,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: border.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  clip: { overflow: 'hidden' },
  empty: { alignItems: 'center', gap: space.md },
  emptyTile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
