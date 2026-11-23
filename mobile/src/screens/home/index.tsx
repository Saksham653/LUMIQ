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

import { SampleCard } from './sample-card';

// Home: your own files (empty until import lands), the three sample files,
// and one big button to add a file.
export function Home() {
  const colors = useTheme();
  const t = useT();
  const { activeDatasetId, setActiveDatasetId } = useAppState();

  const openSample = (id: string) => {
    setActiveDatasetId(id);
    router.navigate('/insights');
  };

  const addFile = () => Alert.alert(t('home.importSoonTitle'), t('home.importSoonBody'));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Section title={t('home.myFiles')}>
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <AppIcon name={{ ios: 'tray', android: 'inbox' }} size={28} color={colors.textSecondary} />
          <AppText tone="secondary" style={styles.emptyText}>
            {t('home.noFiles')}
          </AppText>
        </View>
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
            onPress={() => openSample(sample.id)}
          />
        ))}
      </Section>

      <View style={styles.actions}>
        <BigButton label={t('home.addFile')} onPress={addFile} />
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
  emptyText: { textAlign: 'center' },
  actions: { gap: Spacing.md },
});
