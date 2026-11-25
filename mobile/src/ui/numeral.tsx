import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { isWorkletFunction, scheduleOnRN } from 'react-native-worklets';

import type { Language } from '@/i18n';
import { useAppState } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  MIN_FONT_SIZE,
  digitBeat,
  figureFont,
  lineHeightFor,
  numeralLine,
  numeralSize,
  numeralUnit,
  spring,
  textFont,
  typeScale,
  useIsRTL,
  useReducedMotion,
  useTheme,
  type FigureWeight,
  type NumeralSize,
  type TypeVariant,
} from '@/theme';
import { Txt } from '@/ui/text';

export type { NumeralSize };
// none   the number is simply there.
// roll   every digit is its own column and rolls up to its place, the last
//        digit first and the others one beat (60 ms) apart, on the roll spring.
// count  the number counts up to its value, written frame by frame in the
//        app's own grouping. Needs `count`.
export type NumeralEntrance = 'none' | 'roll' | 'count';
// Follows the reading direction: start is the right-hand side in Hebrew. The
// figure itself always reads left to right.
export type NumeralAlign = 'start' | 'center' | 'end';

// What a count-up needs. The count runs on the UI thread, so the function
// that writes each frame must be a worklet.
export type NumeralCount = {
  // The number being counted to, as a number. The count ends on `value`,
  // exactly as the app wrote it.
  to: number;
  // Where the count starts. Default 0.
  from?: number;
  // Writes one frame of the count the way the app writes numbers: the same
  // decimals, grouping and separators as `value`. Its first line must be
  // 'worklet'. countFrame (below) does the grouping:
  //   const { group, decimal, style } = numbers.format;
  //   const format = (n: number) => {
  //     'worklet';
  //     return countFrame(n, 2, group, decimal, style === 'indian');
  //   };
  // A function that is not a worklet is not called: the number rolls instead.
  format: (value: number) => string;
};

export type NumeralProps = {
  // The number as the app writes it, digits and separators only: "4.68",
  // "12,34,567", "-3.5", "85%". The point, the separators, the minus and the
  // percent sign are part of the number. null, undefined or an empty string
  // is "not known": a dash is shown, never a zero.
  value: string | null | undefined;
  // The currency sign, before the digits: "₹", "$".
  prefix?: string;
  // The unit, after the digits: "M", "लाख", "K €". A unit that is only a
  // percent sign is set with the digits, as the brand asks.
  unit?: string;
  // hero 56, large 40, medium 28: a figure that stands by itself. It is a row
  // of its own and steps down this ladder when it does not fit. inline: a
  // figure inside a sentence or a row of text. It is text, so it can sit
  // inside a Txt and takes that text's size and line. Default large.
  size?: NumeralSize;
  // How the number arrives, once for each time it is put on screen. Default
  // none. An inline figure never moves. With reduced motion the number is
  // simply set.
  entrance?: NumeralEntrance;
  // For entrance="count".
  count?: NumeralCount;
  // A palette colour for the digits. Default ink.
  color?: string;
  // A palette colour for the currency sign and the unit. Default soft ink;
  // inside a sentence, the colour of the number.
  unitColor?: string;
  // 500 only for small figures in a table. Default 600.
  weight?: FigureWeight;
  // Where the figure sits in the width it is given. Default start.
  align?: NumeralAlign;
  // The whole figure as one spoken phrase, units as words: "7.12 lakh
  // rupees". When the value can be unknown, pass the words for that here
  // too. Default: the figure as written.
  accessibilityLabel?: string;
  testID?: string;
  // Layout only (flex, alignSelf, a width). Merged last. In a row beside
  // other things, give it `flex: 1` or `flexShrink: 1` so it knows its room.
  style?: StyleProp<ViewStyle>;
};

// --- Reading the figure ----------------------------------------------------------

// Marks that only steer the direction of text. The app puts them round
// amounts in Hebrew; a figure sets its own direction, so they are dropped.
// Built from code points so no direction mark sits in this file.
const mark = (code: number): string => String.fromCharCode(code);
const DIRECTION_MARKS = new RegExp(`[${mark(0x200e)}${mark(0x200f)}${mark(0x2066)}-${mark(0x2069)}]`, 'g');
// Starts and ends a run that reads left to right inside right-to-left text.
const LEFT_TO_RIGHT_RUN = mark(0x2066);
const END_OF_RUN = mark(0x2069);
// A space a line never breaks at: the unit stays with its number.
const NO_BREAK_SPACE = mark(0x00a0);
// "Not known" is a dash, never a zero.
const DASH = mark(0x2014);
const MINUS = mark(0x2212);
const PERCENT = '%';

