import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocalT } from '@/i18n/local';
import { useNumbers, useT } from '@/state/app-state';
import { border, duration, fade, radius, rhythm, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { HStack, VStack } from '@/ui/stack';
import { Switch } from '@/ui/switch';
import { Txt } from '@/ui/text';
import type { StoryCard } from '@/utils/story';

import { ShareCard, pictureSize } from './share-card';
import { sharePicture } from './share-picture';
import { STORY_STRINGS } from './strings';

// The panel is not wider than this on a tablet, and the picture in it not
// wider than this. They belong to this preview alone.
const PANEL_MAX_WIDTH = 480;
const PICTURE_MAX_WIDTH = 360;

// Before a card is shared, the exact picture that will be sent, over the
// story: the picture, "Hide names" when the card holds a name it can hide,
// then Cancel and Share. It is drawn in the screen (not a sheet), fades in,
// and Android's back button closes it.
//
// The picture shown is the very view that is captured: it is laid out at the
// picture's own size and only drawn smaller here, so what is seen is what is
// sent. When the picture cannot be made or shared (the browser preview, a
// phone without a share sheet), the card goes as text, as before.
export function SharePreview({
  card,
  countLine,
  onClose,
}: {
  card: StoryCard;
  // The card's counted line, for the text the card is shared as when the
  // picture cannot be.
  countLine: string | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const numbers = useNumbers();
  const t = useLocalT(STORY_STRINGS);
  const common = useT();
  const picture = useRef<ViewInstance>(null);
  const [hideNames, setHideNames] = useState(false);
  const [busy, setBusy] = useState(false);

  // It fades in where it rests: opacity only, also with reduced motion.
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(withTiming(1, fade(duration.quick)));
  }, [shown]);
  const appear = useAnimatedStyle<ViewStyle>(() => {
    return { opacity: shown.get() };
  });

  // Android's back button closes the preview, not the story.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) onClose();
      return true;
    });
    return () => back.remove();
  }, [busy, onClose]);

  // The names a picture can leave out: the file's name on the cover, a group
  // or a row's name in a sentence.
  const cover = card.kind === 'cover';
  const canHide = cover || card.sentenceHidden !== card.sentence;
  const hiding = canHide && hideNames;
  const sentence = hiding ? card.sentenceHidden : card.sentence;
  const title = cover && hiding ? t('share.kicker') : card.title;
  const kicker = cover && !hiding ? t('share.kicker') : undefined;
  const stamp = t(card.checked === 1 ? 'share.stampOne' : 'share.stampMany', { n: numbers.count(card.checked) });

  // The picture at its own size, drawn smaller to fit the panel.
  const size = pictureSize();
  const panelWidth = Math.min(screenWidth - rhythm.screenEdge * 2, PANEL_MAX_WIDTH);
  const frameWidth = Math.min(panelWidth - rhythm.cardPadding * 2, PICTURE_MAX_WIDTH);
  // The picture fills the frame inside its hairline edge.
  const scale = (frameWidth - border.hairline * 2) / size.width;
  const frameHeight = size.height * scale + border.hairline * 2;

  // Today's text share, with names hidden too when that was asked.
  const shareText = async () => {
    const lines = [sentence];
    if (countLine !== null) lines.push(countLine);
    lines.push(t('ui.madeWith'));
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      Alert.alert(t('ui.shareFailed'));
    }
  };

  const share = async () => {
    if (busy) return;
    setBusy(true);
    const result = await sharePicture(picture, t('share.title'));
    if (result !== 'shared') await shareText();
    setBusy(false);
    onClose();
  };

  return (
    <Animated.View
      role="dialog"
      aria-modal
      accessibilityViewIsModal
      accessibilityLabel={t('share.title')}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, appear]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.lg }]}
        showsVerticalScrollIndicator={false}>
        <VStack
          gap="lg"
          style={[styles.panel, { width: panelWidth, backgroundColor: colors.surface, borderColor: colors.line }]}>
          <VStack gap="xs">
            <Txt variant="heading" accessibilityRole="header">
              {t('share.title')}
            </Txt>
            <Txt variant="small" tone="soft">
              {t('share.exact')}
            </Txt>
          </VStack>

          {/* One image to a screen reader, which hears what it says. */}
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('share.picture', { title, sentence, stamp })}
            testID="story-share-picture"
            style={[styles.frame, { width: frameWidth, height: frameHeight, borderColor: colors.line }]}>
            {/* Drawn smaller around its centre, then moved back to the frame's corner. The corner is
                the physical top left in every language, because the scale is physical too. */}
            <View
              style={[
                styles.scaled,
                {
                  width: size.width,
                  height: size.height,
                  transform: [
                    { translateX: (-size.width * (1 - scale)) / 2 },
                    { translateY: (-size.height * (1 - scale)) / 2 },
                    { scale },
                  ],
                },
              ]}>
              <ShareCard
                ref={picture}
                width={size.width}
                height={size.height}
                kicker={kicker}
                title={title}
                cover={cover}
                sentence={sentence}
                numeral={card.numeral}
                series={card.series}
                peakIndex={card.peakIndex}
                stamp={stamp}
              />
            </View>
          </View>

          {canHide ? (
            <VStack gap="xs">
              <Switch
                checked={hideNames}
                onChange={setHideNames}
                label={t('share.hideNames')}
                disabled={busy}
                testID="story-share-hide"
              />
              <Txt variant="small" tone="soft">
                {t('share.hideNamesHint')}
              </Txt>
            </VStack>
          ) : null}

          <HStack gap="md">
            <Button
              variant="quiet"
              label={common('common.cancel')}
              disabled={busy}
              onPress={onClose}
              testID="story-share-cancel"
              style={styles.half}
            />
            <Button
              icon="share"
              label={t('share.send')}
              busy={busy}
              onPress={() => void share()}
              testID="story-share-send"
              style={styles.half}
            />
          </HStack>
        </VStack>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: rhythm.screenEdge,
    paddingBottom: space.lg,
  },
  panel: {
    alignSelf: 'center',
    padding: rhythm.cardPadding,
    borderRadius: radius.sheet,
    borderWidth: border.hairline,
  },
  frame: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: radius.control,
    borderWidth: border.hairline,
  },
  // A physical corner on purpose: it pairs with the physical scale above.
  scaled: { position: 'absolute', top: 0, left: 0 },
  half: { flex: 1 },
});
