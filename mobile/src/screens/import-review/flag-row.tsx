import { StyleSheet, View } from 'react-native';

import { useLocalT } from '@/i18n/local';
import { useNumbers } from '@/state/app-state';
import { radius, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { HStack, VStack } from '@/ui/stack';
import { Tag } from '@/ui/tag';
import { Txt } from '@/ui/text';

import type { RowFlag } from '@/data/import-file';

import { IMPORT_STRINGS } from './strings';

// One row that looks wrong: what it is, its own cells so it can be found in
// the file, and whether it is left out. A total row or repeated headings are
// left out unless the person keeps them; a row with a blank key cell stays.
export function FlagRow({ flag, disabled, onToggleKeep }: { flag: RowFlag; disabled: boolean; onToggleKeep: () => void }) {
  const { colors } = useTheme();
  const lt = useLocalT(IMPORT_STRINGS);
  const numbers = useNumbers();
  const row = numbers.count(flag.row);
  const title =
    flag.reason === 'total-row'
      ? lt('rowTotal', { row })
      : flag.reason === 'repeated-header'
        ? lt('rowRepeat', { row })
        : lt('rowBlankKey', { row, column: flag.column ?? '' });
  const note = flag.reason === 'total-row' ? lt('rowTotalNote') : flag.reason === 'blank-key' ? lt('rowBlankKeyNote') : null;
  const canKeep = flag.reason !== 'blank-key';

  return (
    <VStack gap="sm">
      <HStack gap="sm" align="start">
        <Icon name={flag.reason === 'blank-key' ? 'info' : 'warning'} size={20} color={colors.inkSoft} />
        <VStack gap="xs" style={styles.grow}>
          <Txt variant="label" weight="600">
            {title}
          </Txt>
          {note ? (
            <Txt variant="small" tone="soft">
              {note}
            </Txt>
          ) : null}
        </VStack>
      </HStack>
      {flag.cells.length > 0 ? (
        // The row's own cells, as written, kept left to right like the file.
        <View style={[styles.cells, { backgroundColor: colors.surfaceSunk }]}>
          <Txt variant="small" tone="soft" numberOfLines={2}>
            {flag.cells.join('  ·  ')}
          </Txt>
        </View>
      ) : null}
      {canKeep ? (
        <HStack gap="md" justify="between" wrap>
          <Tag tone={flag.drop ? 'neutral' : 'action'} icon={flag.drop ? 'close' : 'check'} label={flag.drop ? lt('leftOut') : lt('kept')} />
          <Button variant="plain" size="sm" label={flag.drop ? lt('keepRow') : lt('leaveOut')} disabled={disabled} onPress={onToggleKeep} />
        </HStack>
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  cells: { borderRadius: radius.control, paddingHorizontal: space.md, paddingVertical: space.sm },
});