const ANY_DIGIT = /[0-9]/;
const EVERY_DIGIT = /[0-9]/g;

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

type Figure = {
  // false when there is no number to show.
  known: boolean;
  // A minus or plus that stands in front of the currency sign.
  sign: string;
  // The currency sign.
  before: string;
  // The number, in the figures face.
  digits: string;
  // The unit.
  after: string;
};

function clean(text: string | null | undefined): string {
  return text === null || text === undefined ? '' : text.replace(DIRECTION_MARKS, '');
}

function readFigure(value: string | null | undefined, prefix: string | undefined, unit: string | undefined): Figure {
  const number = clean(value).trim();
  if (number === '' || number === DASH) return { known: false, sign: '', before: '', digits: DASH, after: '' };

  const before = clean(prefix).trim();
  const unitAsWritten = clean(unit);
  const after = unitAsWritten.trim();
  // A percent sign belongs to the number, with the space the language puts
  // before it.
  const percent = after === PERCENT;
  // "-₹1,234", not "₹-1,234".
  const first = number.charAt(0);
  const signed = before !== '' && (first === '-' || first === MINUS || first === '+');

  return {
    known: true,
    sign: signed ? first : '',
    before,
    digits: `${signed ? number.slice(1) : number}${percent ? unitAsWritten.trimEnd() : ''}`,
    after: percent ? '' : after,
  };
}

// The figure as one phrase, for a screen reader that was given no better one.
function figureWords(figure: Figure): string {
  const number = `${figure.sign}${figure.before}${figure.digits}`;
  return figure.after === '' ? number : `${number} ${figure.after}`;
}

// --- Counting up -----------------------------------------------------------------

// One frame of a count-up, written the way the final number is: the same
// decimals, the same grouping (Western, or lakh and crore) and the same
// separators. A worklet: it runs on the UI thread once per frame, so it uses
// no regular expressions. Call it from the `format` of a NumeralCount.
export function countFrame(value: number, decimals: number, group: string, decimal: string, indian: boolean): string {
  'worklet';
  const fixed = Math.abs(value).toFixed(decimals);
  const point = fixed.indexOf('.');
  const whole = point === -1 ? fixed : fixed.slice(0, point);
  const fraction = point === -1 ? '' : fixed.slice(point + 1);
  let grouped = '';
  let count = 0;
  let size = 3;
  for (let i = whole.length - 1; i >= 0; i--) {
    grouped = whole[i] + grouped;
    count++;
    if (count === size && i > 0) {
      grouped = group + grouped;
      count = 0;
      if (indian) size = 2;
    }
  }
  return `${value < 0 ? '-' : ''}${grouped}${fraction ? `${decimal}${fraction}` : ''}`;
}

// A count can only run with a number to count to and a frame writer the UI
// thread can call. In the browser there is one thread, so any function does.
function canCount(count: NumeralCount | undefined): count is NumeralCount {
  if (count === undefined || !Number.isFinite(count.to)) return false;
  return Platform.OS === 'web' || isWorkletFunction(count.format);
}

// --- Platform odds and ends ------------------------------------------------------

// Only the figure as a whole speaks: its parts are hidden from a screen
// reader. The browser takes aria-hidden; a phone needs the two older props.
const UNSPOKEN =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

// One spoken phrase for the whole figure. A phone calls that text; a browser
// only reads a label on something with a role, and an image is the one that
// fits (the brand board does the same).
const SPOKEN_AS = Platform.OS === 'web' ? ({ role: 'img' } as const) : ({ accessibilityRole: 'text' } as const);

// Digits never flip: a figure reads left to right in every language, Hebrew
// included. A phone takes the direction as a style. The browser preview
// rejects that style and takes the `dir` attribute, which React Native's own
// types do not know, so it is spread in untyped.
const LEFT_TO_RIGHT_STYLE = Platform.OS === 'web' ? null : ({ direction: 'ltr' } as const);
const LEFT_TO_RIGHT_PROPS: object = Platform.OS === 'web' ? { dir: 'ltr' } : {};

