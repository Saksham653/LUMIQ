import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Numeral, type NumeralParts } from '@/components/numeral';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { NumberFormat } from '@/utils/format';

// One big number with what it is and a plain line on how it was worked out,
// on a card (paper with a thin edge). Every number is in ink: these are
// numbers the phone worked out, so none carries a colour. `highlight` (the
// highest value) is kept for callers and no longer changes the colour. The
// number counts up once, the first time this file is seen in a session.
export function KpiCard({
  label,
  parts,
  format,
  note,
  countUp = false,
}: {
  label: string;
  parts: NumeralParts;
  format: NumberFormat;
  note: string;
  highlight?: boolean;
  countUp?: boolean;
}) {
  const colors = useTheme();
  const spoken = `${parts.prefix}${parts.number}${parts.suffix}`;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${spoken}. ${note}`}>
      <AppText variant="small" tone="secondary">
        {label}
      </AppText>
      <Numeral parts={parts} format={format} size="large" countUp={countUp} />
      {note ? (
        <AppText variant="small" tone="secondary">
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '46%', flexGrow: 1, gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.xxl, borderWidth: 1 },
});
