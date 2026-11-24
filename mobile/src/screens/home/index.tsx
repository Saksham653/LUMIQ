import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { PrivacyNote } from '@/components/privacy-note';
import { Section } from '@/components/section';
import { Radius, Spacing } from '@/constants/theme';
import { SAMPLES } from '@/data/samples';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';
import { formatCount, formatDate } from '@/utils/format';

import { MyFileCard } from './my-file-card';
import { SampleCard } from './sample-card';

// Home: your own files, the three sample files, and one big button to add a
// file from the phone. Tapping a file opens its Insights.
export function Home() {
  const colors = useTheme();
  const t = useT();
  const { activeDatasetId, setActiveDatasetId, language } = useAppState();
  const { myFiles, importFile, removeFile } = useDatasets();

  const open = (id: string) => {
    setActiveDatasetId(id);
    router.navigate('/insights');
  };

  const confirmDelete = (id: string, name: string) =>
    Alert.alert(t('home.deleteTitle', { name }), t('home.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeFile(id) },
    ]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Section title={t('home.myFiles')}>
        {myFiles.length > 0 ? (
          myFiles.map((file) => (
            <MyFileCard
              key={file.id}
              name={file.name}
              meta={t('home.fileMeta', {
                rows: formatCount(file.rows),
                cols: file.columns,
                date: formatDate(file.addedAt, language),
              })}
              selected={file.id === activeDatasetId}
              selectedLabel={t('home.selected')}
              deleteLabel={t('home.deleteA11y', { name: file.name })}
              onOpen={() => open(file.id)}
              onDelete={() => confirmDelete(file.id, file.name)}
            />
          ))
        ) : (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <AppIcon name={{ ios: 'tray', android: 'inbox' }} size={28} color={colors.textSecondary} />
            <AppText tone="secondary" style={styles.emptyText}>
              {t('home.noFiles')}
            </AppText>
          </View>
        )}
      </Section>

      <Section title={t('home.samples')}>
        {SAMPLES.map((sample) => (
          <SampleCard
            key={sample.id}
            icon={sample.icon}
            name={t(sample.nameKey)}
            description={t(sample.descKey)}
            meta={t('home.rowsCols', { rows: sample.rows, cols: sample.columns })}
            selected={sample.id === activeDatasetId}
            selectedLabel={t('home.selected')}
            onPress={() => open(sample.id)}
          />
        ))}
      </Section>

      <View style={styles.actions}>
        <BigButton label={t('home.addFile')} onPress={() => void importFile()} />
        <PrivacyNote text={t('privacy.short')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.xxxl },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: { textAlign: 'center', alignSelf: 'stretch' },
  actions: { gap: Spacing.md },
});
