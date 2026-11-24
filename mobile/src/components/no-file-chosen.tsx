import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { FindFileIllustration } from '@/components/illustrations';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/state/app-state';

// Shown by Insights, Ask and the tools when no file is chosen: a simple
// illustration, one line on what to do next, and one action back to Home.
export function NoFileChosen() {
  const colors = useTheme();
  const t = useT();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <View style={[styles.panel, { backgroundColor: colors.card }]}>
        <FindFileIllustration size={84} />
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
  panel: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.xxl },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
