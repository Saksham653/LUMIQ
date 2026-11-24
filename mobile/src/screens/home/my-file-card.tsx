import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One of the user's own files: tap to open it, or the bin to delete it.
export function MyFileCard({
  name,
  meta,
  selected,
  selectedLabel,
  deleteLabel,
  onOpen,
  onDelete,
}: {
  name: string;
  meta: string;
  selected: boolean;
  selectedLabel: string;
  deleteLabel: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 },
      ]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${meta}`}
        accessibilityState={{ selected }}
        android_ripple={{ color: colors.primaryContainer }}
        style={styles.open}>
        <View style={[styles.icon, { backgroundColor: colors.secondaryContainer }]}>
          <AppIcon name={{ ios: 'tablecells', android: 'table_chart' }} size={26} color={colors.secondary} />
        </View>
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={2}>
            {name}
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
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        hitSlop={8}
        android_ripple={{ color: colors.border, borderless: true }}
        style={styles.delete}>
        <AppIcon name={{ ios: 'trash', android: 'delete' }} size={24} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, overflow: 'hidden' },
  open: { flex: 1, minHeight: TouchTarget + 24, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg },
  icon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  badge: { alignSelf: 'flex-start', marginTop: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: 2, borderRadius: Radius.pill },
  delete: { width: TouchTarget, height: TouchTarget, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
});
