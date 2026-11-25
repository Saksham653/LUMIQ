import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EASE_OUT } from '@/constants/motion';
import { Motion, Numeral as NumeralSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppState } from '@/state/app-state';
import { figureFont, hasDevanagari, textFont } from '@/theme';
import type { NumberFormat } from '@/utils/format';

export type NumeralParts = { prefix: string; number: string; suffix: string; rtl?: boolean };

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Where each font's baseline sits, as a part of the font size, so the small
// sign and unit can be stood on the digits' baseline (the row lines its
// children up by their bottom edges).
// Digits: Outfit goes 0.26 below its baseline and its own line is 1.26; on
// the 1.15 line used here the baseline is 0.26 - (1.26 - 1.15) / 2 above the
// bottom of the line.
const DIGIT_BASELINE = 0.205;
// How far below its baseline the text face reaches: Anek Latin, and Anek
// Devanagari, which keeps a lot of room there for marks under the letters.
const TEXT_DESCENT = 0.2;
const DEVANAGARI_DESCENT = 0.69;

// The digits of a count-up frame, written the way the final number is:
// same decimals, same grouping (Western or lakh/crore), same separators.
// Runs on the UI thread, once per frame, so it uses no regular expressions.
function frameText(value: number, decimals: number, group: string, decimal: string, indian: boolean) {
  'worklet';
  const fixed = Math.abs(value).toFixed(decimals);
  const point = fixed.indexOf('.');
  const whole = point === -1 ? fixed : fixed.slice(0, point);
  const fraction = point === -1 ? '' : fixed.slice(point + 1);
  let grouped = '';
  let count = 0;
  let size = 3;
  for (let i = whole.length - 1; i >= 0; i--) {
    grouped = whole[i] + grouped;
    count++;
    if (count === size && i > 0) {
      grouped = group + grouped;
      count = 0;
      if (indian) size = 2;
    }
  }
  return `${value < 0 ? '-' : ''}${grouped}${fraction ? `${decimal}${fraction}` : ''}`;
}

// The digits of `number` as a JavaScript number, and how many decimals show.
function readDigits(number: string, format: NumberFormat) {
  const plain = number
    .replace(/[⁦⁩]/g, '')
    .split(format.group)
    .join('')
    .replace(format.decimal, '.');
  const point = plain.indexOf('.');
  return { value: Number(plain), decimals: point === -1 ? 0 : plain.length - point - 1 };
}

// A big confident number: the digits in the figures face (Outfit, every digit
// the same width), the currency sign and the unit beside them in the text
// face, lighter and smaller ("₹" + "46.8" + "lakh", "4.68" + "M"). The
// figures face has no rupee sign, which is one more reason the sign is text.
// With `countUp`, the digits count up from 0 once (600 ms, ease-out) in the
// final number's own format, on the UI thread; with reduced motion they
// just appear. Numbers stay left-to-right, also in Hebrew.
export function Numeral({
  parts,
  format,
  size = 'large',
  color,
  unitColor,
  countUp = false,
  duration = Motion.countUp,
  align = 'start',
  style,
  accessibilityLabel,
}: {
  parts: NumeralParts;
  format: NumberFormat;
  size?: keyof typeof NumeralSize;
  color?: string;
  unitColor?: string;
  countUp?: boolean;
  duration?: number;
  align?: 'start' | 'center';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const colors = useTheme();
  const { language } = useAppState();
  const reduced = useReducedMotion();
  const fontSize = NumeralSize[size];
  const { value, decimals } = readDigits(parts.number, format);
  const canCount = countUp && !reduced && Number.isFinite(value);
  const [counting, setCounting] = useState(canCount);
  const progress = useSharedValue(canCount ? 0 : value);

  useEffect(() => {
    if (!canCount) return;
    progress.set(
      withTiming(value, { duration, easing: EASE_OUT }, (finished) => {
        if (finished) scheduleOnRN(setCounting, false);
      }),
    );
  }, [canCount, value, duration, progress]);

  const group = format.group;
  const decimal = format.decimal;
  const indian = format.style === 'indian';
  const animatedProps = useAnimatedProps(() => {
    return { text: frameText(progress.get(), decimals, group, decimal, indian) } as object;
  });

  const digitStyle: TextStyle = {
    ...figureFont(),
    color: color ?? colors.text,
    fontSize,
    lineHeight: Math.round(fontSize * 1.15),
    letterSpacing: 0,
    includeFontPadding: false,
  };
  // The currency sign and the unit: the text face (picked by what the words
  // hold, so "लाख" is set in Anek Devanagari), soft ink, small, and lifted or
  // lowered so they stand on the digits' baseline.
  const besideSize = Math.max(14, Math.round(fontSize * 0.42));
  const besideStyle = (words: string): TextStyle => ({
    ...textFont('500', language, words),
    color: unitColor ?? colors.textSecondary,
    fontSize: besideSize,
    includeFontPadding: false,
    marginBottom: Math.round(fontSize * DIGIT_BASELINE - besideSize * (hasDevanagari(words) ? DEVANAGARI_DESCENT : TEXT_DESCENT)),
  });
  const unit = parts.suffix.replace(/^[  ]/, '');

  return (
    <View
      style={[styles.row, align === 'center' && styles.center, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${parts.prefix}${parts.number}${parts.suffix}`}>
      {parts.prefix ? (
        <Text style={[besideStyle(parts.prefix), styles.prefix]} maxFontSizeMultiplier={1.3}>
          {parts.prefix}
        </Text>
      ) : null}
      <View>
        <Text style={[digitStyle, counting && styles.hidden]} maxFontSizeMultiplier={1.3}>
          {parts.number}
        </Text>
        {counting ? (
          <AnimatedTextInput
            editable={false}
            pointerEvents="none"
            underlineColorAndroid="transparent"
            defaultValue={frameText(0, decimals, group, decimal, indian)}
            animatedProps={animatedProps}
            maxFontSizeMultiplier={1.3}
            style={[digitStyle, styles.overlay, { textAlign: align === 'center' ? 'center' : 'left' }]}
          />
        ) : null}
      </View>
      {parts.suffix ? (
        <Text style={besideStyle(unit)} maxFontSizeMultiplier={1.3}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

// The browser preview has no layout direction on a view (and no mirrored
// layout), so the style is given to phones only.
const LEFT_TO_RIGHT = Platform.OS === 'web' ? null : ({ direction: 'ltr' } as const);

const styles = StyleSheet.create({
  // Numbers read left to right in every language, Hebrew included.
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap', ...LEFT_TO_RIGHT },
  center: { justifyContent: 'center' },
  prefix: { marginRight: -2 },
  hidden: { opacity: 0 },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, padding: 0, margin: 0 },
});
