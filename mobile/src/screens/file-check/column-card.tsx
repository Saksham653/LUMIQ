import { StyleSheet } from 'react-native';

import type { ColumnKind } from '@/data/types';
import { space } from '@/theme';
import type { IconName } from '@/ui/icon-set';
import { ListRow } from '@/ui/list';
import { Tag } from '@/ui/tag';

const TYPE_ICON: Record<ColumnKind, IconName> = {
  number: 'numbers',
  money: 'currency',
  percent: 'numbers',
  date: 'calendar',
  text: 'column',
};

// One column as LUMIQ read it, as a row of the "Your columns" list: its
// name, a one-line summary of its values, its kind (the icon and the word at
// the row's end), and how many of its cells are empty (a warning tag: an
// icon and the count in words), read as one line by a screen reader.
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
      icon={TYPE_ICON[type]}
      title={name}
      subtitle={summary}
      trailing={typeLabel}
      accessible
      accessibilityLabel={`${name}, ${typeLabel}. ${summary}${note ? `. ${note}` : ''}`}>
      {note ? <Tag tone="warn" label={note} style={styles.note} /> : null}
    </ListRow>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: space.xs },
});
