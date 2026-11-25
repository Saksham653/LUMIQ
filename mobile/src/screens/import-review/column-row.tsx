import { StyleSheet } from 'react-native';

import { useLocalT } from '@/i18n/local';
import { useNumbers } from '@/state/app-state';
import { Chip, ChipGroup } from '@/ui/chip';
import { Tag } from '@/ui/tag';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

import type { ColumnDecision } from '@/data/import-file';
import type { ColumnKind } from '@/data/types';

import { IMPORT_STRINGS, type ImportStringKey } from './strings';

export const COLUMN_KINDS: readonly ColumnKind[] = ['number', 'money', 'percent', 'date', 'text'];

export const KIND_WORD: Record<ColumnKind, ImportStringKey> = {
  number: 'typeNumber',
  money: 'typeMoney',
  percent: 'typePercent',
  date: 'typeDate',
  text: 'typeText',
};

const NUMERIC: readonly ColumnKind[] = ['number', 'money', 'percent'];

// One column: its name, two of its own cells, and a chip with what it holds.
// Tapping the chip shows the five kinds to choose from. A column LUMIQ is
// unsure about says so in words and with an icon.
export function ColumnRow({
  info,
  open,
  disabled,
  onToggle,
  onChange,
}: {
  info: ColumnDecision;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChange: (kind: ColumnKind) => void;
}) {
  const lt = useLocalT(IMPORT_STRINGS);
  const numbers = useNumbers();
  const kindWord = lt(KIND_WORD[info.type] ?? 'typeText');
  const examples = info.examples.slice(0, 2);
  const { unreadable, odd } = info.counts;
  const numeric = NUMERIC.includes(info.type);

  let note: string | null = null;
  if (numeric && unreadable > 0) note = unreadable === 1 ? lt('notNumbersOne') : lt('notNumbers', { count: numbers.count(unreadable) });
  else if (info.type === 'date' && unreadable > 0) note = unreadable === 1 ? lt('notDatesOne') : lt('notDates', { count: numbers.count(unreadable) });

  return (
    <VStack gap="sm">
      <HStack gap="md" justify="between" wrap>
        <VStack gap="xs" style={styles.words}>
          <HStack gap="sm" wrap>
            <Txt variant="label" weight="600">
              {info.column}
            </Txt>
            {info.ambiguous ? <Tag tone="warn" icon="warning" label={lt('unsure')} /> : null}
          </HStack>
          <Txt variant="small" tone="soft" numberOfLines={2}>
            {examples.length > 0 ? lt('examples', { values: examples.join(' · ') }) : lt('noExamples')}
          </Txt>
        </VStack>
        <Chip
          label={kindWord}
          disabled={disabled}
          onPress={onToggle}
          accessibilityLabel={lt('typeOf', { column: info.column, type: kindWord })}
          accessibilityState={{ expanded: open, disabled }}
        />
      </HStack>
      {open ? (
        <ChipGroup<ColumnKind> wrap value={info.type} onChange={onChange} disabled={disabled} accessibilityLabel={info.column}>
          {COLUMN_KINDS.map((kind) => (
            <Chip key={kind} value={kind} label={lt(KIND_WORD[kind])} />
          ))}
        </ChipGroup>
      ) : null}
      {note ? (
        <Txt variant="small" tone="soft">
          {note}
        </Txt>
      ) : null}
      {numeric && odd > 0 ? (
        <Txt variant="small" tone="soft">
          {lt('otherWay', { count: numbers.count(odd) })}
        </Txt>
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  // The name and examples take the row; the chip wraps under them when the
  // text is large.
  words: { flex: 1, minWidth: 160 },
});
