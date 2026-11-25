import { Platform, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { PrismRing } from '@/components/prism-ring';
import { Numeral, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NumberFormat } from '@/utils/format';

export type ScoreTerm = { value: string; label: string };

// The File check score: the ring drawn in the prism gradient, then the score
// as a plain sum so every lost point shows (100 − 2 = 98), a small verified
// mark saying it was checked on the phone, and one sentence on what it means.
export function ScoreSummary({
  score,
  format,
  reveal,
  outOf,
  start,
  deductions,
  total,
  checkedLine,
  sentence,
  spoken,
}: {
  score: number;
  format: NumberFormat;
  reveal: boolean;
  outOf: string;
  start: ScoreTerm;
  deductions: ScoreTerm[];
  total: ScoreTerm;
  checkedLine: string;
  sentence: string;
  spoken: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.wrap} accessible accessibilityLabel={spoken}>
      <PrismRing score={score} outOf={outOf} format={format} reveal={reveal} />
      {deductions.length > 0 ? (
        // A sum reads left to right in every language.
        <View style={styles.sum}>
          <Term term={start} />
          {deductions.map((term, index) => (
            <View key={index} style={styles.pair}>
              <Text style={[styles.operator, { color: colors.textTertiary }]}>−</Text>
              <Term term={term} tone={colors.accent} />
            </View>
          ))}
          <View style={styles.pair}>
            <Text style={[styles.operator, { color: colors.textTertiary }]}>=</Text>
            <Term term={total} strong />
          </View>
        </View>
      ) : null}
      <View style={styles.checked}>
        <View style={[styles.checkDot, { backgroundColor: colors.success }]}>
          <AppIcon name={{ ios: 'checkmark', android: 'check' }} size={11} color={colors.onSuccess} />
        </View>
        <AppText variant="small" tone="secondary" style={styles.flexText}>
          {checkedLine}
        </AppText>
      </View>
      <AppText variant="heading" style={styles.center}>
        {sentence}
      </AppText>
    </View>
  );
}

function Term({ term, tone, strong }: { term: ScoreTerm; tone?: string; strong?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.term}>
      <Text style={[styles.termValue, { color: tone ?? colors.text, fontWeight: strong ? '800' : '700' }]} maxFontSizeMultiplier={1.3}>
        {term.value}
      </Text>
      <AppText variant="small" tone="secondary" style={styles.termLabel}>
        {term.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.sm },
  // The sum reads left to right in every language. The browser preview has
  // no layout direction on a view, so the style is given to phones only.
  sum: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
    ...(Platform.OS === 'web' ? null : ({ direction: 'ltr' } as const)),
  },
  pair: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  operator: { fontSize: Numeral.medium, lineHeight: Math.round(Numeral.medium * 1.2), fontWeight: '400' },
  term: { alignItems: 'center', maxWidth: 120 },
  termValue: {
    fontSize: Numeral.medium,
    lineHeight: Math.round(Numeral.medium * 1.2),
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  termLabel: { textAlign: 'center', alignSelf: 'stretch' },
  checked: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center' },
  checkDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  flexText: { flexShrink: 1, textAlign: 'center' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
});
