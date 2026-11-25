import { StyleSheet, View } from 'react-native';

import { border, radius, sizes, space, useTheme } from '@/theme';
import { Press } from '@/ui/press';
import { Txt } from '@/ui/text';

// Two small parts shared by More, Language and Numbers and currency: the
// radio mark of a one-choice list, and a short choice written as pills.

// The radio mark (brand spec, section 6): a 22 circle with a 1.5 faint ring.
// Chosen, it is filled with the action blue and holds an 8 white dot.
const RADIO = 22;
const RADIO_DOT = 8;
// The narrowest pill (the brand board's switch between two or three choices).
const PILL_MIN_WIDTH = 68;

// Drawn only: the row round it is the radio (role, state and press), so there
// is one target and one thing to read.
export function RadioMark({ chosen }: { chosen: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      aria-hidden
      style={[
        styles.radio,
        chosen
          ? { backgroundColor: colors.action, borderColor: colors.action }
          : { backgroundColor: colors.surface, borderColor: colors.inkFaint },
      ]}>
      {chosen ? <View style={[styles.radioDot, { backgroundColor: colors.onAction }]} /> : null}
    </View>
  );
}

export type PillOption<T extends string> = { value: T; label: string };

// A choice between two or three things, every one in view, as filled pills:
// the chosen one in the action blue with a white label, the others on sunk
// paper with a soft-ink label. `value` is null while nothing is chosen yet.
// Pressing the chosen pill again changes nothing. The pills share the width
// and move onto a second line when the words no longer fit (large text).
export function PillChoice<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly PillOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  // What is being chosen, in the app's language.
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View role="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.pills}>
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <Press
            key={option.value}
            weight="sm"
            haptic={chosen ? 'none' : 'select'}
            role="radio"
            aria-checked={chosen}
            accessibilityLabel={option.label}
            onPress={() => {
              if (!chosen) onChange(option.value);
            }}
            style={[styles.pill, { backgroundColor: chosen ? colors.action : colors.surfaceSunk }]}>
            <Txt variant="label" snug selectable={false} color={chosen ? colors.onAction : colors.inkSoft}>
              {option.label}
            </Txt>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: radius.pill,
    borderWidth: border.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: RADIO_DOT, height: RADIO_DOT, borderRadius: radius.pill },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // At least 48 high and 68 wide; no fixed size, so it grows with its words.
  pill: {
    flexGrow: 1,
    minHeight: sizes.target,
    minWidth: PILL_MIN_WIDTH,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
