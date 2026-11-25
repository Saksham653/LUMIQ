import type { Ref } from 'react';
import { PixelRatio, StyleSheet, Text, View, type TextStyle, type ViewInstance } from 'react-native';

import type { Language } from '@/i18n';
import { useAppState } from '@/state/app-state';
import { figureFont, hasDevanagari, keepLeftToRight, numeralUnit, palettes, textFont, type FontWeight } from '@/theme';
import { Mark, Wordmark } from '@/ui/logo';
import type { StoryNumeral as NumeralParts } from '@/utils/story';

import { ProofStamp } from './proof-stamp';
import { StoryBars } from './story-bars';

// The picture a story card is shared as: 1080 by 1350 pixels (4 by 5, the
// shape chats and photo apps show whole).
export const PICTURE_WIDTH = 1080;
export const PICTURE_HEIGHT = 1350;

// The picture is drawn on a grid 360 units wide (450 high); one unit is three
// pixels of the picture. Every size below is in units.
const GRID = 360;

// The picture is always light paper, in either theme: it is the same picture
// for whoever receives it.
const PAPER = palettes.light;

// The sentence steps down when it is long, and a very long one leaves out the
// bars, so the words always fit above the stamp. Lengths in characters.
const LONG_SENTENCE = 120;
const VERY_LONG_SENTENCE = 190;

// The marks that keep a number left to right inside Hebrew text; they are not
// counted in its length. Built from code points so no invisible character
// sits in this file.
const ISOLATES = new RegExp(`[${String.fromCharCode(0x2066)}-${String.fromCharCode(0x2069)}]`, 'g');

// The size of the card on the phone, in dp, that comes out as exactly 1080 by
// 1350 pixels: the picture is drawn at the phone's own pixel size, never
// scaled up.
export function pictureSize(): { width: number; height: number } {
  const width = PICTURE_WIDTH / PixelRatio.get();
  return { width, height: (width * PICTURE_HEIGHT) / PICTURE_WIDTH };
}

// A text style in the brand's faces at a size in units. The line is taller
// for Devanagari (at least 1.6 times the size, so its marks are never cut)
// and for Hebrew, Japanese and Chinese (1.5 times).
function words(
  text: string,
  language: Language,
  size: number,
  line: number,
  weight: FontWeight,
  color: string,
): TextStyle {
  const tall = language === 'he' || language === 'ja' || language === 'zh' ? size * 1.5 : line;
  const height = hasDevanagari(text) || language === 'hi' ? Math.max(line, size * 1.6) : Math.max(line, tall);
  return { ...textFont(weight, language, text), fontSize: size, lineHeight: Math.ceil(height), color };
}

