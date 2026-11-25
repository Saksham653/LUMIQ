import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { space } from '@/theme';
import { Card } from '@/ui/card';
import type { IconName } from '@/ui/icon-set';
import { ListRow } from '@/ui/list';
import { VStack } from '@/ui/stack';
import { Tag } from '@/ui/tag';
import { Txt } from '@/ui/text';

// clear       the check found nothing.
// found       it found something; the row opens to show where.
// notChecked  there was nothing it could look at (no number columns).
export type CheckResult = 'clear' | 'found' | 'notChecked';

// One of the four checks, as a row of the "What we checked" list: what was
// checked, what it found, and its result as a tag beside it (an icon and
// words, never colour alone: a tick and "OK" when clear, a warning and "To
// fix" when something was found, a warning and "Not checked" when there was
// nothing to look at). A row that found something opens to show every place
// it was found, and how to fix it.
export function CheckRow({
  icon,
  title,
  summary,
  result,
  resultLabel,
  details,
  tip,
  seeLabel,
  hideLabel,
}: {
  icon: IconName;
  title: string;
  summary: string;
  result: CheckResult;
  resultLabel: string;
  details: string[];
  tip: string;
  seeLabel: string;
  hideLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const found = result === 'found';
  const tag = <Tag tone={result === 'clear' ? 'good' : 'warn'} label={resultLabel} />;

  if (!found) {
    return (
      <ListRow
        icon={icon}
        title={title}
        subtitle={summary}
        trailing={tag}
        accessible
        accessibilityLabel={`${title}. ${resultLabel}. ${summary}`}
      />
    );
  }

  // A pressable row is read as one thing, so what it shows when open is read
  // with it.
  const spoken = [title, resultLabel, summary, ...(open ? [...details, tip] : [])].join('. ');

  return (
    <ListRow
      icon={icon}
      title={title}
      subtitle={summary}
      trailing={tag}
      onPress={() => setOpen((now) => !now)}
      aria-expanded={open}
      accessibilityLabel={spoken}
      style={open ? styles.open : undefined}>
      <VStack gap="sm" style={styles.more}>
        {open ? (
          <Card variant="sunk" size="sm" style={styles.details}>
            {details.map((line, index) => (
              <Txt key={index} variant="small">
                {line}
              </Txt>
            ))}
            <Txt variant="small" tone="soft">
              {tip}
            </Txt>
          </Card>
        ) : null}
        <Txt variant="small" tone="action" weight="600">
          {open ? hideLabel : seeLabel}
        </Txt>
      </VStack>
    </ListRow>
  );
}

const styles = StyleSheet.create({
  // Open, the row is tall: its icon stays beside the title instead of
  // sinking to the middle.
  open: { alignItems: 'flex-start', paddingVertical: space.sm },
  more: { paddingTop: space.xs },
  details: { gap: space.xs },
});
