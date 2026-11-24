import { Pressable, StyleSheet } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { IconCircle, ListRow } from '@/components/grouped';
import { TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One of the user's own files as a row: tap to open it, or the bin to
// delete it. The open file shows a check.
export function MyFileRow({
  name,
  meta,
  selected,
  selectedLabel,
  deleteLabel,
  onOpen,
  onDelete,
}: {
  name: string;
  meta: string;
  selected: boolean;
  selectedLabel: string;
  deleteLabel: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const colors = useTheme();
  return (
    <ListRow
      onPress={onOpen}
      accessibilityLabel={`${name}. ${meta}${selected ? `. ${selectedLabel}` : ''}`}
      accessibilityState={{ selected }}
      icon={
        <IconCircle
          icon={selected ? { ios: 'checkmark', android: 'check' } : { ios: 'tablecells', android: 'table_chart' }}
          color={selected ? colors.onSuccess : colors.textSecondary}
          background={selected ? colors.success : undefined}
        />
      }
      title={name}
      subtitle={meta}
      trailing={
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          hitSlop={8}
          style={styles.delete}>
          <AppIcon name={{ ios: 'trash', android: 'delete_outline' }} size={22} color={colors.textTertiary} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  delete: { width: TouchTarget - 8, height: TouchTarget - 8, alignItems: 'center', justifyContent: 'center' },
});
