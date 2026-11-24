import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChartBar } from '@/utils/chart';

// A horizontal bar chart: label, bar, value on every row. On a phone this
// keeps long names and the numbers readable, unlike thin vertical bars.
// The biggest bar is gold; every row reads out as "label: value".
export function HBarChart({ bars, formatValue }: { bars: ChartBar[]; formatValue: (value: number) => string }) {
  const colors = useTheme();
  const largest = Math.max(...bars.map((bar) => Math.abs(bar.value)), 0) || 1;
  const peakIndex = bars.reduce((best, bar, index) => (bar.value > bars[best].value ? index : best), 0);

  return (
    <View style={styles.chart}>
      {bars.map((bar, index) => {
        const peak = index === peakIndex;
        const width = `${Math.max(2, (Math.abs(bar.value) / largest) * 100)}%` as const;
        return (
          <View
            key={`${bar.label}-${index}`}
            style={styles.row}
            accessible
            accessibilityLabel={`${bar.label}: ${formatValue(bar.value)}`}>
            <AppText variant="small" tone="secondary" numberOfLines={1} style={styles.label}>
              {bar.label}
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View style={[styles.fill, { width, backgroundColor: peak ? colors.accent : colors.primary }]} />
            </View>
            <AppText variant="small" numberOfLines={1} style={[styles.value, peak && styles.peakValue]}>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 28 },
  label: { width: 84 },
  track: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7 },
  value: { width: 92, textAlign: 'right' },
  peakValue: { fontWeight: '700' },
});
