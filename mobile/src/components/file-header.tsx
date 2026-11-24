import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useNumbers, useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';

// The chosen file's name and size on a quiet panel, with a way back to Home
// to pick another.
export function FileHeader({ dataset }: { dataset: Dataset }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { datasetName } = useDatasets();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card }]}>
      <View style={styles.text}>
        <AppText variant="heading" numberOfLines={2}>
          {datasetName(dataset.id) ?? dataset.name}
        </AppText>
        <AppText variant="small" tone="secondary">
          {t('home.rowsCols', { rows: numbers.count(dataset.data.length), cols: numbers.count(dataset.columns.length) })}
        </AppText>
      </View>
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="button" hitSlop={12} style={styles.change}>
        <AppText variant="label" snug tone="primary">
          {t('common.changeFile')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg + 4,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.xxl,
  },
  text: { flex: 1, gap: 2 },
  change: { minHeight: 44, justifyContent: 'center' },
});
