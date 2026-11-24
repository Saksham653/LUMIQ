import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The answer to the what-if, in words first, then two bars: now and after.
export function ResultCard({
  title,
  headline,
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
  headline: string;
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
  const afterColor = after > before ? colors.primary : after < before ? colors.accent : colors.textSecondary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} accessible>
      <AppText variant="label" tone="secondary">
        {title}
      </AppText>
      <AppText variant="heading" style={styles.headline}>
        {headline}
      </AppText>
      <AppText>{detail}</AppText>
      {groupLine ? (
        <AppText variant="small" tone="secondary">
          {groupLine}
        </AppText>
      ) : null}

      <View style={[styles.bars, { backgroundColor: colors.background }]}>
        <Bar label={nowLabel} valueText={beforeText} width={share(before)} color={colors.textSecondary} track={colors.border} />
        <Bar label={afterLabel} valueText={afterText} width={share(after)} color={afterColor} track={colors.border} strong />
      </View>
    </View>
  );
}

function Bar({
  label,
  valueText,
  width,
  color,
  track,
  strong,
}: {
  label: string;
  valueText: string;
  width: `${number}%`;
  color: string;
  track: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.barBlock}>
      <View style={styles.barLabels}>
        <AppText variant="small" style={[styles.flex, strong && styles.bold]}>
          {label}
        </AppText>
        <AppText variant="small" style={[strong && styles.bold, strong && { color }]}>
          {valueText}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: track }]}>
        <View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  headline: { fontSize: 22, lineHeight: 30 },
  bars: { gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md },
  barBlock: { gap: Spacing.xs },
  barLabels: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  track: { height: 14, borderRadius: 7, overflow: 'hidden' },
  fill: { height: 14, borderRadius: 7 },
});