// The big number of the picture: digits in the figures face, the currency
// sign and the unit beside them in the text face at half the size, on one
// baseline, always left to right. Long numbers step down.
function PictureNumeral({ parts, unit, language }: { parts: NumeralParts; unit: number; language: Language }) {
  const length = parts.number.replace(ISOLATES, '').length;
  const size = (length <= 5 ? 60 : length <= 8 ? 46 : 34) * unit;
  const unitSize = size * numeralUnit.scale;
  const prefix = parts.prefix.trim();
  const suffix = parts.suffix.trim();
  const beside = (text: string) => words(text, language, unitSize, unitSize * 1.3, numeralUnit.weight, PAPER.inkSoft);

  return (
    <View style={[styles.numeral, { gap: size * numeralUnit.gap }]}>
      {prefix !== '' ? (
        <Text allowFontScaling={false} style={beside(prefix)}>
          {prefix}
        </Text>
      ) : null}
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={[styles.digits, figureFont(), { fontSize: size, lineHeight: Math.ceil(size * 1.08), color: PAPER.ink }]}>
        {parts.number}
      </Text>
      {suffix !== '' ? (
        <Text allowFontScaling={false} style={beside(suffix)}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

// The shared picture of one story card: its title, the big number, the
// sentence, the small bars, and at the foot the stamp with the count ("3
// numbers checked on this phone. No AI.") beside the LUMIQ mark and name.
//
// It is laid out at the size pictureSize() gives, and the screen captures this
// very view, so the preview shows exactly the picture that is sent. Text does
// not follow the phone's text size here: the picture has a fixed frame.
export function ShareCard({
  ref,
  width,
  height,
  kicker,
  title,
  cover,
  sentence,
  numeral,
  series,
  peakIndex,
  stamp,
}: {
  ref?: Ref<ViewInstance>;
  width: number;
  height: number;
  // A small line above the title (the cover: "The story of my file").
  kicker?: string;
  title: string;
  cover: boolean;
  sentence: string;
  numeral?: NumeralParts;
  series?: number[];
  peakIndex?: number;
  // "3 numbers checked on this phone. No AI."
  stamp: string;
}) {
  const { language } = useAppState();
  const unit = width / GRID;
  const long = sentence.length > LONG_SENTENCE;
  const bars = sentence.length <= VERY_LONG_SENTENCE ? series : undefined;
  const line = Math.max(1, unit);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width, height, padding: 14 * unit, backgroundColor: PAPER.ground }}>
      <View
        style={[
          styles.card,
          {
            padding: 22 * unit,
            borderRadius: 20 * unit,
            borderWidth: line,
            borderColor: PAPER.line,
            backgroundColor: PAPER.surface,
          },
        ]}>
        <View style={[styles.body, { gap: 12 * unit }]}>
          <View style={{ gap: 4 * unit }}>
            {kicker !== undefined ? (
              <Text allowFontScaling={false} style={words(kicker, language, 15 * unit, 20 * unit, '500', PAPER.inkSoft)}>
                {kicker}
              </Text>
            ) : null}
            <Text
              allowFontScaling={false}
              numberOfLines={cover ? 3 : 2}
              style={
                cover
                  ? words(title, language, 26 * unit, 32 * unit, '700', PAPER.ink)
                  : words(title, language, 17 * unit, 22 * unit, '600', PAPER.inkSoft)
              }>
              {title}
            </Text>
          </View>

          {numeral ? <PictureNumeral parts={numeral} unit={unit} language={language} /> : null}

          {/* The last safety net: a sentence that still does not fit gets smaller, never cut. */}
          <Text
            allowFontScaling={false}
            numberOfLines={7}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={words(sentence, language, (long ? 17 : 20) * unit, (long ? 24 : 28) * unit, '500', PAPER.ink)}>
            {sentence}
          </Text>

          {bars ? (
            <StoryBars
              series={bars}
              peakIndex={peakIndex}
              palette={PAPER}
              style={long ? { width: 240 * unit, maxWidth: '100%' } : undefined}
            />
          ) : null}
        </View>

        <View
          style={[
            styles.foot,
            { gap: 10 * unit, paddingTop: 12 * unit, borderTopWidth: line, borderTopColor: PAPER.line },
          ]}>
          <ProofStamp size={28 * unit} palette={PAPER} />
          <Text
            allowFontScaling={false}
            style={[styles.stamp, words(stamp, language, 14 * unit, 19 * unit, '500', PAPER.inkSoft)]}>
            {stamp}
          </Text>
          {/* The mark on its tile and the name in ink: never smaller than the logo allows. */}
          <View style={[styles.lockup, { gap: 6 * unit }]}>
            <Mark size={Math.max(24, 26 * unit)} />
            <Wordmark size={Math.max(16, 13 * unit)} color={PAPER.ink} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  // The words and the picture; anything that would not fit is cut here, above
  // the foot, so the stamp is always in the picture.
  body: { flex: 1, overflow: 'hidden' },
  numeral: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'flex-start', maxWidth: '100%', ...keepLeftToRight },
  digits: { flexShrink: 1 },
  foot: { flexDirection: 'row', alignItems: 'center' },
  stamp: { flex: 1 },
  // Mark first, then name, in every language.
  lockup: { flexDirection: 'row', alignItems: 'center', ...keepLeftToRight },
});
