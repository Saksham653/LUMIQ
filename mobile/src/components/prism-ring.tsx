import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Numeral } from '@/components/numeral';
import { EASE_OUT } from '@/constants/motion';
import { Motion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NumberFormat } from '@/utils/format';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The File check score: a ring drawn in the prism gradient to the score, with
// the number in the middle. With `reveal`, the ring draws (900 ms, ease-out)
// while the number counts up in step; with reduced motion, or on a later
// visit, both are simply there.
export function PrismRing({
  score,
  outOf,
  format,
  reveal,
  size = 200,
  stroke = 8,
}: {
  score: number;
  outOf: string;
  format: NumberFormat;
  reveal: boolean;
  size?: number;
  stroke?: number;
}) {
  const colors = useTheme();
  const reduced = useReducedMotion();
  const animate = reveal && !reduced;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(100, score)) / 100;
  const progress = useSharedValue(animate ? 0 : target);

  useEffect(() => {
    if (animate) progress.set(withTiming(target, { duration: Motion.reveal, easing: EASE_OUT }));
    else progress.set(target);
  }, [animate, target, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${score} ${outOf}`}>
      {/* Starts at 12 o'clock and runs clockwise. */}
      <Svg width={size} height={size} style={styles.rotate}>
        <Defs>
          <LinearGradient id="prism-ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.prism[0]} />
            <Stop offset="0.55" stopColor={colors.prism[1]} />
            <Stop offset="1" stopColor={colors.prism[2]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surfaceVariant} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#prism-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.middle} pointerEvents="none">
        <Numeral
          parts={{ prefix: '', number: String(score), suffix: '' }}
          format={format}
          size="score"
          align="center"
          countUp={animate}
          duration={Motion.reveal}
        />
        <AppText variant="small" tone="secondary" style={styles.outOf}>
          {outOf}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  middle: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  outOf: { textAlign: 'center', alignSelf: 'stretch' },
});
