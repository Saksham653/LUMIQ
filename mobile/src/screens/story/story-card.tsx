import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { border, radius, rhythm, space, useTheme } from '@/theme';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';
import type { StoryCard } from '@/utils/story';

import { ProofStamp } from './proof-stamp';
import { StoryBars } from './story-bars';
import { StoryNumeral } from './story-numeral';

// A card is not wider than this on a tablet. It belongs to this card alone.
const CARD_MAX_WIDTH = 520;

// One card of the story: its title, one big numeral when the card has a main
// figure, one sentence, a small picture when there is one, and under a card
// with numbers the stamp with the counted line. The card's buttons come in as
// children, under everything else.
//
// The card is paper with a hairline edge and no shadow. The only yellow on it
// is the stamp, and the stamp is only there when `countLine` is: when the
// phone has checked every number in the sentence.
//
// The card takes no touch itself: the story's tap surface lies under it, so a
// tap on the words goes through to it, and only the buttons (the children)
// take their own. No pressable is ever inside another.
export function StoryCardView({
  card,
  kicker,
  countLine,
  testID,
  children,
}: {
  card: StoryCard;
  // A small line above the title (the cover says what this screen is).
  kicker?: string;
  // "3 numbers on this card checked on your phone", or null for a card with
  // no numbers.
  countLine: string | null;
  testID?: string;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const cover = card.kind === 'cover';

  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.words}>
        <VStack gap="xs">
          {kicker !== undefined ? (
            <Txt variant="small" tone="soft">
              {kicker}
            </Txt>
          ) : null}
          <Txt variant={cover ? 'title' : 'label'} tone={cover ? 'ink' : 'soft'} accessibilityRole="header">
            {card.title}
          </Txt>
        </VStack>

        {card.numeral ? <StoryNumeral parts={card.numeral} /> : null}

        <Txt variant="heading">{card.sentence}</Txt>

        {card.series ? <StoryBars series={card.series} peakIndex={card.peakIndex} /> : null}

        {countLine !== null ? (
          <HStack gap="sm" style={[styles.proof, { borderTopColor: colors.line }]}>
            <ProofStamp />
            <Txt variant="small" tone="soft" style={styles.count}>
              {countLine}
            </Txt>
          </HStack>
        ) : null}
      </View>

      {children !== undefined && children !== null ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // A tap on the card that is not on a button goes to what lies under it.
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: 'center',
    gap: space.md,
    padding: rhythm.cardPadding,
    borderRadius: radius.card,
    borderWidth: border.hairline,
    pointerEvents: 'box-none',
  },
  // The words and pictures never take a touch (a screen reader still reads
  // them one by one).
  words: { gap: space.md, pointerEvents: 'none' },
  // The buttons take their own touches; the room between them does not.
  actions: { gap: space.md, pointerEvents: 'box-none' },
  // The footer under the words, with a hairline rule above it.
  proof: { paddingTop: space.md, borderTopWidth: border.hairline },
  count: { flex: 1 },
});