// Android pads the top and bottom of a line for tall accents. Digits have
// none, and the padding would put the rolling digits off their line.
const NO_FONT_PADDING: TextStyle | null = Platform.OS === 'android' ? { includeFontPadding: false } : null;

// --- Sizes -----------------------------------------------------------------------

type LadderSize = Exclude<NumeralSize, 'inline'>;

// A figure that does not fit steps down this ladder. It is never cut and
// never wrapped (brand spec, section 6).
const LADDER: readonly LadderSize[] = ['hero', 'large', 'medium'];

// Under the last step of the ladder a phone may still shrink the digits to
// fit, down to the smallest text the brand allows. A last resort: by then the
// screen should give the figure more room.
const SMALLEST_SCALE = MIN_FONT_SIZE / numeralSize.medium;

// Two widths measured in the same pass can differ by a rounding. Half a
// point is never a real overflow.
const FIT_SLACK = 0.5;

// The unit has no step of its own in the type scale. It takes the line of
// the nearest step that is not larger than it, in proportion, so a unit in
// Devanagari gets the taller line that script needs.
const UNIT_STEPS: readonly TypeVariant[] = ['title', 'heading', 'small'];

function unitLine(size: number, language: Language, words: string): number {
  let step: TypeVariant = 'small';
  for (const candidate of UNIT_STEPS) {
    if (size >= typeScale[candidate].size) {
      step = candidate;
      break;
    }
  }
  return Math.ceil((lineHeightFor(step, language, words) * size) / typeScale[step].size);
}

// The width of a view as it is laid out right now. On a phone and in the
// browser this is read in step with layout, so a figure can be measured and
// set to the size that fits before it is ever drawn.
function widthOf(node: ViewInstance | null): number | null {
  if (node === null || typeof node.getBoundingClientRect !== 'function') return null;
  const width = node.getBoundingClientRect().width;
  return Number.isFinite(width) && width > 0 ? width : null;
}

// --- Rolling digits --------------------------------------------------------------

// The ten digits, one to a line. A column shows one line of this strip.
const STRIP = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9';
const STRIP_DIGITS = 10;

type ColumnProps = {
  digit: number;
  // The column's place counted from the last digit, which is 0 and moves
  // first.
  order: number;
  textStyle: TextStyle;
  // How many columns of the number are still rolling.
  rolling: SharedValue<number>;
};

// One digit as a window onto a strip of ten. The strip is moved by transform
// alone, on the UI thread, from the digit on screen: a new digit mid-roll
// turns the column round without a jump.
function Column({ digit, order, textStyle, rolling }: ColumnProps) {
  // Which digit of the strip is level with the window: 0 at the start, the
  // column's own digit at rest.
  const level = useSharedValue(0);
  // How tall the strip of ten is, once it has been laid out. The phone's text
  // size changes it, so it is measured and not worked out.
  const strip = useSharedValue(0);

  useEffect(() => {
    level.set(
      withDelay(
        order * digitBeat,
        withSpring(digit, spring('roll'), (finished) => {
          // Counted on the UI thread, once, when this column has come to rest.
          if (finished) rolling.set(rolling.get() - 1);
        }),
      ),
    );
  }, [digit, order, rolling, level]);

  const roll = useAnimatedStyle<ViewStyle>(() => {
    return { transform: [{ translateY: -(level.get() * strip.get()) / STRIP_DIGITS }] };
  });

  return (
    <View style={styles.column}>
      {/* In the flow and unseen: it gives the column the width of its digit and the height of one line. */}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[textStyle, styles.unseen]}>
        {digit}
      </Text>
      <Animated.View
        onLayout={(event: LayoutChangeEvent) => strip.set(event.nativeEvent.layout.height)}
        style={[styles.strip, roll]}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[textStyle, styles.centred]}>
          {STRIP}
        </Text>
      </Animated.View>
    </View>
  );
}

type RollProps = {
  digits: string;
  textStyle: TextStyle;
  onSettled: (arrived: boolean) => void;
};

