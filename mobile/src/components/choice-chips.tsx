import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { hapticSelection } from '@/components/haptics';
import { CSS_EASE_OUT } from '@/constants/motion';
import { Motion, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Choice = { value: string; label: string };

function Chip({ choice, active, onSelect }: { choice: Choice; active: boolean; onSelect: (value: string) => void }) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={() => {
        if (!active) hapticSelection();
        onSelect(choice.value);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.primary : pressed ? colors.pressed : colors.card,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            transitionProperty: ['backgroundColor', 'transform'],
            transitionDuration: Motion.fast,
            transitionTimingFunction: CSS_EASE_OUT,
          },
        ]}>
        <AppText variant="label" snug style={{ color: active ? colors.onPrimary : colors.text }}>
          {choice.label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

// A row of big chips, one per choice, scrolling sideways when they don't fit.
// Every choice is visible at once, rather than hidden in a menu. Choosing one
// changes its colour (150 ms) with a selection haptic in the same frame.
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={accessibilityLabel}>
      {choices.map((choice) => (
        <Chip key={choice.value} choice={choice} active={choice.value === selected} onSelect={onSelect} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingEnd: Spacing.xl },
  chip: {
    minHeight: TouchTarget - 8,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
});
