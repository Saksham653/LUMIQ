import { StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import type { ColumnKind } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

const TYPE_ICON: Record<ColumnKind, IconName> = {
  number: { ios: 'number', android: 'numbers' },
  money: { ios: 'banknote', android: 'payments' },
  percent: { ios: 'percent', android: 'percent' },
  date: { ios: 'calendar', android: 'calendar_month' },
  text: { ios: 'textformat', android: 'text_fields' },
};

// One column as LUMIQ read it: its type and a one-line summary of its values.
export function ColumnCard({
  name,
  type,
  typeLabel,
  summary,
  note,
}: {
  name: string;
  type: ColumnKind;
  typeLabel: string;
  summary: string;
  note: string | null;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} accessible>
      <View style={[styles.icon, { backgroundColor: colors.primaryContainer }]}>
        <AppIcon name={TYPE_ICON[type]} size={22} color={colors.onPrimaryContainer} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="label" style={styles.name}>
            {name}
          </AppText>
          <View style={[styles.type, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <AppText variant="small" snug tone="secondary">
              {typeLabel}
            </AppText>
          </View>
        </View>
        <AppText variant="small" tone="secondary">
          {summary}
        </AppText>
        {note ? (
          <AppText variant="small" tone="accent">
            {note}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  // Grows into the free space so Android never measures it too narrow.
  name: { flexGrow: 1, flexShrink: 1 },
  type: { paddingHorizontal: Spacing.sm, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth },
});
