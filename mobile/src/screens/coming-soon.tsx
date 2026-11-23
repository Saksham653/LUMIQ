import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { Radius, Spacing } from '@/constants/theme';
import { findSample } from '@/data/samples';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';

// Holding screen for a tab that is being built next. It says what will appear
// here for the chosen file, or points back to Home when no file is chosen.
export function ComingSoon({ messageKey }: { messageKey: 'soon.insights' | 'soon.ask' }) {
  const colors = useTheme();
  const t = useT();
  const { activeDatasetId } = useAppState();
  const sample = findSample(activeDatasetId);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppIcon name={{ ios: 'sparkles', android: 'auto_awesome' }} size={36} color={colors.secondary} />
        <AppText variant="heading" style={styles.center}>
          {t('soon.title')}
        </AppText>
        <AppText tone="secondary" style={styles.center}>
          {sample ? t(messageKey, { name: t(sample.nameKey) }) : t('soon.noFile')}
        </AppText>
      </View>
      {!sample && <BigButton label={t('soon.goHome')} onPress={() => router.navigate('/')} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl },
  card: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.lg, borderWidth: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
