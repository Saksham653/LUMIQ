import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One big number with what it is and a plain line on how it was worked out.
export function KpiCard({ label, value, note, highlight = false }: { label: string; value: string; note: string; highlight?: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: highlight ? colors.accent : colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${value}. ${note}`}>
      <AppText variant="small" tone="secondary">
        {label}
      </AppText>
      <AppText variant="title" tone={highlight ? 'accent' : 'default'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </AppText>
      {note ? (
        <AppText variant="small" tone="secondary">
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: '46%', flexGrow: 1, gap: 2, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
});
