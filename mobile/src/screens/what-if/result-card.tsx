import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Numeral, type NumeralParts } from '@/components/numeral';
import { CSS_EASE_OUT } from '@/constants/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NumberFormat } from '@/utils/format';

const UPDATE = 200;

// The answer to the what-if: the value after the change as a big numeral,
// the difference in words, then two bars, now and after. When the change
// moves, the bars slide to their new length (200 ms).
export function ResultCard({
  title,
  label,
  parts,
  format,
  detail,
  groupLine,
  nowLabel,
  afterLabel,
  before,
  after,
  beforeText,
  afterText,
}: {
  title: string;
  label: string;
  parts: NumeralParts;
  format: NumberFormat;
  detail: string;
  groupLine: string | null;
  nowLabel: string;
  afterLabel: string;
  before: number;
  after: number;
  beforeText: string;
  afterText: string;
}) {
  const colors = useTheme();
  const largest = Math.max(Math.abs(before), Math.abs(after), Number.EPSILON);
  const share = (value: number) => `${Math.max(Math.min(Math.abs(value) / largest, 1), 0.02) * 100}%` as const;
  const afterColor = after < before ? colors.accent : colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} accessible accessibilityLabel={`${label}: ${afterText}. ${detail}`}>
      <AppText variant="small" tone="secondary" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="label">{label}</AppText>
      <Numeral parts={parts} format={format} size="hero" />
      <AppText>{detail}</AppText>
      {groupLine ? (
        <AppText variant="small" tone="secondary">
          {groupLine}
        </AppText>
      ) : null}

      <View style={styles.bars}>
        <Bar label={nowLabel} valueText={beforeText} width={share(before)} color={colors.textTertiary} />
        <Bar label={afterLabel} valueText={afterText} width={share(after)} color={afterColor} strong />
      </View>
    </View>
  );
}

function Bar({
  label,
  valueText,
  width,
  color,
  strong,
}: {
  label: string;
  valueText: string;
  width: `${number}%`;
  color: string;
  strong?: boolean;
}) {
  const colors = useTheme();
  return (
    <View style={styles.barBlock}>
      <View style={styles.barLabels}>
        <AppText variant="small" style={[styles.flex, strong && styles.bold]}>
          {label}
        </AppText>
        <AppText variant="small" style={[styles.value, strong && styles.bold]}>
          {valueText}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
        {/* Absolutely placed and childless: allowed to animate its width. */}
        <Animated.View
          style={[
            styles.fill,
            {
              width,
              backgroundColor: color,
              transitionProperty: ['width', 'backgroundColor'],
              transitionDuration: UPDATE,
              transitionTimingFunction: CSS_EASE_OUT,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, padding: Spacing.xl, borderRadius: Radius.xxl },
  title: { fontWeight: '600' },
  bars: { gap: Spacing.md, marginTop: Spacing.md },
  barBlock: { gap: Spacing.xs },
  barLabels: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  value: { fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700' },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { position: 'absolute', start: 0, top: 0, bottom: 0, borderRadius: 6 },
});
