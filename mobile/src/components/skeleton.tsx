import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A placeholder block in the final layout, for waits longer than 300 ms. It
// breathes gently (opacity only); with reduced motion it stays still.
export function SkeletonBlock({ width = '100%', height = 16, radius = 8 }: { width?: DimensionValue; height?: number; radius?: number }) {
  const colors = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceVariant },
        reduced
          ? null
          : {
              animationName: { '0%': { opacity: 1 }, '50%': { opacity: 0.45 }, '100%': { opacity: 1 } },
              animationDuration: '1400ms',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            },
      ]}
    />
  );
}

// The shape of an answer that is on its way: a label and three lines.
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.lines}>
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBlock key={index} width={index === lines - 1 ? '62%' : '100%'} height={14} radius={Radius.md / 2} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lines: { gap: Spacing.sm },
});
