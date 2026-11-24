import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/state/app-state';

// Shown by Insights and Ask when no file is chosen: what to do, and a big
// button back to Home.
export function NoFileChosen() {
  const colors = useTheme();
  const t = useT();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppIcon name={{ ios: 'doc.text.magnifyingglass', android: 'manage_search' }} size={36} color={colors.secondary} />
        <AppText variant="heading" style={styles.center}>
          {t('noFile.title')}
        </AppText>
        <AppText tone="secondary" style={styles.center}>
          {t('noFile.body')}
        </AppText>
      </View>
      <BigButton label={t('noFile.goHome')} onPress={() => router.navigate('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl },
  card: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.lg, borderWidth: 1 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
