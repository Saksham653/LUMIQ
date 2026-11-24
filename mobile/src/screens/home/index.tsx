import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { Chevron, Group, IconCircle, SectionTitle } from '@/components/grouped';
import { FileLockIllustration } from '@/components/illustrations';
import { Numeral } from '@/components/numeral';
import { PressableScale } from '@/components/pressable-scale';
import { PrivacyNote } from '@/components/privacy-note';
import { SkeletonBlock } from '@/components/skeleton';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { SAMPLES } from '@/data/samples';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { useActiveDataset, useDatasets } from '@/state/datasets';

import { MyFileRow } from './my-file-card';
import { SampleRow } from './sample-card';

// A new file fades in (250 ms); a removed one fades out (150 ms) and the
// list closes the gap. With reduced motion the fades stay, nothing moves.
const ADDED = FadeIn.duration(Motion.base).reduceMotion(ReduceMotion.Never);
const REMOVED = FadeOut.duration(Motion.fast).reduceMotion(ReduceMotion.Never);
const REFLOW = LinearTransition.duration(Motion.base).reduceMotion(ReduceMotion.System);

// Home: the open file with its size as big numerals, your own files, the
// three sample files, and one big button to add a file from the phone.
// Tapping a file opens its Insights.
export function Home() {
  const colors = useTheme();
  const t = useT();
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

  const activeSample = SAMPLES.find((sample) => sample.id === activeDatasetId);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      {active && activeDatasetId ? (
        <View>
          <SectionTitle title={t('home.openNow')} />
          <PressableScale
            onPress={() => open(activeDatasetId)}
            accessibilityRole="button"
            accessibilityLabel={`${datasetName(activeDatasetId) ?? active.name}. ${t('home.rowsCols', {
              rows: numbers.count(active.data.length),
              cols: numbers.count(active.columns.length),
            })}`}
            style={[styles.openCard, { backgroundColor: colors.card }]}>
            <View style={styles.openTop}>
              <IconCircle icon={{ ios: 'tablecells', android: 'table_chart' }} />
              <View style={styles.flex}>
                <AppText variant="heading" numberOfLines={2}>
                  {datasetName(activeDatasetId) ?? active.name}
                </AppText>
                {activeSample ? (
                  <AppText variant="small" tone="secondary">
                    {t(activeSample.descKey)}
                  </AppText>
                ) : null}
              </View>
              <Chevron />
            </View>
            <View style={styles.numerals}>
              <View>
                <Numeral parts={{ prefix: '', number: numbers.count(active.data.length), suffix: '' }} format={numbers.format} size="hero" />
                <AppText variant="small" tone="secondary">
                  {t('home.rowsLabel')}
                </AppText>
              </View>
              <View>
                <Numeral parts={{ prefix: '', number: numbers.count(active.columns.length), suffix: '' }} format={numbers.format} size="hero" />
                <AppText variant="small" tone="secondary">
                  {t('home.columnsLabel')}
                </AppText>
              </View>
            </View>
          </PressableScale>
        </View>
      ) : null}

      <View>
        <SectionTitle title={t('home.myFiles')} />
        {myFiles.length > 0 || importing ? (
          <Group>
            {importing ? (
              <View key="importing" style={styles.skeletonRow} accessible accessibilityLabel={t('import.reading')}>
                <SkeletonBlock width={40} height={40} radius={20} />
                <View style={styles.skeletonText}>
                  <AppText variant="small" tone="secondary">
                    {t('import.reading')}
                  </AppText>
                  <SkeletonBlock width="70%" height={12} />
                </View>
              </View>
            ) : null}
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
          </Group>
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <FileLockIllustration />
            <AppText tone="secondary" style={styles.center}>
              {t('home.noFiles')}
            </AppText>
          </View>
        )}
      </View>

      <View>
        <SectionTitle title={t('home.samples')} />
        <Group>
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
        </Group>
      </View>

      <View style={styles.actions}>
        <BigButton label={t('home.addFile')} icon={{ ios: 'plus', android: 'add' }} onPress={() => void importFile()} />
        <PrivacyNote text={t('privacy.short')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.huge },
  flex: { flex: 1 },
  openCard: { borderRadius: Radius.xxl, padding: Spacing.xl, gap: Spacing.lg },
  openTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  numerals: { flexDirection: 'row', gap: Spacing.huge },
  empty: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.xxl },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, minHeight: 64 },
  skeletonText: { flex: 1, gap: Spacing.sm },
  actions: { gap: Spacing.md },
});
