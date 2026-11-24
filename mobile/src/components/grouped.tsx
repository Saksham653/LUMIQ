import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { I18nManager, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { PressableRow } from '@/components/pressable-scale';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Grouped sections, like the phone's own Settings: one white panel with
// rows separated by hairlines. No borders and no shadows; the panel stands
// out from the page by background contrast alone.

export function SectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="small" tone="secondary" style={styles.sectionText} accessibilityRole="header">
        {title}
      </AppText>
      {trailing}
    </View>
  );
}

export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, { backgroundColor: colors.card }, style]}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View style={[styles.hairline, { backgroundColor: colors.border }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

// A small symbol in a quiet tinted circle.
export function IconCircle({ icon, color, background, size = 40 }: { icon: IconName; color?: string; background?: string; size?: number }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.iconCircle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background ?? colors.surfaceVariant },
      ]}>
      <AppIcon name={icon} size={Math.round(size * 0.5)} color={color ?? colors.textSecondary} />
    </View>
  );
}

// A chevron that points the way the language reads.
export function Chevron({ color }: { color?: string }) {
  const colors = useTheme();
  return (
    <View style={I18nManager.isRTL ? styles.flip : null}>
      <AppIcon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={22} color={color ?? colors.textTertiary} />
    </View>
  );
}

// One row: an optional symbol, a title with up to two lines under it, and
// something at the end (a value, a status, a chevron). Pressable rows
// highlight their background while touched.
export function ListRow({
  icon,
  title,
  subtitle,
  detail,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityState,
  titleStyle,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  titleStyle?: StyleProp<ViewStyle>;
}) {
  const content = (
    <View style={styles.row}>
      {icon}
      <View style={[styles.text, titleStyle]}>
        {typeof title === 'string' ? <AppText variant="label">{title}</AppText> : title}
        {typeof subtitle === 'string' ? (
          <AppText variant="small" tone="secondary">
            {subtitle}
          </AppText>
        ) : (
          subtitle
        )}
        {typeof detail === 'string' ? (
          <AppText variant="small" tone="secondary">
            {detail}
          </AppText>
        ) : (
          detail
        )}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} accessibilityState={accessibilityState}>
        {content}
      </View>
    );
  }
  return (
    <PressableRow
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}>
      {content}
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionText: { fontWeight: '600', flexShrink: 1 },
  group: { borderRadius: Radius.xxl, overflow: 'hidden' },
  hairline: { height: StyleSheet.hairlineWidth, marginStart: Spacing.lg },
  row: {
    minHeight: TouchTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  text: { flex: 1, gap: 2 },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  tag: { paddingHorizontal: Spacing.sm, borderRadius: Radius.pill },
});

// A radio button: a cyan ring with a filled centre when chosen.
export function Radio({ selected }: { selected: boolean }) {
  const colors = useTheme();
  return (
    <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.textTertiary }]}>
      {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

// A small quiet tag, e.g. "Beta".
export function Tag({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.surfaceVariant }]}>
      <AppText variant="small" tone="secondary" snug>
        {label}
      </AppText>
    </View>
  );
}
