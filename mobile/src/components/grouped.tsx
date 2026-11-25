import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { I18nManager, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { PressableRow } from '@/components/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Grouped sections, like the phone's own Settings: one card (paper with a
// thin edge, corner 20, no shadow) with rows separated by hairlines.

// A list row is at least this high (brand spec, section 6).
const ROW_MIN = 56;
// The corner of an icon tile, as a part of its side: 14 on a tile of 40.
const TILE_CORNER = 0.35;

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
    <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View style={[styles.hairline, { backgroundColor: colors.border }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

// A small symbol on a sunk tile with a soft corner (the name is from the old
// look, when the tile was a circle).
export function IconCircle({ icon, color, background, size = 40 }: { icon: IconName; color?: string; background?: string; size?: number }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.iconCircle,
        { width: size, height: size, borderRadius: Math.round(size * TILE_CORNER), backgroundColor: background ?? colors.surfaceVariant },
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
  group: { borderRadius: Radius.xxl, borderWidth: 1, overflow: 'hidden' },
  hairline: { height: 1 },
  row: {
    minHeight: ROW_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  text: { flex: 1, gap: 2 },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  // 22 across with a 1.5 ring; chosen, an 8 dot (brand spec, section 6).
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  tag: { paddingHorizontal: Spacing.sm, borderRadius: Radius.pill },
});

// A radio button: a thin ring; when chosen, filled with the action blue with
// a small dot in the middle.
export function Radio({ selected }: { selected: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.radio,
        selected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.textTertiary },
      ]}>
      {selected ? <View style={[styles.radioDot, { backgroundColor: colors.onPrimary }]} /> : null}
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
