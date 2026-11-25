import { StyleSheet, View } from 'react-native';

import { useLocalT } from '@/i18n/local';
import { useNumbers } from '@/state/app-state';
import { border, radius, sizes, space, useTheme } from '@/theme';
import { Card } from '@/ui/card';
import { select } from '@/ui/haptics';
import { Icon } from '@/ui/icon';
import { Press } from '@/ui/press';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

import type { DateDecision, NumberDecision } from '@/data/import-file';

import { IMPORT_STRINGS } from './strings';

type Choice = { value: string; title: string; reading: string | null };

// The two readings side by side: the chosen one filled with the action blue
// and marked with a check (never colour alone), the other on paper. Each
// says the rule in words and what the file's own cell becomes under it.
function Choices({
  label,
  choices,
  value,
  disabled,
  onChange,
}: {
  label: string;
  choices: [Choice, Choice];
  value: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choices}>
      {choices.map((choice) => {
        const chosen = choice.value === value;
        // While the file is read again: plain paper, a chosen tile keeping a
        // faint ring so chosen is still told by form.
        const fill = disabled ? colors.disabledFill : chosen ? colors.action : colors.surface;
        const edge = disabled ? (chosen ? colors.disabledInk : colors.disabledFill) : chosen ? colors.action : colors.inkFaint;
        const ink = disabled ? colors.disabledInk : chosen ? colors.onAction : colors.ink;
        const soft = disabled ? colors.disabledInk : chosen ? colors.onAction : colors.inkSoft;
        return (
          <Press
            key={choice.value}
            weight="lg"
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen, disabled }}
            accessibilityLabel={choice.reading ? `${choice.title}. ${choice.reading}` : choice.title}
            disabled={disabled}
            onPress={() => {
              if (chosen) return;
              select();
              onChange(choice.value);
            }}
            style={[styles.choice, { backgroundColor: fill, borderColor: edge }]}>
            <HStack gap="sm" align="start">
              <View style={styles.mark}>
                {chosen ? (
                  <Icon name="check" size={sizes.iconSmall} color={ink} />
                ) : (
                  <View style={[styles.ring, { borderColor: disabled ? colors.disabledInk : colors.inkFaint }]} />
                )}
              </View>
              <VStack gap="xs" style={styles.grow}>
                <Txt variant="label" weight="600" color={ink}>
                  {choice.title}
                </Txt>
                {choice.reading ? (
                  <Txt variant="small" color={soft}>
                    {choice.reading}
                  </Txt>
                ) : null}
              </VStack>
            </HStack>
          </Press>
        );
      })}
    </View>
  );
}

// "1,5 means one and a half" against "1,5 means fifteen", with the file's
// own cell. `value` is the decimal mark the column is read with now.
export function DecimalQuestion({
  column,
  sample,
  examples,
  value,
  disabled,
  onChange,
}: {
  column: string;
  sample: NumberDecision['sample'];
  examples: string[];
  value: '.' | ',' | null;
  disabled: boolean;
  onChange: (decimal: '.' | ',') => void;
}) {
  const lt = useLocalT(IMPORT_STRINGS);
  const numbers = useNumbers();
  const raw = sample?.raw ?? examples[0] ?? '';
  const mark = sample?.mark ?? (raw.includes(',') ? ',' : '.');
  const read = (n: number | undefined) => (sample && n !== undefined ? lt('readAs', { value: raw, reading: numbers.number(n, 4) }) : null);
  const asComma: Choice = {
    value: ',',
    title: mark === ',' ? lt('commaDecimal') : lt('dotThousands'),
    reading: read(sample?.asComma),
  };
  const asDot: Choice = {
    value: '.',
    title: mark === ',' ? (sample?.commaIgnored ? lt('commaIgnored') : lt('commaThousands')) : lt('dotDecimal'),
    reading: read(sample?.asDot),
  };
  // The reading where the mark in the cell is a decimal mark comes first.
  const choices: [Choice, Choice] = mark === ',' ? [asComma, asDot] : [asDot, asComma];
  const question = lt('decimalQuestion', { column, value: raw });
  return (
    <Card>
      <VStack gap="md">
        <Txt variant="label" weight="600">
          {question}
        </Txt>
        <Choices label={question} choices={choices} value={value} disabled={disabled} onChange={(v) => onChange(v === ',' ? ',' : '.')} />
      </VStack>
    </Card>
  );
}

// ISO "2024-01-05" as a timestamp at local midnight, for numbers.date.
function localDay(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

// "05/01/2024 is 5 January" against "May 1", with the file's own cell.
// `value` is the order the column is read with now, or null while nothing
// is chosen (the dates stay as written).
export function DateQuestion({
  column,
  sample,
  examples,
  value,
  disabled,
  onChange,
}: {
  column: string;
  sample: DateDecision['sample'];
  examples: string[];
  value: 'dmy' | 'mdy' | null;
  disabled: boolean;
  onChange: (order: 'dmy' | 'mdy') => void;
}) {
  const lt = useLocalT(IMPORT_STRINGS);
  const numbers = useNumbers();
  const raw = sample?.raw ?? examples[0] ?? '';
  const read = (iso: string | null | undefined) => {
    const day = localDay(iso ?? null);
    return day === null ? null : lt('readAs', { value: raw, reading: numbers.date(day) });
  };
  const choices: [Choice, Choice] = [
    { value: 'dmy', title: lt('dayFirst'), reading: read(sample?.dmy) },
    { value: 'mdy', title: lt('monthFirst'), reading: read(sample?.mdy) },
  ];
  const question = lt('dateQuestion', { column, value: raw });
  return (
    <Card>
      <VStack gap="md">
        <Txt variant="label" weight="600">
          {question}
        </Txt>
        <Choices label={question} choices={choices} value={value} disabled={disabled} onChange={(v) => onChange(v === 'mdy' ? 'mdy' : 'dmy')} />
        {value === null ? (
          <Txt variant="small" tone="soft">
            {lt('dateWaiting')}
          </Txt>
        ) : null}
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Side by side on a phone; one under the other when the text is large.
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: sizes.row,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderRadius: radius.control,
    borderWidth: border.control,
  },
  mark: { paddingTop: 2, width: sizes.iconSmall, alignItems: 'center' },
  // The empty mark of a choice not taken, as a radio button draws it.
  ring: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: border.control },
  grow: { flex: 1 },
});