// The number as a row of columns, drawn over the real number while it rolls.
// Separators, the point and the minus stand still.
function Roll({ digits, textStyle, onSettled }: RollProps) {
  const chars = Array.from(digits);
  let total = 0;
  for (const char of chars) {
    if (isDigit(char)) total += 1;
  }

  // How many columns are still rolling. A column that travels far can end
  // after one that started later, so they are counted, on the UI thread, and
  // the numeral is told once: when the last one has come to rest.
  const rolling = useSharedValue(total);
  useAnimatedReaction(
    () => rolling.get() <= 0,
    (atRest, before) => {
      if (atRest && before !== true) scheduleOnRN(onSettled, true);
    },
  );

  const cells: ReactNode[] = [];
  let seen = 0;
  for (let at = 0; at < chars.length; at += 1) {
    const char = chars[at];
    // Keyed from the end, so the units column stays the units column when the
    // number grows.
    const fromEnd = chars.length - 1 - at;
    if (isDigit(char)) {
      cells.push(
        <Column
          key={`d${fromEnd}`}
          digit={Number(char)}
          order={total - 1 - seen}
          textStyle={textStyle}
          rolling={rolling}
        />,
      );
      seen += 1;
    } else {
      cells.push(
        <Text key={`s${fromEnd}`} maxFontSizeMultiplier={MAX_FONT_SCALE} style={textStyle}>
          {char}
        </Text>,
      );
    }
  }

  return <View style={styles.overlay}>{cells}</View>;
}

// --- Counting up, on screen ------------------------------------------------------

// Text that the UI thread can rewrite every frame without a render: a text
// input that cannot be edited, touched or focused. Proven on a phone with
// these versions.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type CounterProps = {
  count: NumeralCount;
  textStyle: TextStyle;
  onSettled: (arrived: boolean) => void;
};

function Counter({ count, textStyle, onSettled }: CounterProps) {
  const { to, format } = count;
  const from = count.from ?? 0;
  // 0 where the count starts, 1 where it ends. The roll spring does not pass
  // its end, and the frame is held inside the two ends as well: a count never
  // shows a number beyond the real one.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withSpring(1, spring('roll'), (finished) => {
        if (finished) scheduleOnRN(onSettled, true);
      }),
    );
  }, [progress, onSettled]);

  const animatedProps = useAnimatedProps(() => {
    const done = Math.min(Math.max(progress.get(), 0), 1);
    return { text: format(from + (to - from) * done) } as object;
  });

  return (
    <AnimatedTextInput
      editable={false}
      focusable={false}
      tabIndex={-1}
      underlineColorAndroid="transparent"
      defaultValue={format(from)}
      animatedProps={animatedProps}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[textStyle, styles.counter]}
    />
  );
}

// --- A figure inside a sentence --------------------------------------------------

