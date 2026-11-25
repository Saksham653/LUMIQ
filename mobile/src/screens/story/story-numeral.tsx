import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import { useAppState } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  figureFont,
  hasDevanagari,
  numeralLine,
  numeralSize,
  numeralUnit,
  textFont,
  useTheme,
} from '@/theme';
import type { StoryNumeral as NumeralParts } from '@/utils/story';

type Step = 'hero' | 'large' | 'medium';

// A numeral that would not fit steps down the ladder (brand spec, section 6):
// hero up to five characters, large up to eight, medium after that. The
// marks that keep a number left-to-right inside Hebrew text are not counted.
function stepFor(number: string): Step {
  const length = number.replace(/[\u2066-\u2069]/g, '').length;
  if (length <= 5) return 'hero';
  if (length <= 8) return 'large';
  return 'medium';
}

// The card's main figure as a big numeral: the digits in the figures face,
// the currency sign and the unit beside them in the text face, soft ink, half
// the size and never under 14, on the same baseline ("₹" + "46.8" + "लाख").
// The row always runs left to right: digits never flip.
//
// It is silent to a screen reader, because the sentence under it says the
// same number in its place.
export function StoryNumeral({ parts }: { parts: NumeralParts }) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const step = stepFor(parts.number);
  const size = numeralSize[step];
  const unitSize = Math.max(numeralUnit.minSize, Math.round(size * numeralUnit.scale));
  const prefix = parts.prefix.trim();
  const suffix = parts.suffix.trim();

  const digits: TextStyle = {
    ...figureFont(),
    fontSize: size,
    lineHeight: numeralLine[step],
    color: colors.ink,
  };
  const beside = (words: string): TextStyle => ({
    ...textFont(numeralUnit.weight, language, words),
    fontSize: unitSize,
    // Room for the marks above and below Devanagari letters.
    lineHeight: Math.ceil(unitSize * (hasDevanagari(words) ? 1.6 : 1.3)),
    color: colors.inkSoft,
  });

  return (
    <View aria-hidden style={[styles.row, { gap: Math.round(size * numeralUnit.gap) }]}>
      {prefix !== '' ? (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={beside(prefix)}>
          {prefix}
        </Text>
      ) : null}
      {/* The last safety net: digits that still do not fit get smaller as a whole, never cut. */}
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={[styles.digits, digits]}>
        {parts.number}
      </Text>
      {suffix !== '' ? (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={beside(suffix)}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', alignSelf: 'flex-start', maxWidth: '100%', direction: 'ltr' },
  digits: { flexShrink: 1 },
});
