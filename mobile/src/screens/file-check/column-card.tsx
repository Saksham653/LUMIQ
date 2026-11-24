import { StyleSheet, View } from 'react-native';

import { type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { IconCircle, ListRow, Tag } from '@/components/grouped';
import { Spacing } from '@/constants/theme';
import type { ColumnKind } from '@/data/types';

const TYPE_ICON: Record<ColumnKind, IconName> = {
  number: { ios: 'number', android: 'numbers' },
  money: { ios: 'banknote', android: 'payments' },
  percent: { ios: 'percent', android: 'percent' },
  date: { ios: 'calendar', android: 'calendar_month' },
  text: { ios: 'textformat', android: 'text_fields' },
};

// One column as LUMIQ read it, as a row of the "Your columns" group: its
// type and a one-line summary of its values; empty cells in amber.
export function ColumnRow({
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
  return (
    <ListRow
      accessibilityLabel={`${name}, ${typeLabel}. ${summary}${note ? `. ${note}` : ''}`}
      icon={<IconCircle icon={TYPE_ICON[type]} size={36} />}
      title={
        <View style={styles.titleRow}>
          {/* Grows into the free space so Android never measures it too narrow. */}
          <AppText variant="label" style={styles.name}>
            {name}
          </AppText>
          <Tag label={typeLabel} />
        </View>
      }
      subtitle={summary}
      detail={
        note ? (
          <AppText variant="small" tone="accent">
            {note}
          </AppText>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  name: { flexGrow: 1, flexShrink: 1 },
});
