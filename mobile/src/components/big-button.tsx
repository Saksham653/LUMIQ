import { StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/pressable-scale';
import { radius, sizes, space, useTheme } from '@/theme';

// The one main action of a screen: full width, a pill at least 52 dp high,
// a 16 pt semibold label. "filled" is the action blue (the blue always means
// something you can press); "tonal" is the quieter second action, soft blue.
// A button that cannot be used is plain paper, never a faded blue. Presses
// scale to 0.97.
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
  const { colors } = useTheme();
  const filled = variant === 'filled';
  const background = disabled ? colors.disabledFill : filled ? colors.action : colors.actionSoft;
  const foreground = disabled ? colors.disabledInk : filled ? colors.onAction : colors.onActionSoft;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.button, { backgroundColor: background }]}>
      <View style={styles.row}>
        {icon ? <AppIcon name={icon} size={sizes.iconSmall} color={foreground} /> : null}
        {/* Stretched, centred text: Android measures Hindi narrower than it draws it. */}
        <AppText variant="label" style={[styles.label, { color: foreground }, icon ? styles.withIcon : styles.full]}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // A minimum, not a height: a long label wraps and the pill grows with it.
  button: {
    minHeight: sizes.control,
    borderRadius: radius.pill,
    paddingHorizontal: space.xxl,
    paddingVertical: space.sm,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  label: { textAlign: 'center' },
  full: { flex: 1 },
  withIcon: { flexShrink: 1 },
});
