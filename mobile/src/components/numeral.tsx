import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EASE_OUT } from '@/constants/motion';
import { Motion, Numeral as NumeralSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NumberFormat } from '@/utils/format';

export type NumeralParts = { prefix: string; number: string; suffix: string; rtl?: boolean };

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

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

// A big confident number: currency and digits in bold tabular figures, the
// unit beside them lighter and smaller ("4.68" + "M", "₹46.8" + "lakh").
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
    color: color ?? colors.text,
    fontSize,
    lineHeight: Math.round(fontSize * 1.15),
    fontWeight: '800',
    letterSpacing: -0.02 * fontSize,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  };
  const unitStyle: TextStyle = {
    color: unitColor ?? colors.textSecondary,
    fontSize: Math.max(14, Math.round(fontSize * 0.42)),
    fontWeight: '500',
    marginBottom: Math.round(fontSize * 0.12),
  };

  return (
    <View
      style={[styles.row, align === 'center' && styles.center, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${parts.prefix}${parts.number}${parts.suffix}`}>
      {parts.prefix ? <Text style={[digitStyle, styles.prefix]}>{parts.prefix}</Text> : null}
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
        <Text style={unitStyle} maxFontSizeMultiplier={1.3}>
          {parts.suffix.replace(/^[  ]/, '')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Numbers read left to right in every language, Hebrew included.
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, direction: 'ltr', flexWrap: 'wrap' },
  center: { justifyContent: 'center' },
  prefix: { marginRight: -2 },
  hidden: { opacity: 0 },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, padding: 0, margin: 0 },
});
