import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type TextStyle,
} from 'react-native';

import type { Dataset } from '@/data/types';
import { useLocalT } from '@/i18n/local';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  border,
  figureFont,
  numeralLine,
  numeralSize,
  numeralUnit,
  rhythm,
  sizes,
  space,
  textFont,
  useTheme,
  keepLeftToRight,
} from '@/theme';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { describeInsights } from '@/utils/insight-text';

import { heroFinding, wordHeadline, type NumeralParts } from './headline';
import { HOME_STRINGS } from './strings';

// The hero of Home: what the open file is saying. The file's name and size,
// one finding as a short sentence, its number set big, a small strip of bars
// when the file has a series, one quiet line that says what the number is,
// and the two ways on.
//
// The phone worked this number out itself, so it carries a plain line in soft
// ink and never the yellow band or the stamp (brand spec, section 4).

// Home never grows wider than this, so the hero keeps its shape on a tablet.
export const HOME_MAX_WIDTH = 560;

// --- The big number ------------------------------------------------------------

// A numeral steps down this ladder when it does not fit (brand spec, section
// 6, "When words do not fit"). It is never squeezed or cut.
type NumeralStep = 'hero' | 'large' | 'medium';
const LADDER: readonly NumeralStep[] = ['hero', 'large', 'medium'];

// Beside the strip of bars the number may take this much of the row.
const NUMERAL_SHARE = 0.6;

// About how wide a character is drawn, as a part of its font size, with the
// phone's own font and with the brand's. An estimate is enough: if a number
// turns out wider than this says, the strip of bars moves under it and
// nothing is cut.
const DIGIT_EM = 0.58;
const PERCENT_EM = 0.85;
const POINT_EM = 0.28;
const LETTER_EM = 0.62;

const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
const NARROW_NO_BREAK_SPACE = String.fromCharCode(0x202f);
// Marks that keep a number left to right inside right-to-left text.
const ISOLATE_START = String.fromCharCode(0x2066);
const ISOLATE_END = String.fromCharCode(0x2069);

function isSpace(char: string): boolean {
  return char === ' ' || char === NO_BREAK_SPACE || char === NARROW_NO_BREAK_SPACE;
}

function emWidth(text: string): number {
  let width = 0;
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (char >= '0' && char <= '9') width += DIGIT_EM;
    else if (char === '%') width += PERCENT_EM;
    else if (char === '.' || char === ',' || char === '-' || isSpace(char)) width += POINT_EM;
    else width += LETTER_EM;
  }
  return width;
}

// The unit as it is drawn: the app writes some units with a space before them
// ("46.8" and " lakh"); here the space is the numeral's own gap.
function trimStart(text: string): string {
  let at = 0;
  while (at < text.length && isSpace(text[at])) at++;
  return text.slice(at);
}

// The number in the order it is drawn: a minus, the currency sign, the digits,
// the unit.
type Drawn = { minus: string; prefix: string; digits: string; unit: string };

function drawn(parts: NumeralParts): Drawn {
  // A minus stays in front of the whole amount, currency sign included, as
  // the app writes it everywhere else ("-$1,234").
  const negative = parts.prefix !== '' && parts.number.startsWith('-');
  const minus = negative ? '-' : '';
  const number = negative ? parts.number.slice(1) : parts.number;
  const unit = trimStart(parts.suffix);
  // The percent sign is part of the number: it is set with the digits, at
  // their size (brand spec, section 5).
  if (unit === '%') return { minus, prefix: parts.prefix, digits: `${number}${parts.suffix}`, unit: '' };
  return { minus, prefix: parts.prefix, digits: number, unit };
}

function unitSizeAt(step: NumeralStep): number {
  return Math.max(numeralUnit.minSize, numeralSize[step] * numeralUnit.scale);
}

function widthAt(step: NumeralStep, text: Drawn, scale: number): number {
  const size = numeralSize[step];
  const digits = (emWidth(text.minus) + emWidth(text.digits)) * size;
  const units = (emWidth(text.prefix) + emWidth(text.unit)) * unitSizeAt(step);
  const gap = text.unit === '' ? 0 : size * numeralUnit.gap;
  return (digits + units + gap) * scale;
}

