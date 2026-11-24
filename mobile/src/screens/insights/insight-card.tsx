import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { InsightView } from '@/utils/insight-text';

// One finding in plain words, with an icon for its kind.
export function InsightCard({ insight }: { insight: InsightView }) {
  const colors = useTheme();
  const palette = {
    primary: { background: colors.primaryContainer, color: colors.onPrimaryContainer },
    accent: { background: colors.accentContainer, color: colors.accent },
    secondary: { background: colors.secondaryContainer, color: colors.secondary },
  }[insight.tone];

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${insight.title}. ${insight.body}`}>
      <View style={[styles.icon, { backgroundColor: palette.background }]}>
        <AppIcon name={insight.icon} size={22} color={palette.color} />
      </View>
      <View style={styles.text}>
        <AppText variant="label">{insight.title}</AppText>
        <AppText variant="small" tone="secondary">
          {insight.body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
