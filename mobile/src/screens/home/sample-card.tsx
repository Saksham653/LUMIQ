import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One sample file: a big tappable card with its name, what it holds and its
// size. The selected file gets a coloured border and a "Selected" badge.
export function SampleCard({
  icon,
  name,
  description,
  meta,
  selected,
  selectedLabel,
  onPress,
}: {
  icon: string;
  name: string;
  description: string;
  meta: string;
  selected: boolean;
  selectedLabel: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${description}. ${meta}`}
      accessibilityState={{ selected }}
      android_ripple={{ color: colors.primaryContainer }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.icon, { backgroundColor: colors.primaryContainer }]}>
        <AppText style={styles.emoji} accessible={false}>
          {icon}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText variant="heading">{name}</AppText>
        <AppText variant="small" tone="secondary">
          {description}
        </AppText>
        <AppText variant="small" tone="secondary">
          {meta}
        </AppText>
        {selected && (
          <View style={[styles.badge, { backgroundColor: colors.successContainer }]}>
            <AppText variant="small" snug tone="success">
              {selectedLabel}
            </AppText>
          </View>
        )}
      </View>
      {selected ? (
        <AppIcon name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} size={26} color={colors.success} />
      ) : (
        <AppIcon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={22} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: TouchTarget + 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  icon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26, lineHeight: 34 },
  text: { flex: 1, gap: 2 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
});