function stepFor(text: Drawn, room: number, scale: number): NumeralStep {
  for (const step of LADDER) {
    if (widthAt(step, text, scale) <= room) return step;
  }
  return 'medium';
}

// The number: digits in the figures face, the currency sign and the unit in
// the text face at half the size and in soft ink, on one baseline. It reads
// left to right in every language.
function HeroNumeral({ parts, step, label }: { parts: NumeralParts; step: NumeralStep; label: string }) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const text = drawn(parts);

  const digitStyle: TextStyle = {
    ...figureFont(),
    fontSize: numeralSize[step],
    lineHeight: numeralLine[step],
    color: colors.ink,
  };
  const unitStyle = (words: string): TextStyle => ({
    ...textFont(numeralUnit.weight, language, words),
    fontSize: unitSizeAt(step),
    color: colors.inkSoft,
  });

  return (
    <View style={styles.numeral}>
      <Text accessibilityLabel={label} maxFontSizeMultiplier={MAX_FONT_SCALE} style={digitStyle}>
        {parts.rtl ? ISOLATE_START : null}
        {text.minus}
        {text.prefix === '' ? null : <Text style={unitStyle(text.prefix)}>{text.prefix}</Text>}
        {text.digits}
        {text.unit === '' ? null : <Text style={unitStyle(text.unit)}>{`${NO_BREAK_SPACE}${text.unit}`}</Text>}
        {parts.rtl ? ISOLATE_END : null}
      </Text>
    </View>
  );
}

// --- The strip of bars -----------------------------------------------------------

// The strip is as high as the board draws it, with its foot lifted to the
// line the digits stand on. These sizes belong to this strip alone.
const STRIP_HEIGHT = 48;
// The least room the strip needs beside the number. With less, it moves
// under the number.
const STRIP_MIN_WIDTH = 96;
const BAR_GAP = 3;
const BAR_MAX_WIDTH = 16;
// The top of a bar in the small strip (the board draws 2 here; the 4 of a
// full chart would round these thin bars into pills).
const BAR_TOP = 2;
// A bar is never lower than this part of the strip, so a small value still
// shows as a bar.
const BAR_MIN = 6;

// A picture of the series for the eye only: the bar the number is about is in
// the chart's pointing colour, the rest are at rest. Time runs left to right
// in every language.
function Strip({ bars, marked }: { bars: number[]; marked: number }) {
  const { colors } = useTheme();
  const top = Math.max(...bars);
  return (
    <View aria-hidden style={styles.strip}>
      {bars.map((value, index) => {
        const share = Math.max(BAR_MIN, Math.round((Math.max(value, 0) / top) * 100));
        const height = `${share}%` as DimensionValue;
        return (
          <View
            key={index}
            style={[styles.bar, { height, backgroundColor: index === marked ? colors.chartPeak : colors.chartRest }]}
          />
        );
      })}
    </View>
  );
}

// --- The two ways on -----------------------------------------------------------

// Side by side while they fit on one line. When they do not, they stack: the
// main button at full width, the text button under it (brand spec, section 6).
function HeroActions({
  playLabel,
  askLabel,
  onPlay,
  onAsk,
}: {
  playLabel: string;
  askLabel: string;
  onPlay: () => void;
  onAsk: () => void;
}) {
  const [stacked, setStacked] = useState(false);

  // The second button is on a line of its own once it starts below the
  // height of the first.
  const placed = (event: LayoutChangeEvent) => {
    if (event.nativeEvent.layout.y > sizes.target) setStacked(true);
  };

  return (
    <View style={stacked ? styles.actionsStacked : styles.actions}>
      <Button label={playLabel} icon="play" fullWidth={stacked} onPress={onPlay} />
      <Button variant="plain" label={askLabel} fullWidth={stacked} onLayout={placed} onPress={onAsk} />
    </View>
  );
}

