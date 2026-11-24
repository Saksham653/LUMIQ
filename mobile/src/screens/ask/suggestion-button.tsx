import { Pressable, StyleSheet } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A ready-made question: one tap asks it, so nobody has to know what to type.
export function SuggestionButton({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: colors.primaryContainer }}
      style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}>
      <AppIcon name={{ ios: 'bubble.left.fill', android: 'chat_bubble' }} size={20} color={colors.primary} />
      <AppText style={styles.text}>{text}</AppText>
      <AppIcon name={{ ios: 'arrow.up.right', android: 'north_east' }} size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  text: { flex: 1 },
});