type InlineProps = {
  figure: Figure;
  color?: string;
  unitColor?: string;
  weight: FigureWeight;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

// Text, so it can sit inside a Txt and wrap with the sentence. The digits are
// in the figures face; the sign and the unit are in the text face at weight
// 600, at the size of the sentence and in the colour of the number.
function InlineNumeral({ figure, color, unitColor, weight, accessibilityLabel, testID, style }: InlineProps) {
  const { colors } = useTheme();
  const rtl = useIsRTL();
  const digits = figureFont(weight);

  return (
    <Txt
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      color={figure.known ? color : (color ?? colors.inkFaint)}
      style={style}>
      {/* Inside Hebrew the whole amount stays left to right. */}
      {rtl ? LEFT_TO_RIGHT_RUN : null}
      {figure.sign !== '' ? <Text style={digits}>{figure.sign}</Text> : null}
      {figure.before !== '' ? (
        <Txt weight={numeralUnit.inlineWeight} color={unitColor}>
          {figure.before}
        </Txt>
      ) : null}
      <Text style={digits}>{figure.digits}</Text>
      {figure.after !== '' ? (
        <Txt weight={numeralUnit.inlineWeight} color={unitColor}>
          {`${NO_BREAK_SPACE}${figure.after}`}
        </Txt>
      ) : null}
      {rtl ? END_OF_RUN : null}
    </Txt>
  );
}

// --- A figure that stands by itself ------------------------------------------------

type Fit = {
  // What the figure's width depends on. A new shape starts from the size
  // that was asked for.
  shape: string;
  // How many steps down the ladder this shape had to go.
  down: number;
};

type StandingProps = {
  figure: Figure;
  size: LadderSize;
  entrance: NumeralEntrance;
  count?: NumeralCount;
  color?: string;
  unitColor?: string;
  weight: FigureWeight;
  align: NumeralAlign;
  spoken: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

function StandingNumeral({
  figure,
  size,
  entrance,
  count,
  color,
  unitColor,
  weight,
  align,
  spoken,
  testID,
  style,
}: StandingProps) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();

  // --- Which size fits ---
  //
  // The figure is drawn at the size asked for and measured in the same pass
  // as layout, before it is shown. If it is wider than its room it steps down
  // the ladder and is measured again. Digits are all one width, so the width
  // depends on the shape of the number ("0.00"), not on which digits it
  // holds: a number that changes while it is on screen keeps its size.
  const shape = `${size}/${fontScale}/${figure.sign}${figure.before}/${figure.digits.replace(EVERY_DIGIT, '0')}/${figure.after}`;
  const [fit, setFit] = useState<Fit>({ shape, down: 0 });
  const first = LADDER.indexOf(size);
  const steps = LADDER.length - 1 - first;
  const down = fit.shape === shape ? Math.min(fit.down, steps) : 0;
  const shown = LADDER[first + down];
  // On the last step there is nothing to step down to.
  const lowest = down >= steps;
  // There a phone lets the digits shrink to fit, as a last resort. The
  // browser preview cannot shrink text to fit: the figure overflows instead.
  const squeezes = lowest && Platform.OS !== 'web';

  const box = useRef<ViewInstance>(null);
  const line = useRef<ViewInstance>(null);
  // The room at the last moment a size proved too wide, so the larger size is
  // only tried again when there is more room than that.
  const tight = useRef({ shape: '', room: 0 });

  const settle = () => {
    if (lowest) return;
    const room = widthOf(box.current);
    const needed = widthOf(line.current);
    if (room === null || needed === null || needed <= room + FIT_SLACK) return;
    tight.current = { shape, room };
    setFit({ shape, down: down + 1 });
  };
  // After every render, before the screen is drawn. It ends by itself: each
  // step down is one render, and the ladder has three steps.
  useLayoutEffect(() => {
    settle();
  });

  const onRoom = () => {
    const room = widthOf(box.current);
    const wider = room !== null && tight.current.shape === shape && room > tight.current.room + FIT_SLACK;
    if (down > 0 && wider) setFit({ shape, down: 0 });
    else settle();
  };

  // --- How it arrives ---
  const wanted: NumeralEntrance =
    reduced || !figure.known || !ANY_DIGIT.test(figure.digits)
      ? 'none'
      : entrance === 'count'
        ? canCount(count)
          ? 'count'
          : 'roll'
        : entrance;
  // The entrance plays once for each time the numeral is put on screen.
  const [arrived, setArrived] = useState(false);
  const playing: NumeralEntrance = arrived ? 'none' : wanted;

  // --- What it is drawn with ---
  const grown = Math.min(fontScale, MAX_FONT_SCALE);
  const digitSize = numeralSize[shown];
  const digitStyle: TextStyle = {
    ...figureFont(weight),
    ...NO_FONT_PADDING,
    fontSize: digitSize,
    lineHeight: numeralLine[shown],
    color: color ?? (figure.known ? colors.ink : colors.inkFaint),
  };
  // Half the size of the digits and never under 14, in the text face, in soft
  // ink, on the baseline of the digits (brand spec, section 5).
  const unitSize = Math.max(numeralUnit.minSize, digitSize * numeralUnit.scale);
  const unitStyle = (words: string): TextStyle => ({
    ...textFont(numeralUnit.weight, language, words),
    fontSize: unitSize,
    lineHeight: unitLine(unitSize, language, words),
    color: unitColor ?? colors.inkSoft,
  });
  // 0.14 of the digit size between the digits and what stands beside them.
  // It grows with the phone's text size, as the digits do.
  const gap = numeralUnit.gap * digitSize * grown;

  return (
    <View
      ref={box}
      testID={testID}
      accessible
      {...SPOKEN_AS}
      accessibilityLabel={spoken}
      // A figure with nowhere to step down to needs no watching.
      onLayout={steps > 0 ? onRoom : undefined}
      style={[styles.box, ALIGN[align], lowest ? null : UNBOUNDED, style]}>
      <View
        ref={line}
        onLayout={steps > 0 ? settle : undefined}
        {...LEFT_TO_RIGHT_PROPS}
        {...UNSPOKEN}
        style={[styles.line, squeezes ? styles.gives : null]}>
        {figure.sign !== '' ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={digitStyle}>
            {figure.sign}
          </Text>
        ) : null}
        {figure.before !== '' ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[unitStyle(figure.before), { marginEnd: gap }]}>
            {figure.before}
          </Text>
        ) : null}
        <View style={squeezes ? styles.gives : styles.holds}>
          {/* The real number is always here. While the entrance plays it is unseen and keeps the room. */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={squeezes}
            minimumFontScale={squeezes ? SMALLEST_SCALE : undefined}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[digitStyle, playing === 'none' ? null : styles.unseen]}>
            {figure.digits}
          </Text>
          {playing === 'roll' ? <Roll digits={figure.digits} textStyle={digitStyle} onSettled={setArrived} /> : null}
          {playing === 'count' && count !== undefined ? (
            <Counter count={count} textStyle={digitStyle} onSettled={setArrived} />
          ) : null}
        </View>
        {figure.after !== '' ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[unitStyle(figure.after), { marginStart: gap }]}>
            {figure.after}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// A number set as a number (brand spec, section 5):