// --- The card ------------------------------------------------------------------

export type HeroCardProps = {
  dataset: Dataset;
  // The file's name as Home shows it (a sample's name is translated).
  name: string;
  // Its size in words: "12 rows · 8 columns".
  meta: string;
  onPlay: () => void;
  onAsk: () => void;
};

export function HeroCard({ dataset, name, meta, onPlay, onAsk }: HeroCardProps) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const t = useT();
  const tl = useLocalT(HOME_STRINGS);
  const numbers = useNumbers();

  // What LUMIQ noticed, worded as on Insights. Worked out again only when
  // the file, the language or the number style changes.
  const noticed = useMemo(() => describeInsights(dataset, t, numbers, language), [dataset, t, numbers, language]);
  const headline = wordHeadline(heroFinding(dataset), dataset, name, noticed, t, tl, numbers);

  const hasStrip = headline.bars.length >= 2 && Math.max(...headline.bars) > 0;

  // The room the number has: the card's own width, less its edge and padding.
  const row =
    Math.min(windowWidth, HOME_MAX_WIDTH) - 2 * (rhythm.screenEdge + rhythm.cardPadding + border.hairline);
  const step = stepFor(
    drawn(headline.parts),
    hasStrip ? row * NUMERAL_SHARE : row,
    Math.min(fontScale, MAX_FONT_SCALE),
  );

  const playLabel = tl('playStory');
  const askLabel = tl('askAbout');

  return (
    <Card style={styles.card}>
      <View style={styles.file}>
        <View style={styles.fileName}>
          <Icon name="file" size={sizes.iconSmall} color={colors.inkSoft} />
          {/* A file name is the one thing that is cut: it loses its middle and keeps its ending. */}
          <Txt variant="small" weight="600" snug numberOfLines={1} ellipsizeMode="middle" style={styles.shrink}>
            {name}
          </Txt>
        </View>
        <Txt variant="small" tone="soft" snug>
          {meta}
        </Txt>
      </View>

      <Txt variant="heading" accessibilityRole="header">
        {headline.title}
      </Txt>

      <View style={styles.number}>
        <HeroNumeral parts={headline.parts} step={step} label={headline.spoken} />
        {hasStrip ? <Strip bars={headline.bars} marked={headline.marked} /> : null}
      </View>

      {headline.how === '' ? null : (
        <View style={styles.how}>
          <Icon name={headline.caution ? 'info' : 'check'} size={sizes.iconSmall} color={colors.inkSoft} />
          <Txt variant="small" tone="soft" style={styles.grow}>
            {headline.how}
          </Txt>
        </View>
      )}

      {/* Keyed by its words: another language measures the two buttons again. */}
      <HeroActions
        key={`${playLabel}|${askLabel}`}
        playLabel={playLabel}
        askLabel={askLabel}
        onPlay={onPlay}
        onAsk={onAsk}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  // The name and the size share a line, and the size moves under the name
  // when the two do not fit.
  file: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm },
  fileName: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1, maxWidth: '100%' },
  shrink: { flexShrink: 1 },
  grow: { flex: 1 },
  // The number and the strip stand on one line. The strip moves under the
  // number when the two do not fit side by side.
  number: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: space.lg, rowGap: space.xs },
  // Digits never flip.
  numeral: { flexShrink: 1, maxWidth: '100%', ...keepLeftToRight },
  strip: {
    flexGrow: 1,
    flexBasis: STRIP_MIN_WIDTH,
    height: STRIP_HEIGHT,
    paddingBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: BAR_GAP,
    ...keepLeftToRight,
  },
  bar: {
    flexGrow: 1,
    flexBasis: 0,
    maxWidth: BAR_MAX_WIDTH,
    borderTopStartRadius: BAR_TOP,
    borderTopEndRadius: BAR_TOP,
  },
  how: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, paddingTop: space.xs },
  actionsStacked: { alignItems: 'stretch', gap: space.xs, paddingTop: space.xs },
});
