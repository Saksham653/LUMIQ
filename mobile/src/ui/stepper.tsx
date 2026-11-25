import { useEffect, useRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  MAX_FONT_SCALE,
  border,
  duration,
  figureFont,
  numeralLine,
  numeralSize,
  radius,
  sizes,
  space,
  typeScale,
  useTheme,
} from '@/theme';
import { select } from '@/ui/haptics';
import { IconButton, type IconButtonSize } from '@/ui/icon-button';

// sm fits in a row of a list. md is as high as a field and sits beside one.
// lg is for a number that is the point of the screen.
export type StepperSize = 'sm' | 'md' | 'lg';

export type StepperProps = {
  // The number. The caller holds it.
  value: number;
  // Called with the next number each time a key steps. It is always inside
  // min and max.
  onValueChange: (value: number) => void;
  // The lowest and the highest number. Left out, that side has no end. A key
  // that cannot step any further is switched off.
  min?: number;
  max?: number;
  // How far one press moves the number. Default 1.
  step?: number;
  // Default md.
  size?: StepperSize;
  // Cannot be used: plain paper and faint ink.
  disabled?: boolean;
  // What the number counts, in the app's language ("Rows to show"). A screen
  // reader says it with the number. A stepper has no words of its own, so
  // this is not optional.
  accessibilityLabel: string;
  // What the two keys do, in the app's language ("Fewer rows", "More rows").
  // A key is only an icon, so these are not optional.
  decreaseLabel: string;
  increaseLabel: string;
  // The number as the app writes it (its own digits and grouping). It is
  // drawn between the keys and read out. Default: the plain number. Digits
  // only: a unit beside it goes in `children`.
  valueText?: string;
  testID?: string;
  // Layout only (alignSelf, flex, a width). Merged last. The stepper is as
  // wide as its content unless told otherwise.
  style?: StyleProp<ViewStyle>;
  // Drawn between the keys in place of the plain number: a number with its
  // unit, in the caller's own text.
  children?: ReactNode;
};

// The height of the pill: the smallest thing a finger presses, a field, and a
// list row (brand spec, section 6).
const HEIGHT: Record<StepperSize, number> = { sm: sizes.target, md: sizes.control, lg: sizes.row };
// The keys are icon buttons. The small pill takes the small one, which is
// drawn 44 and still takes a 48 touch.
const KEY: Record<StepperSize, IconButtonSize> = { sm: 'sm', md: 'md', lg: 'md' };
// How wide and high IconButton draws those two sizes (icon-button.tsx): the
// room at the two ends of the pill is worked out from it, so each round key
// sits in the middle of the pill's round end.
const SMALL_KEY = 44;
const KEY_BOX: Record<StepperSize, number> = { sm: SMALL_KEY, md: sizes.target, lg: sizes.target };
// The digits: the inline numeral on the line of body text, and the medium
// numeral on its own line (brand spec, section 5).
const INLINE_DIGITS: TextStyle = { fontSize: numeralSize.inline, lineHeight: typeScale.body.line };
const DIGITS: Record<StepperSize, TextStyle> = {
  sm: INLINE_DIGITS,
  md: INLINE_DIGITS,
  lg: { fontSize: numeralSize.medium, lineHeight: numeralLine.medium },
};
// Digits are set in the figures face, with figures of equal width, so the
// keys do not shift as the number changes.
const FIGURES = figureFont();

// A key held down starts to repeat after HOLD (400 ms) and then steps every
// BEAT (100 ms). These say how the control behaves, not how anything moves,
// and the motion tokens have no name for them yet; until they do, they are
// built from a time that exists, so no time is typed here.
const HOLD = duration.exit * 2;
const BEAT = duration.exit / 2;

// A number that is not known is a dash, never zero and never "NaN".
const DASH = '—';

