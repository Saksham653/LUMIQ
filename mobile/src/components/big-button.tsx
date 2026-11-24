import { StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The one main action of a screen: full width, 56 dp, fully rounded, an
// 18 pt bold label. "filled" is cyan (cyan always means an action);
// "tonal" is the quieter second action. Presses scale to 0.97.
export function BigButton({
  label,
  onPress,
  variant = 'filled',
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'tonal';
  icon?: IconName;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const filled = variant === 'filled';
  const background = filled ? colors.primary : colors.surfaceVariant;
  const foreground = filled ? colors.onPrimary : colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.button, { backgroundColor: background, opacity: disabled ? 0.5 : 1 }]}>
      <View style={styles.row}>
        {icon ? <AppIcon name={icon} size={22} color={foreground} /> : null}
        {/* Stretched, centred text: Android measures Hindi narrower than it draws it. */}
        <AppText variant="body" style={[styles.label, { color: foreground }, icon ? styles.withIcon : styles.full]}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  label: { fontWeight: '700', textAlign: 'center' },
  full: { flex: 1 },
  withIcon: { flexShrink: 1 },
});
