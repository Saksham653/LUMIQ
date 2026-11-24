import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { CSS_EASE_OUT } from '@/constants/motion';
import { Motion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChartBar } from '@/utils/chart';

const GROW = 350;

// A horizontal bar chart: label, bar, value on every row. On a phone this
// keeps long names and the numbers readable, unlike thin vertical bars.
// The biggest bar is amber; every row reads out as "label: value".
// With `animate` (a new file or a new column), the bars grow from the start
// edge one after another (25 ms apart, 350 ms each) and the biggest turns
// amber as it lands. Right-to-left languages grow them from the right.
export function HBarChart({
  bars,
  formatValue,
  animate = false,
}: {
  bars: ChartBar[];
  formatValue: (value: number) => string;
  animate?: boolean;
}) {
  const colors = useTheme();
  const reduced = useReducedMotion();
  const grow = animate && !reduced;
  const largest = Math.max(...bars.map((bar) => Math.abs(bar.value)), 0) || 1;
  const peakIndex = bars.reduce((best, bar, index) => (bar.value > bars[best].value ? index : best), 0);

  return (
    <View style={styles.chart}>
      {bars.map((bar, index) => {
        const peak = index === peakIndex;
        const width = `${Math.max(2, (Math.abs(bar.value) / largest) * 100)}%` as const;
        const fill = peak ? colors.accent : colors.primary;
        return (
          <View
            key={`${bar.label}-${index}`}
            style={styles.row}
            accessible
            accessibilityLabel={`${bar.label}: ${formatValue(bar.value)}`}>
            <AppText variant="small" tone={peak ? 'accent' : 'secondary'} numberOfLines={1} style={[styles.label, peak && styles.peak]}>
              {bar.label}
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
              {/* An absolutely placed fill with no children: the one element
                  allowed to animate its width (corners stay round). */}
              <Animated.View
                style={[
                  styles.fill,
                  { width, backgroundColor: fill },
                  grow
                    ? {
                        animationName: peak
                          ? {
                              '0%': { width: '0%', backgroundColor: colors.primary },
                              '80%': { backgroundColor: colors.primary },
                              '100%': { width, backgroundColor: colors.accent },
                            }
                          : { from: { width: '0%' }, to: { width } },
                        animationDuration: GROW,
                        animationDelay: index * Motion.stagger,
                        animationTimingFunction: CSS_EASE_OUT,
                        animationFillMode: 'both',
                      }
                    : null,
                ]}
              />
            </View>
            <AppText variant="small" numberOfLines={1} style={[styles.value, peak && styles.peak, peak && { color: colors.accent }]}>
              {formatValue(bar.value)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 28 },
  label: { width: 72 },
  track: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { position: 'absolute', start: 0, top: 0, bottom: 0, borderRadius: 6 },
  value: { minWidth: 76, textAlign: 'right', fontVariant: ['tabular-nums'] },
  peak: { fontWeight: '700' },
});
