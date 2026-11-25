import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { border, duration, radius, sizes, space, transition, useReducedMotion, useTheme } from '@/theme';
import { select } from '@/ui/haptics';
import { Icon } from '@/ui/icon';
import { Press } from '@/ui/press';
import { Txt } from '@/ui/text';

export type RadioGroupSize = 'sm' | 'md' | 'lg';

export type RadioOption<T extends string = string> = {
  value: T;
  // The words of the choice, already in the app's language.
  label: string;
  // One more line under the label, in soft ink: what choosing it means.
  description?: string;
  // This one choice cannot be made now: faint ink, and it takes no press.
  disabled?: boolean;
};

export type RadioGroupProps<T extends string = string> = {
  // The choices, one row each, in the order they are shown.
  options: readonly RadioOption<T>[];
  // The chosen value, or null while nothing is chosen.
  value: T | null;
  // Called on release when another row is chosen. Pressing the chosen one
  // changes nothing and calls nothing.
  onChange: (value: T) => void;
  // sm puts the words in small type. lg makes every row 56 high, to stand in
  // a list of rows. The radio itself is always 22. Default md: the option row
  // of a sheet, at least 48 high.
  size?: RadioGroupSize;
  // Switches every row off: plain paper and faint ink. The chosen row keeps
  // its dot, so it is still told by form.
  disabled?: boolean;
  // What is wrong and what to do next ("Nothing is chosen yet. Choose one to
  // go on."), in the app's language. It is shown under the rows with the
  // error icon, and the rings turn to the failure red: never colour alone.
  error?: string;
  // What is being chosen ("Write big numbers as"), in the app's language.
  accessibilityLabel?: string;
  testID?: string;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The radio (brand spec, section 6): a 22 circle with a 1.5 inkFaint ring;
// chosen, it is filled with the action blue and holds an 8 dot.
const RADIO = 22;
const DOT = 8;
// Where the dot starts from as it scales in. An 8 dot that started at the
// usual 0.9 would grow by less than a pixel, which no eye can see; from half
// its size the growth reads, and it is never the nothing of scale 0.
const DOT_FROM = 0.5;

// The drawn radio. Not chosen: the ring alone. Chosen: the blue fill fades in
// over the ring and the dot scales in. Disabled: plain paper with a faint-ink
// ring, and a faint-ink dot when chosen.
function RadioMark({ chosen, disabled, wrong }: { chosen: boolean; disabled: boolean; wrong: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // Under the fill the ring takes the fill's own blue, so no other colour
  // shows at its rim.
  const ring = disabled ? colors.disabledInk : chosen ? colors.action : wrong ? colors.bad : colors.inkFaint;
  const dot = disabled ? colors.disabledInk : colors.onAction;

  return (
    <View style={styles.mark}>
      <View
        style={[styles.ring, { borderColor: ring, backgroundColor: disabled ? colors.disabledFill : undefined }]}
      />
      {/* Two layers that cross-fade, not one colour run through its in-betweens. */}
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: colors.action, opacity: chosen && !disabled ? 1 : 0 },
          transition(['opacity'], duration.quick, 'standard', reduced),
        ]}
      />
      {/* With reduced motion the dot does not grow: it fades in at full size. */}
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dot, opacity: chosen ? 1 : 0, transform: [{ scale: chosen ? 1 : DOT_FROM }] },
          transition(['opacity', 'transform'], duration.quick, 'standard', reduced),
        ]}
      />
    </View>
  );
}

// What is wrong, under the rows: the error icon and words, in the failure
// red. It is read out when it appears.
function ErrorLine({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View aria-live="polite" style={styles.error}>
      <Icon name="error" size={sizes.iconSmall} color={colors.bad} />
      <Txt variant="small" tone="bad" style={styles.errorWords}>
        {children}
      </Txt>
    </View>
  );
}

// One choice out of a few, every choice in view, one row each (the option
// rows of a sheet):
//   <RadioGroup value={numberStyle} onChange={setNumberStyle} options={numberStyles} accessibilityLabel={t('numbers.title')} />
//   <RadioGroup value={currency} onChange={setCurrency} options={currencies} error={problem} />
//
// The whole row is the target, at least 48 high, and it tints under the
// finger. Choosing a row fills its radio with the action blue, scales the dot
// in and sets its words in the heavier weight, with one selection tap in the
// hand. With reduced motion the dot fades in without growing. To a screen
// reader each row is a radio that is checked or not.
export function RadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
  error,
  accessibilityLabel,
  testID,
  style,
}: RadioGroupProps<T>) {
  const { colors } = useTheme();
  const problem = error !== undefined && error !== '' ? error : null;

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
      {options.map((option) => {
        const chosen = option.value === value;
        const off = disabled || option.disabled === true;
        return (
          <Press
            key={option.value}
            accessibilityRole="radio"
            aria-checked={chosen}
            disabled={off}
            feedback="highlight"
            weight="lg"
            onPress={() => {
              if (chosen) return;
              // One selection tap, in the same frame as the radio filling.
              select();
              onChange(option.value);
            }}
            style={[styles.row, size === 'lg' && styles.rowTall]}>
            <RadioMark chosen={chosen} disabled={off} wrong={problem !== null} />
            <View style={styles.words}>
              {/* The chosen row is also told by weight (the brand board): 600, where the others keep their own. */}
              <Txt
                variant={size === 'sm' ? 'small' : 'body'}
                weight={chosen ? '600' : size === 'sm' ? '500' : undefined}
                color={off ? colors.disabledInk : undefined}
                selectable={false}>
                {option.label}
              </Txt>
              {option.description === undefined ? null : (
                <Txt variant="small" color={off ? colors.disabledInk : colors.inkSoft} selectable={false}>
                  {option.description}
                </Txt>
              )}
            </View>
          </Press>
        );
      })}
      {problem === null ? null : <ErrorLine>{problem}</ErrorLine>}
    </View>
  );
}

const styles = StyleSheet.create({
  // The option row of the brand board: the radio, 12, the words; 4 above and
  // below and 8 at the ends inside corners of 14, where the pressed tint
  // shows. No fixed height: it grows with its words.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: sizes.target,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.control,
  },
  rowTall: { minHeight: sizes.row },
  // Takes the room that is left, so long words wrap inside it.
  words: { flex: 1 },
  // Holds a drawing, never text, so it may have a fixed size.
  mark: { width: RADIO, height: RADIO, alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, borderWidth: border.control },
  fill: { ...StyleSheet.absoluteFill, borderRadius: radius.pill },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
  // Lined up with the radios above it.
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingTop: space.xs,
    paddingHorizontal: space.sm,
  },
  errorWords: { flex: 1 },
});