// Steps such as 0.1 leave dust in a number (0.1 + 0.2). Six decimals is finer
// than any step a person sets.
function tidy(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

type Repeat = { current: ReturnType<typeof setInterval> | null };

function halt(repeat: Repeat): void {
  if (repeat.current !== null) {
    clearInterval(repeat.current);
    repeat.current = null;
  }
}

// A number with a key on each side to take one step down or up:
//   <Stepper value={rows} onValueChange={setRows} min={1} max={500} step={5}
//     valueText={numbers.format(rows)} accessibilityLabel={t('rows.show')}
//     decreaseLabel={t('rows.fewer')} increaseLabel={t('rows.more')} />
//
// One pill, like a field: paper with a 1.5 edge of faint ink. A key answers at
// contact and steps once when the finger lifts; a key held down keeps
// stepping. Every step gives one selection tap in the hand, in the same frame
// as the number changes. At the end of the range that key is switched off and
// a held key stops.
//
// To a screen reader it is three things: the two keys, each with its own
// name, and the number, which is read with what it counts and read again each
// time it changes.
//
// The keys swap sides in right-to-left languages; the digits never flip. The
// digits do not roll: for a number that should, pass a numeral as children.
export function Stepper({
  value,
  onValueChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  size = 'md',
  disabled = false,
  accessibilityLabel,
  decreaseLabel,
  increaseLabel,
  valueText,
  testID,
  style,
  children,
}: StepperProps) {
  const { colors } = useTheme();
  // A step that is not a size falls back to one.
  const stride = step > 0 ? step : 1;
  // What a held key counts from, between two renders.
  const live = useRef({ number: value, min, max, stride, onValueChange });
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  // A key changed the number: say the new one aloud, once.
  const stepped = useRef(false);

  const known = Number.isFinite(value);
  const text = valueText ?? (known ? String(value) : DASH);

  useEffect(() => {
    live.current = { number: value, min, max, stride, onValueChange };
  });

  // A stepper that is switched off or leaves the screen lets go of a held key.
  useEffect(() => {
    if (disabled) halt(repeat);
  }, [disabled]);
  useEffect(() => {
    return () => halt(repeat);
  }, []);

  // Android and a browser read the number out by themselves when it changes
  // (the live region below). An iPhone has no live regions, so it is told.
  useEffect(() => {
    if (!stepped.current) return;
    stepped.current = false;
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
  }, [text]);

  // One step. Says whether the number moved, so a held key knows when to stop.
  const stepBy = (direction: 1 | -1): boolean => {
    const now = live.current;
    if (!Number.isFinite(now.number)) return false;
    const next = Math.min(now.max, Math.max(now.min, tidy(now.number + direction * now.stride)));
    if (next === now.number) return false;
    // Until the caller's new number comes back, the next step counts from here.
    now.number = next;
    stepped.current = true;
    select();
    now.onValueChange(next);
    return true;
  };

  const press = (direction: 1 | -1) => {
    stepBy(direction);
  };

  const hold = (direction: 1 | -1) => {
    halt(repeat);
    if (!stepBy(direction)) return;
    repeat.current = setInterval(() => {
      if (!stepBy(direction)) halt(repeat);
    }, BEAT);
  };

  const release = () => {
    halt(repeat);
    // Count from the caller's number again, also when it turned a step down.
    live.current.number = value;
  };

  const height = HEIGHT[size];
  // Keeps each round key in the middle of the pill's round end.
  const inset = Math.max(0, (height - border.control * 2 - KEY_BOX[size]) / 2);
  const ink = disabled ? colors.disabledInk : colors.ink;
  const lowest = disabled || !known || value <= min;
  const highest = disabled || !known || value >= max;

  // A browser names a group and reads the digits when they change. A phone
  // reads the number as one thing: what it counts, then how many.
  const group = Platform.OS === 'web' ? ({ role: 'group', 'aria-label': accessibilityLabel } as const) : {};
  const readout =
    Platform.OS === 'web'
      ? ({ 'aria-live': 'polite' } as const)
      : ({
          accessible: true,
          accessibilityRole: 'text',
          accessibilityLabel,
          'aria-valuetext': text,
          'aria-live': 'polite',
        } as const);

  return (
    <View
      {...group}
      testID={testID}
      style={[
        styles.pill,
        {
          minHeight: height,
          paddingHorizontal: inset,
          backgroundColor: disabled ? colors.disabledFill : colors.surface,
          borderColor: disabled ? colors.disabledFill : colors.inkFaint,
        },
        style,
      ]}>
      <IconButton
        icon="minus"
        size={KEY[size]}
        disabled={lowest}
        accessibilityLabel={decreaseLabel}
        delayLongPress={HOLD}
        onPress={() => press(-1)}
        onLongPress={() => hold(-1)}
        onPressOut={release}
      />
      <View {...readout} style={styles.middle}>
        {children ?? (
          <View style={styles.digitsRow}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.digits, FIGURES, DIGITS[size], { color: ink }]}>
              {text}
            </Text>
          </View>
        )}
      </View>
      <IconButton
        icon="add"
        size={KEY[size]}
        disabled={highest}
        accessibilityLabel={increaseLabel}
        delayLongPress={HOLD}
        onPress={() => press(1)}
        onLongPress={() => hold(1)}
        onPressOut={release}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // No fixed height: the pill grows with its number. As wide as its content
  // unless the caller lays it out otherwise.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: border.control,
    borderRadius: radius.pill,
  },
  // Room for at least two digits, so a short number does not pull the keys
  // together. It takes whatever width is left when the stepper is stretched,
  // and gives way when words between the keys are long, so they wrap.
  middle: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: sizes.target,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Numbers read left to right in every language, Hebrew included.
  digitsRow: { direction: 'ltr' },
  digits: { textAlign: 'center', writingDirection: 'ltr' },
});
