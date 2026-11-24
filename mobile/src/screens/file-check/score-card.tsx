import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { PrivacyNote } from '@/components/privacy-note';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Grade } from '@/utils/file-check';

// The score out of 100 in a coloured ring, a one-word grade and one sentence
// saying what it means.
export function ScoreCard({
  score,
  grade,
  outOf,
  gradeLabel,
  sentence,
  privacy,
}: {
  score: number;
  grade: Grade;
  outOf: string;
  gradeLabel: string;
  sentence: string;
  privacy: string;
}) {
  const colors = useTheme();
  const good = grade === 'great' || grade === 'good';
  const tone = grade === 'great' ? colors.success : grade === 'good' ? colors.primary : colors.accent;
  const container = grade === 'great' ? colors.successContainer : grade === 'good' ? colors.primaryContainer : colors.accentContainer;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${score} ${outOf}. ${gradeLabel}. ${sentence}`}>
      <View style={[styles.ring, { borderColor: tone }]}>
        <AppText style={[styles.score, { color: colors.text }]}>{String(score)}</AppText>
        <AppText variant="small" tone="secondary" style={styles.center}>
          {outOf}
        </AppText>
      </View>
      <View style={[styles.badge, { backgroundColor: container }]}>
        <AppIcon
          name={good ? { ios: 'checkmark.seal.fill', android: 'verified' } : { ios: 'exclamationmark.triangle.fill', android: 'warning' }}
          size={18}
          color={tone}
        />
        <AppText variant="label" snug style={{ color: tone }}>
          {gradeLabel}
        </AppText>
      </View>
      <AppText variant="heading" style={styles.center}>
        {sentence}
      </AppText>
      <PrivacyNote text={privacy} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1 },
  ring: { width: 148, height: 148, borderRadius: 74, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 48, lineHeight: 56, fontWeight: '800', textAlign: 'center', alignSelf: 'stretch' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.pill },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
