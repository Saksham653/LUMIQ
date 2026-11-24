import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Spacing } from '@/constants/theme';
import type { Dataset } from '@/data/types';
import { useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';
import { formatCount } from '@/utils/format';

// The chosen file's name and size, with a way back to Home to pick another.
export function FileHeader({ dataset }: { dataset: Dataset }) {
  const t = useT();
  const { datasetName } = useDatasets();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="heading">{datasetName(dataset.id) ?? dataset.name}</AppText>
        <AppText variant="small" tone="secondary">
          {t('home.rowsCols', { rows: formatCount(dataset.data.length), cols: dataset.columns.length })}
        </AppText>
      </View>
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="button" hitSlop={8} style={styles.change}>
        <AppText variant="label" snug tone="primary">
          {t('common.changeFile')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  text: { flex: 1, gap: 2 },
  change: { paddingVertical: Spacing.sm },
});
