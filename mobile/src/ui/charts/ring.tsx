import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useAppState } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  figureFont,
  numeralLine,
  numeralSize,
  numeralUnit,
  space,
  spring,
  textFont,
  typeScale,
  useReducedMotion,
  useTheme,
  type NumeralSize,
} from '@/theme';
import { UNKNOWN, clamp, figureRuns, isKnown } from '@/ui/charts/scale';
import { SkeletonBlock } from '@/ui/skeleton';
import { Txt } from '@/ui/text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type RingSize = 'sm' | 'md' | 'lg';

export type RingProps = {
  // The score. null is "not known": the track alone is drawn, with no arc and
  // a dash in the middle. It is never drawn as zero.
  value: number | null;
  // What a full ring stands for. Default 100.
  max?: number;
  // What the ring says to a screen reader, as one sentence in the app's
  // words: "File check: 82 out of 100." The middle is not read apart from it.
  summary: string;
  // The app's formatting for the number in the middle:
  // (value) => numbers.count(value). With it the ring writes the score
  // itself, as a numeral of the size that fits (see `size`). Without it the
  // middle holds only what you pass as children.
  format?: (value: number) => string;
  // How wide it is drawn: 72, 120 or 200. Default md. Like an icon, a ring
  // does not grow with the text size. Its own numeral is the inline one in
  // sm, the medium one in md and the hero one in lg: each has room for three
  // digits at the largest text size.
  size?: RingSize;
  // The arc draws once, on arrival. Default true.
  animate?: boolean;
  // The score is on its way: a disc of the same size.
  loading?: boolean;
  // What stands for a score that is not known. Default a dash.
  missing?: string;
  // Drawn in the middle, under the number: a short line such as "out of 100"
  // (it fits in lg). Without `format` it is the whole middle: your own
  // Numeral, an icon.
  children?: ReactNode;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The ring's own sizes: how wide it is drawn and how thick its line is. lg
// is the File check score.
const RING: Record<RingSize, { box: number; line: number }> = {
  sm: { box: 72, line: 6 },
  md: { box: 120, line: 8 },
  lg: { box: 200, line: 10 },
};

// The step of the numeral ladder that fits inside each ring (brand spec,
// section 5: a numeral that does not fit steps down the ladder).
const FIGURE: Record<RingSize, NumeralSize> = { sm: 'inline', md: 'medium', lg: 'hero' };

// Under this much of the ring there is no arc to see, only the round end of
// its line: it is drawn as nothing.
const NO_ARC = 0.0005;

// The signs that belong to a number and are set with its digits (brand spec,
// section 5): the percent sign, the plus and the two minus signs.
const PART_OF_NUMBER = /^[%+\-−]+$/;

type RingFigureProps = { text: string; size: RingSize };

// The score as a numeral: digits in the figures face, a currency sign or a
// unit in the text face at half their size, in soft ink, on one line that
// never mirrors (brand spec, section 5).
//
// The library's Numeral (src/ui/numeral.tsx) was not there when the charts
// were built. This sets a still number the way a numeral is set; when Numeral
// lands it takes this component's place, and its digits will roll on the same
// spring the arc draws on.
function RingFigure({ text, size }: RingFigureProps) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const step = FIGURE[size];
  const digits = numeralSize[step];
  const line = step === 'inline' ? typeScale.body.line : numeralLine[step];
  const unit = Math.max(numeralUnit.minSize, digits * numeralUnit.scale);
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      numberOfLines={1}
      style={[styles.figure, figureFont(), { fontSize: digits, lineHeight: line, color: colors.ink }]}>
      {figureRuns(text).map((run, at) =>
        run.figures || PART_OF_NUMBER.test(run.text) ? (
          run.text
        ) : (
          <Text
            key={at}
            style={[textFont(numeralUnit.weight, language, run.text), { fontSize: unit, color: colors.inkSoft }]}>
            {run.text}
          </Text>
        ),
      )}
    </Text>
  );
}

// A score as a ring, with the number in the middle:
//   <Ring value={score} format={(value) => numbers.count(value)} summary={t('fileCheck.scoreSpoken', { score })} size="lg">
//     <Txt variant="small" tone="soft">{t('fileCheck.outOf')}</Txt>
//   </Ring>
//
// The track is `surfaceSunk` and the arc is `chartPeak`: the one mark of this
// chart, with its value written in the middle, so the score is never told by
// the arc alone. The arc starts at twelve o'clock and runs clockwise in every
// language.
//
// On arrival the arc draws on the `roll` spring, the spring the digits of a
// numeral roll on, so the two settle together. With reduced motion the arc is
// simply there. A new score moves the arc from where it is.
//
// Needs AppStateProvider above it when it writes the number (its text reads
// the app language).
export function Ring({
  value,
  max = 100,
  summary,
  format,
  size = 'md',
  animate = true,
  loading = false,
  missing = UNKNOWN,
  children,
  style,
}: RingProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const { box, line } = RING[size];
  const radius = (box - line) / 2;
  const around = 2 * Math.PI * radius;
  const share = isKnown(value) && max > 0 ? clamp(value / max, 0, 1) : 0;
  // How much of the arc is drawn, 0 to 1.
  const drawn = useSharedValue(animate && !reduced ? 0 : share);

  useEffect(() => {
    drawn.set(withSpring(share, spring('roll', reduced)));
  }, [share, reduced, drawn]);

  const arc = useAnimatedProps(() => {
    const part = drawn.get();
    // A line with round ends draws a dot even at no length. With nothing to
    // show, the dash is pushed wholly off the circle, so a score of zero has
    // no arc at all.
    return { strokeDashoffset: part > NO_ARC ? around * (1 - part) : around + line };
  });

  if (loading) return <SkeletonBlock width={box} height={box} radius="pill" style={style} />;

  let figure: ReactNode = null;
  if (format !== undefined) {
    figure = isKnown(value) ? (
      <RingFigure text={format(value)} size={size} />
    ) : (
      // Not known: a dash (or the app's words for it), never a zero.
      <Txt variant={size === 'sm' ? 'body' : 'heading'} tone="soft" align="center" style={styles.stretch}>
        {missing}
      </Txt>
    );
  }

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={[{ width: box, height: box }, style]}>
      <Svg width={box} height={box} style={styles.fromTop}>
        <Circle cx={box / 2} cy={box / 2} r={radius} stroke={colors.surfaceSunk} strokeWidth={line} fill="none" />
        <AnimatedCircle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          stroke={colors.chartPeak}
          strokeWidth={line}
          strokeLinecap="round"
          fill="none"
          // The gap is longer than the circle, so the next dash never comes
          // round into view.
          strokeDasharray={`${around} ${around + line * 2}`}
          animatedProps={arc}
        />
      </Svg>
      <View style={[styles.middle, { padding: line + space.xs }]}>
        {figure}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The circle's own start is at three o'clock. A quarter turn back puts it
  // at twelve.
  fromTop: { transform: [{ rotate: '-90deg' }] },
  middle: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  // A numeral never mirrors: its sign, digits and unit keep their order in
  // every language.
  figure: { writingDirection: 'ltr' },
  // Centred words take their width from the ring.
  stretch: { alignSelf: 'stretch' },
});