//   const parts = numbers.amountParts(total, type, column);
//   <Numeral size="hero" value={parts.number} prefix={parts.prefix} unit={parts.suffix} />
//   <Numeral value={numbers.count(rows)} entrance="roll" accessibilityLabel={t('home.rowsSpoken', { rows })} />
//   <Txt>{before}<Numeral size="inline" value="4.68" unit="M" />{after}</Txt>
//
// The digits are in the figures face with every digit the same width, so
// columns line up and rolling digits do not jump. The currency sign and the
// unit are in the text face, in soft ink, at half the size of the digits. A
// figure reads left to right in every language. To a screen reader it is one
// phrase, also while it rolls.
//
// A figure that stands by itself is never wrapped and never cut. When it does
// not fit the width it is given, it steps down the ladder: hero, large,
// medium. An unknown value is a dash.
//
// Needs AppStateProvider above it (the unit's font follows the app language).
export function Numeral({
  value,
  prefix,
  unit,
  size = 'large',
  entrance = 'none',
  count,
  color,
  unitColor,
  weight = '600',
  align = 'start',
  accessibilityLabel,
  testID,
  style,
}: NumeralProps) {
  const figure = readFigure(value, prefix, unit);

  if (size === 'inline') {
    return (
      <InlineNumeral
        figure={figure}
        color={color}
        unitColor={unitColor}
        weight={weight}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style}
      />
    );
  }

  return (
    <StandingNumeral
      figure={figure}
      size={size}
      entrance={entrance}
      count={count}
      color={color}
      unitColor={unitColor}
      weight={weight}
      align={align}
      spoken={accessibilityLabel ?? figureWords(figure)}
      testID={testID}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  // The room the figure is given. A row, so the figure inside keeps its own
  // width and `align` can place it.
  box: { flexDirection: 'row', maxWidth: '100%' },
  center: { justifyContent: 'center' },
  end: { justifyContent: 'flex-end' },
  // On a phone, a row that scrolls gives its content all the width it asks
  // for (this is how a sideways scroll view is laid out). Nothing scrolls
  // here: it only lets the figure be measured at its full width, so that it
  // can be compared with its room. What does not fit is clipped, and only
  // until the smaller size is set in the same pass.
  unbounded: { overflow: 'scroll' },
  // The sign, the digits and the unit on one baseline, left to right.
  line: { flexDirection: 'row', alignItems: 'baseline', flexShrink: 0, ...LEFT_TO_RIGHT_STYLE },
  holds: { flexShrink: 0 },
  gives: { flexShrink: 1 },
  // Still laid out, not drawn.
  unseen: { opacity: 0 },
  // Over the real number. Each column is measured by itself and rounded up
  // to a whole pixel, so the row of columns can come out a pixel or two wider
  // than the number under it. Centred, that is shared between the two ends
  // and no digit is seen to move when the real number takes over.
  overlay: { ...StyleSheet.absoluteFill, flexDirection: 'row', justifyContent: 'center', pointerEvents: 'none' },
  column: { overflow: 'hidden' },
  strip: { position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0 },
  centred: { textAlign: 'center' },
  // Digits start from the left in every language, so this is `left` and not
  // `start`.
  counter: { ...StyleSheet.absoluteFill, padding: 0, margin: 0, textAlign: 'left', pointerEvents: 'none' },
});

const ALIGN = { start: null, center: styles.center, end: styles.end } as const;
// The browser gives a row's content its full width already.
const UNBOUNDED = Platform.OS === 'web' ? null : styles.unbounded;
