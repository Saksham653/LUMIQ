import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Dataset } from '@/data/types';
import { localText, useLocalT } from '@/i18n/local';
import { useAppState, useNumbers } from '@/state/app-state';
import { rhythm, space, useIsRTL, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { tap } from '@/ui/haptics';
import { IconButton } from '@/ui/icon-button';
import { Press } from '@/ui/press';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';
import { buildStory } from '@/utils/story';

import { Arrive } from './arrive';
import { ProofThread } from './proof-thread';
import { StoryCardView } from './story-card';
import { STORY_STRINGS, type StoryKey } from './strings';

// The Story of your file: the open file told in up to five cards, one at a
// time. Every card is built on the phone from what the app already works out
// and has passed the number check before it is shown (see @/utils/story); no
// AI and no network are used anywhere here.
//
// Tap the end half of the card for the next one and the start half to go
// back (the sides swap in right-to-left languages), or use the Back and Next
// buttons, which are also the way through for a screen reader. The proof
// thread at the top takes the light one segment per card shown.
//
// It fills the Home stack's screen under its own top edge: the route hides
// the stack's header.
export function StoryScreen({ dataset, name }: { dataset: Dataset; name: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const rtl = useIsRTL();
  const numbers = useNumbers();
  const { language } = useAppState();
  const t = useLocalT(STORY_STRINGS);

  // Worked out once per file, language and number style: not on every tap.
  const cards = useMemo(
    () =>
      buildStory(dataset, name, {
        t: (key, params) => localText<StoryKey>(STORY_STRINGS, language, key, params),
        numbers,
        language,
      }),
    [dataset, name, numbers, language],
  );

  const [index, setIndex] = useState(0);
  // The furthest card shown so far: the thread is lit up to here.
  const [reached, setReached] = useState(0);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const closeButton = (
    <IconButton icon="close" accessibilityLabel={t('ui.close')} onPress={close} testID="story-close" />
  );

  if (cards.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.ground, paddingTop: insets.top }]}>
        <HStack justify="end" style={styles.top}>
          {closeButton}
        </HStack>
        <VStack justify="center" p="xl" style={styles.fill}>
          <Txt variant="heading" align="center">
            {t('ui.empty')}
          </Txt>
        </VStack>
      </View>
    );
  }

  const last = cards.length - 1;
  const current = Math.min(index, last);
  const card = cards[current];

  const progress = t('ui.progress', { n: numbers.count(current + 1), total: numbers.count(cards.length) });
  const countLine =
    card.checked > 0
      ? t(card.checked === 1 ? 'ui.checkedOne' : 'ui.checkedMany', { n: numbers.count(card.checked) })
      : null;

  const show = (next: number) => {
    const to = Math.min(Math.max(next, 0), last);
    setIndex(to);
    setReached((now) => Math.max(now, to));
  };

  // One tap surface under the whole card. Which half was tapped is read from
  // where the finger was on the screen; the card's own buttons take their
  // touches first.
  const onCardPress = (event: GestureResponderEvent) => {
    const leftHalf = event.nativeEvent.pageX < width / 2;
    const endHalf = rtl ? leftHalf : !leftHalf;
    if (endHalf) {
      if (current < last) {
        tap();
        show(current + 1);
      }
    } else if (current > 0) {
      show(current - 1);
    }
  };

  // The card as text: the sentence, the counted line, and how it was made.
  const share = async () => {
    const lines = [card.sentence];
    if (countLine !== null) lines.push(countLine);
    lines.push(t('ui.madeWith'));
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      Alert.alert(t('ui.shareFailed'));
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.ground, paddingTop: insets.top }]}>
      <VStack gap="xs" style={styles.top}>
        <ProofThread lit={cards.map((_, place) => place <= reached)} />
        <HStack gap="md" justify="between">
          <Txt variant="small" tone="soft" accessibilityLiveRegion="polite" style={styles.fill}>
            {progress}
          </Txt>
          {closeButton}
        </HStack>
      </VStack>

      {/* Keyed by card: each card starts at its top and arrives once. */}
      <ScrollView
        key={card.id}
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Not an element for a screen reader, so the words and buttons inside stay reachable one by one;
            Back and Next below do the same job there. */}
        <Press
          accessible={false}
          feedback="none"
          accessibilityLabel={t('ui.tapHint')}
          onPress={onCardPress}
          testID="story-tap"
          style={styles.stage}>
          <Arrive>
            <StoryCardView
              card={card}
              kicker={card.kind === 'cover' ? t('screen.title') : undefined}
              countLine={countLine}
              testID={`story-card-${card.kind}`}>
              {card.kind === 'next' ? (
                <VStack gap="sm">
                  <Button
                    fullWidth
                    icon="ask"
                    label={t('ui.ask')}
                    onPress={() => router.navigate('/ask')}
                    testID="story-ask"
                  />
                  <Button
                    fullWidth
                    variant="quiet"
                    icon="insights"
                    label={t('ui.insights')}
                    onPress={() => router.navigate('/insights')}
                    testID="story-insights"
                  />
                </VStack>
              ) : null}
              {countLine !== null ? (
                <Button
                  variant="plain"
                  icon="share"
                  label={t('ui.share')}
                  accessibilityLabel={t('ui.shareLabel')}
                  onPress={() => void share()}
                  testID="story-share"
                  style={styles.share}
                />
              ) : null}
            </StoryCardView>
          </Arrive>
        </Press>
      </ScrollView>

      <HStack gap="md" style={styles.bottom}>
        <Button
          variant="quiet"
          icon="back"
          label={t('ui.back')}
          accessibilityLabel={t('ui.backLabel')}
          disabled={current === 0}
          onPress={() => show(current - 1)}
          testID="story-back"
          style={styles.half}
        />
        <Button
          icon="chevron"
          iconPosition="end"
          label={t('ui.next')}
          accessibilityLabel={t('ui.nextLabel')}
          disabled={current === last}
          onPress={() => show(current + 1)}
          testID="story-next"
          style={styles.half}
        />
      </HStack>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  top: { paddingHorizontal: rhythm.screenEdge, paddingTop: space.md },
  scroll: { flexGrow: 1 },
  // Fills the room between the top and the buttons, with the card in the
  // middle, so a tap beside a short card still counts.
  stage: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: rhythm.screenEdge,
    paddingVertical: space.md,
  },
  share: { alignSelf: 'flex-start' },
  bottom: { paddingHorizontal: rhythm.screenEdge, paddingTop: space.sm, paddingBottom: space.lg },
  half: { flex: 1 },
});
