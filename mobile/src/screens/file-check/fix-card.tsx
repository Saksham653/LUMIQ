import { StyleSheet } from 'react-native';

import { space } from '@/theme';
import { Card } from '@/ui/card';
import { HStack } from '@/ui/stack';
import { Tag } from '@/ui/tag';
import { Txt } from '@/ui/text';

// One thing worth fixing, already worded in the app's language.
export type FixItem = {
  key: string;
  // What it is: "Empty cells in Region".
  title: string;
  // The points it costs: "−4 points".
  points: string;
  // What was found and why it matters.
  reason: string;
  // The rows or values that show it: "Rows: 3, 7, 9", "Row 12: 99,999".
  evidence: string[];
  // How to fix it.
  tip: string;
};

// One of the things most worth fixing, as a card: what it is with the points
// it costs (a tag: an icon and words, never colour alone), why it matters,
// the rows or values that show it in a sunk well, and how to fix it.
export function FixCard({ item }: { item: FixItem }) {
  return (
    <Card style={styles.card}>
      <HStack gap="sm" justify="between" align="start" wrap>
        <Txt variant="label" accessibilityRole="header" style={styles.title}>
          {item.title}
        </Txt>
        <Tag tone="warn" label={item.points} />
      </HStack>
      <Txt>{item.reason}</Txt>
      {item.evidence.length > 0 ? (
        <Card variant="sunk" size="sm" style={styles.evidence}>
          {item.evidence.map((line, index) => (
            <Txt key={index} variant="small" selectable>
              {line}
            </Txt>
          ))}
        </Card>
      ) : null}
      <Txt variant="small" tone="soft">
        {item.tip}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  // Takes the room the tag leaves, and wraps before anything is cut.
  title: { flexGrow: 1, flexShrink: 1, flexBasis: '55%' },
  evidence: { gap: space.xs },
});
