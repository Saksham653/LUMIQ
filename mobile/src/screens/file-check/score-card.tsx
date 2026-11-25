import { StyleSheet } from 'react-native';

import { sizes, useTheme } from '@/theme';
import { Ring } from '@/ui/charts/ring';
import { Icon } from '@/ui/icon';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// The File check score, first on the screen: the ring with the score in its
// middle, the grade in words under it, one sentence on what it means, and a
// plain line of proof (the phone worked this number out itself, so it takes
// the small tick in soft ink, never the stamp or the yellow).
//
// A file with no rows has no score: the ring shows a dash, never a zero.
export function ScoreBlock({
  score,
  format,
  animate,
  outOf,
  grade,
  sentence,
  checkedLine,
  spoken,
}: {
  score: number | null;
  format: (value: number) => string;
  animate: boolean;
  outOf: string;
  grade: string;
  sentence: string;
  checkedLine: string | null;
  spoken: string;
}) {
  const { colors } = useTheme();
  return (
    <VStack gap="md" align="center">
      <Ring value={score} format={format} summary={spoken} size="lg" animate={animate}>
        {score === null ? null : (
          <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
            {outOf}
          </Txt>
        )}
      </Ring>
      <VStack gap="xs" style={styles.stretch}>
        <Txt variant="title" align="center" accessibilityRole="header" style={styles.stretch}>
          {grade}
        </Txt>
        <Txt tone="soft" align="center" style={styles.stretch}>
          {sentence}
        </Txt>
      </VStack>
      {checkedLine === null ? null : (
        <HStack gap="sm" justify="center" accessible accessibilityLabel={checkedLine} style={styles.stretch}>
          <Icon name="check" size={sizes.iconSmall} color={colors.inkSoft} />
          {/* Sized to its words, so snug: Android measures Hindi narrower than it draws it. */}
          <Txt variant="small" tone="soft" snug style={styles.shrink}>
            {checkedLine}
          </Txt>
        </HStack>
      )}
    </VStack>
  );
}

const styles = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
  shrink: { flexShrink: 1 },
});
