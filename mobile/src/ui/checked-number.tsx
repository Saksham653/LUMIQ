import { Children } from 'react';
import { Text, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useAppState } from '@/state/app-state';
import { ANSWER_LINE, duration, hasDevanagari, transition, useReducedMotion, useTheme } from '@/theme';
import { Numeral } from '@/ui/numeral';
import { Txt, type TxtProps } from '@/ui/text';

// checked    the phone worked this number out again and it matched: a band of
//            light behind it and a solid line under it.
// unmatched  the phone could not match it: a dashed line in the warning
//            colour, and no band.
// pending    the phone has not reached it yet: a dashed line in faint ink.
// plain      a number in a sentence that is not being checked at all.
export type CheckedNumberState = 'checked' | 'unmatched' | 'pending' | 'plain';

export type CheckedNumberProps = {
  // The number as the app writes it: "4.68", "12", "85%".
  value: string;
  // The currency sign, before the digits.
  prefix?: string;
  // The unit, after the digits: "M", "लाख".
  unit?: string;
  // Default plain. Only the phone's own check may set `checked`.
  state?: CheckedNumberState;
  // A tap on the number, to show how it was worked out. A shortcut for a
  // finger and nothing more: the number gets no pressed look, it cannot have
  // a 48 target inside a line of text, and a screen reader is not offered it.
  // The working must also be reachable from a control of its own under the
  // sentence.
  onPress?: () => void;
  // Heard only when the number stands by itself ("4.68 million, checked").
  // Inside a sentence the sentence is one element and its own label speaks.
  accessibilityLabel?: string;
  testID?: string;
};

// The room at the two ends of the band (brand spec, section 11: 5 at each
// end). A run of text inside a sentence cannot take padding, so the room is a
// narrow space that a line never breaks at, inside the band. The three marked
// states all carry it, so a number never changes width, and the sentence
// never moves, when the check reaches it.
const BAND_ROOM = String.fromCharCode(0x202f);

// The band comes in on the sweep curve, over the time the highlight takes to
// cross a number. A run of text cannot be moved or clipped, so the light
// arrives by colour and not by sweeping across (brand spec, section 11: the
// meaning never depends on the movement).
const BAND_ARRIVES = transition(['backgroundColor'], duration.sweep, 'sweep');

// A number inside a sentence, marked by what the phone's check found
// (brand spec, section 11):
//   <AnswerText>
//     Total revenue is <CheckedNumber state="checked" value="4.68" unit="M" /> across{' '}
//     <CheckedNumber state="unmatched" value="12" /> months.
//   </AnswerText>
//
// It is a run of the sentence's own text: it wraps with the sentence, follows
// its size, and reads left to right inside Hebrew. Checked is told by form as
// well as colour: the band and a solid line. Not matched is a dashed line and
// no band.
//
// The band and the line are the text's own background and underline, the one
// form every platform draws inside wrapped text. So the band has square
// corners and the platform chooses how thick the line is.
//
// With reduced motion the band is there at once.
//
// Needs AppStateProvider above it.
export function CheckedNumber({
  value,
  prefix,
  unit,
  state = 'plain',
  onPress,
  accessibilityLabel,
  testID,
}: CheckedNumberProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const look: TextStyle =
    state === 'checked'
      ? {
          backgroundColor: colors.lightSoft,
          textDecorationLine: 'underline',
          textDecorationStyle: 'solid',
          textDecorationColor: colors.checkedLine,
        }
      : state === 'unmatched'
        ? { textDecorationLine: 'underline', textDecorationStyle: 'dashed', textDecorationColor: colors.warn }
        : state === 'pending'
          ? { textDecorationLine: 'underline', textDecorationStyle: 'dashed', textDecorationColor: colors.inkFaint }
          : {};
  const room = state === 'plain' ? null : BAND_ROOM;

  // On its band the number and its unit are in the ink that was chosen for
  // the light. Anywhere else they take the ink of the sentence.
  const figure = (
    <Numeral
      size="inline"
      value={value}
      prefix={prefix}
      unit={unit}
      color={state === 'checked' ? colors.onLight : undefined}
    />
  );

  return (
    // The outer text gives the number the size and line of the sentence it
    // is in, or of body text when it stands by itself.
    <Txt
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      // An iPhone greys text that can be pressed while it is held. A checked
      // number has no pressed look.
      suppressHighlighting={onPress === undefined ? undefined : true}>
      {reduced ? (
        <Text style={look}>
          {room}
          {figure}
          {room}
        </Text>
      ) : (
        <Animated.Text style={[look, BAND_ARRIVES]}>
          {room}
          {figure}
          {room}
        </Animated.Text>
      )}
    </Txt>
  );
}

// Everything Txt takes, except the step of the type scale: an answer is body
// text.
export type AnswerTextProps = Omit<TxtProps, 'variant'>;

// The sentence checked numbers sit in: body text on a taller line, so the
// bands on two lines of a paragraph never touch (brand spec, section 11).
// This is the only place body text takes a taller line.
//   <AnswerText>{before}<CheckedNumber state="checked" value="12" />{after}</AnswerText>
//
// To a screen reader the sentence should be one element: pass
// accessibilityLabel with the whole sentence in words, each number followed
// by what the check found ("4.68 million, checked").
export function AnswerText({ style, children, ...rest }: AnswerTextProps) {
  const { language } = useAppState();
  const devanagari =
    language === 'hi' || Children.toArray(children).some((part) => typeof part === 'string' && hasDevanagari(part));

  return (
    <Txt
      {...rest}
      variant="body"
      style={[{ lineHeight: devanagari ? ANSWER_LINE.devanagari : ANSWER_LINE.latin }, style]}>
      {children}
    </Txt>
  );
}
