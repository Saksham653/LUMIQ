import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { prettyColumn } from '@/utils/format';

// The number columns as big chips in one scrolling row. Every choice is
// visible at once, rather than hidden in a menu.
export function MetricChips({
  columns,
  selected,
  onSelect,
}: {
  columns: string[];
  selected: string;
  onSelect: (column: string) => void;
}) {
  const colors = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {columns.map((column) => {
        const active = column === selected;
        return (
          <Pressable
            key={column}
            onPress={() => onSelect(column)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              active
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.card, borderColor: colors.border },
            ]}>
            <AppText variant="label" style={{ color: active ? colors.onPrimary : colors.text }}>
              {prettyColumn(column)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingRight: Spacing.xl },
  chip: {
    minHeight: TouchTarget - 8,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
