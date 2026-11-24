import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Choice = { value: string; label: string };

// A row of big chips, one per choice, scrolling sideways when they don't fit.
// Every choice is visible at once, rather than hidden in a menu.
export function ChoiceChips({
  choices,
  selected,
  onSelect,
  accessibilityLabel,
}: {
  choices: Choice[];
  selected: string | null;
  onSelect: (value: string) => void;
  accessibilityLabel?: string;
}) {
  const colors = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={accessibilityLabel}>
      {choices.map((choice) => {
        const active = choice.value === selected;
        return (
          <Pressable
            key={choice.value}
            onPress={() => onSelect(choice.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              active
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.card, borderColor: colors.border },
            ]}>
            <AppText variant="label" style={{ color: active ? colors.onPrimary : colors.text }}>
              {choice.label}
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
