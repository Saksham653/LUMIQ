import { useEffect, useId, useRef, useState, type ReactNode, type Ref, type RefCallback } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useAppState } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  border,
  duration,
  lineHeightFor,
  radius,
  sizes,
  space,
  textFont,
  transition,
  typeScale,
  useReducedMotion,
  useTheme,
} from '@/theme';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';

// Room between the edge of a field and its text (brand spec, section 6). It
// is not a step of the spacing scale, so it lives here.
const FIELD_PADDING = 18;
// A field that is several lines from the start is about three lines tall and
// grows with its text. Twice the height of a one-line field; it belongs to
// this component.
const TALL_MIN_HEIGHT = sizes.control * 2;
// A field that grows with its text keeps one corner at every height: half of
// its one-line height, so it starts as a pill and does not change shape as it
// grows (brand spec, section 6).
const GROWING_CORNER = sizes.control / 2;
// A growing field stops growing after this many lines and scrolls inside, so
// a long question never pushes the rest of the screen under the keyboard. It
// belongs to this component.
const GROWING_LINES = 5;

// Everything TextInput takes passes through (value, onChangeText,
// placeholder, keyboardType, maxLength, onSubmitEditing, secureTextEntry, the
// accessibility props, testID), and `ref` reaches the input itself, so
// ref.current.focus() works.
export type FieldProps = Omit<TextInputProps, 'style' | 'ref'> & {
  ref?: Ref<TextInputInstance>;
  // The name of the field, in the app's language. It is drawn above the
  // field and stays there while a person types: a placeholder never stands in
  // for it.
  label: string;
  // Keeps the label for a screen reader and does not draw it. Only for a
  // field whose surroundings already name it to the eye (a search bar with
  // its magnifier, the question box of Ask).
  labelHidden?: boolean;
  // One quiet line of help under the field.
  hint?: string;
  // What is wrong and what to do next. It takes the hint's place, with the
  // error icon, and is read out when it appears. The edge of the field turns
  // to the failure red: never colour alone.
  error?: string;
  // Cannot be used: plain paper and faint ink. The text stays readable.
  disabled?: boolean;
  // Before the text: an icon, a currency sign. Drawn as given.
  prefix?: ReactNode;
  // After the text: a unit, a clear button. Drawn as given. Something that
  // can be pressed here keeps its whole 48 target.
  suffix?: ReactNode;
  // For a sentence (the question in Ask): one line to begin with, then as
  // many as the text needs, up to five; after that it scrolls inside. It
  // starts as a pill and keeps its corner as it grows. `multiline` by itself
  // is the other kind: several lines from the start, with the 14 corner.
  grows?: boolean;
  // Layout of the whole field, label and note included (flex, alignSelf, a
  // width). Merged last.
  style?: StyleProp<ViewStyle>;
};

// Hands a node to a ref of either kind, and gives back the clean-up a
// callback ref may return. For a component that keeps its own ref to the
// input and passes the caller's on as well:
//   const attach = (node: TextInputInstance | null) => {
//     mine.current = node;
//     return assignRef(ref, node);
//   };
// Call it inside the ref callback, never while rendering.
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): ReturnType<RefCallback<T>> {
  if (typeof ref === 'function') return ref(node);
  if (ref) ref.current = node;
  return undefined;
}

// What this file needs of a browser's text box: its height can be set, and it
// says how tall its text is.
type WebTextBox = { style?: { height: string }; scrollHeight?: number };

// A labelled text field:
//   <Field label={t('report.name')} value={name} onChangeText={setName} hint={t('report.nameHint')} />
//   <Field label={t('rows.show')} keyboardType="number-pad" suffix={<Txt tone="soft">{t('rows.unit')}</Txt>} ... />
//   <Field label={t('report.note')} multiline error={problem} ... />
//   <Field label={t('ask.question')} labelHidden grows placeholder={t('ask.placeholder')} ... />
//
// Paper with a 1.5 edge of faint ink; a pill for one line, a 14 corner for
// several. With the cursor in it the edge becomes 2 of the action blue, and
// the blue eases in: it is a second edge laid over the first, so the text
// never moves by half a pixel. A press anywhere on the field, its icon and
// its padding included, puts the cursor in it.
//
// Text is the `label` step of the scale in the font of what is typed
// (Devanagari, Latin, or the phone's own), and follows the phone's text size
// up to 1.6 times; the field grows with it.
//
// Needs AppStateProvider above it (it reads the app language).
export function Field({
  ref,
  label,
  labelHidden = false,
  hint,
  error,
  disabled = false,
  prefix,
  suffix,
  grows = false,
  style,
  multiline = false,
  editable = true,
  value,
  defaultValue,
  placeholder,
  accessibilityLabel,
  accessibilityHint,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  onChangeText,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const reduced = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const labelId = useId();
  const input = useRef<TextInputInstance | null>(null);
  // False until the field has been on screen once: a note that was there from
  // the start is not read out, only one that arrives later.
  const shownOnce = useRef(false);
  const [focused, setFocused] = useState(false);
  // What has been typed, for a field whose text the caller does not hold.
  const [typed, setTyped] = useState(defaultValue ?? '');

  const problem = error !== undefined && error !== '' ? error : undefined;
  const note = problem ?? (hint !== undefined && hint !== '' ? hint : undefined);
  const usable = !disabled && editable;
  // More than one line can show.
  const lines = grows || multiline;

  // A note that appears is read out by Android and by a browser (the live
  // region below). An iPhone has no live regions, so it is told directly.
  useEffect(() => {
    const arrivedLater = shownOnce.current;
    shownOnce.current = true;
    if (arrivedLater && Platform.OS === 'ios' && problem !== undefined) {
      AccessibilityInfo.announceForAccessibility(problem);
    }
  }, [problem]);

  // The font follows the words in the field: what is typed, or else the
  // placeholder, or else the app language.
  const shown = value ?? typed;
  const sample = shown || placeholder || undefined;

  const hasPrefix = prefix !== undefined && prefix !== null && prefix !== false;
  const hasSuffix = suffix !== undefined && suffix !== null && suffix !== false;
  const corner = grows ? GROWING_CORNER : multiline ? radius.control : radius.pill;

  // One line of the field's text, at the phone's text size.
  const line = lineHeightFor('label', language, sample);
  const scale = Math.min(fontScale, MAX_FONT_SCALE);
  // The first line of a field of several lines, with its padding: a slot is
  // this tall and sits at the top, so an icon or a button in it stays level
  // with the first line however far the field grows. Never under 48, so a
  // button in it keeps its target.
  const firstLine = Math.max(sizes.target, line * scale + space.md * 2);
  // Where a growing field stops growing.
  const tallest = line * scale * GROWING_LINES + space.md * 2;

  // A phone's own text box grows with its text. A browser's does not, so
  // there it is measured after every change and given its height.
  useEffect(() => {
    if (Platform.OS !== 'web' || !lines) return;
    const box = input.current as unknown as WebTextBox | null;
    if (box === null || box.style === undefined || box.scrollHeight === undefined) return;
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight}px`;
  }, [lines, shown, line, hasPrefix, hasSuffix]);

  const attach = (node: TextInputInstance | null) => {
    input.current = node;
    return assignRef(ref, node);
  };

  const change = (text: string) => {
    if (value === undefined) setTyped(text);
    onChangeText?.(text);
  };

  const focus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setFocused(true);
    onFocus?.(event);
  };

  const blur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  const words: TextStyle = {
    ...textFont(typeScale.label.weight, language, sample),
    fontSize: typeScale.label.size,
    // Several lines need the line of the script they are in. One line is left
    // to the phone's own text field, which centres its line by the font's own
    // measure; a forced line height shifts the text and the cursor there.
    lineHeight: lines ? line : undefined,
    maxHeight: grows ? tallest : undefined,
    color: disabled ? colors.disabledInk : colors.ink,
    // A slot brings its own room; without one the text keeps the field's 18.
    paddingStart: hasPrefix ? 0 : FIELD_PADDING,
    paddingEnd: hasSuffix ? 0 : FIELD_PADDING,
  };

  // The cursor and the selection handles are the action blue. Android paints
  // the selection itself in `selectionColor`, behind the text, so it takes the
  // soft blue there and the letters stay readable.
  const caret =
    Platform.OS === 'android'
      ? { cursorColor: colors.action, selectionHandleColor: colors.action, selectionColor: colors.actionSoft }
      : { selectionColor: colors.action };

  // A browser draws a text box of several lines two lines tall unless told
  // otherwise. A growing field starts as one. (On a phone the same prop would
  // pin the box to one line, so it is given to the browser only.)
  const oneRow = Platform.OS === 'web' && grows ? { rows: 1 } : {};

  // Android and a browser can point a field at the text that labels it, and
  // then read the label and what is typed. An iPhone takes the label itself,
  // and the drawn label is hidden from it so it is not read twice.
  const pointsAtLabel = !labelHidden && accessibilityLabel === undefined && Platform.OS !== 'ios';

  const ringEase = transition(['opacity'], duration.quick, 'standard', reduced);
  // The icon stays on the first line of the note at every text size.
  const noteLine = lineHeightFor('small', language, problem) * scale;
  const slotInLines = lines ? [styles.slotInLines, { minHeight: firstLine }] : null;

  return (
    <View style={[styles.field, style]}>
      {labelHidden ? null : (
        <Txt variant="small" weight="600" tone="soft" nativeID={labelId} accessible={Platform.OS !== 'ios'}>
          {label}
        </Txt>
      )}
      <View>
        <View>
          <View
            // A press on the padding or on an icon is a press on the field.
            // The input itself, and anything pressable in a slot, takes its
            // own touches first.
            onStartShouldSetResponder={() => usable}
            onResponderRelease={() => input.current?.focus()}
            style={[
              styles.box,
              multiline && !grows && styles.boxTall,
              {
                borderRadius: corner,
                backgroundColor: disabled ? colors.disabledFill : colors.surface,
                borderColor: disabled ? colors.disabledFill : colors.inkFaint,
              },
            ]}>
            {hasPrefix ? <View style={[styles.slot, styles.lead, slotInLines]}>{prefix}</View> : null}
            <TextInput
              underlineColorAndroid="transparent"
              {...caret}
              {...oneRow}
              {...rest}
              ref={attach}
              value={value}
              defaultValue={defaultValue}
              placeholder={placeholder}
              placeholderTextColor={disabled ? colors.disabledInk : colors.inkFaint}
              multiline={lines}
              editable={usable}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
              onChangeText={change}
              onFocus={focus}
              onBlur={blur}
              aria-labelledby={pointsAtLabel ? labelId : undefined}
              accessibilityLabel={pointsAtLabel ? undefined : (accessibilityLabel ?? label)}
              accessibilityHint={accessibilityHint ?? note}
              aria-disabled={disabled}
              style={[styles.input, lines && styles.inputLines, grows && styles.inputGrowing, words]}
            />
            {hasSuffix ? <View style={[styles.slot, styles.trail, slotInLines]}>{suffix}</View> : null}
          </View>
          {/* The two stronger edges, laid over the resting one. Each only fades. */}
          <Animated.View
            aria-hidden
            style={[
              styles.ring,
              { borderRadius: corner, borderColor: colors.bad, opacity: problem !== undefined && !disabled ? 1 : 0 },
              ringEase,
            ]}
          />
          <Animated.View
            aria-hidden
            style={[
              styles.ring,
              { borderRadius: corner, borderColor: colors.action, opacity: focused && usable ? 1 : 0 },
              ringEase,
            ]}
          />
        </View>
        {/* Always there, so a note that arrives in it is read out. It takes no room while empty. */}
        <View aria-live="polite" style={note !== undefined ? styles.noteRoom : undefined}>
          {problem !== undefined ? (
            <View style={styles.problem}>
              <View style={[styles.problemIcon, { minHeight: noteLine }]}>
                <Icon name="error" size={sizes.iconSmall} color={colors.bad} />
              </View>
              <Txt variant="small" tone="bad" style={styles.grow}>
                {problem}
              </Txt>
            </View>
          ) : note !== undefined ? (
            <Txt variant="small" tone="faint">
              {note}
            </Txt>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  // No fixed height: the field grows with its text. Colour and corner are
  // added at render.
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.control,
    borderWidth: border.control,
  },
  boxTall: { alignItems: 'flex-start', minHeight: TALL_MIN_HEIGHT },
  // The input fills the field from top to bottom, so all of it takes a press.
  // The browser's own focus outline is switched off (a solid line of no
  // width): the field draws its own edge.
  input: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    paddingVertical: 0,
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  inputLines: { paddingVertical: space.md, textAlignVertical: 'top' },
  // As tall as its own text, in the middle of the field: one line sits where
  // the line of a one-line field sits, and the field grows as lines are added.
  inputGrowing: { alignSelf: 'auto' },
  // A slot reaches the edge of the field and the full height of it, so a
  // button inside keeps its 48 target (a touch never reaches past its parent).
  slot: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: space.sm },
  // In a field of several lines a slot sits at the top, level with the first
  // line. Its height is added at render: it follows the text size.
  slotInLines: { alignSelf: 'flex-start' },
  lead: { paddingStart: space.lg, paddingEnd: space.sm },
  trail: { paddingStart: space.sm, paddingEnd: space.lg },
  ring: { ...StyleSheet.absoluteFill, borderWidth: border.strong, pointerEvents: 'none' },
  noteRoom: { paddingTop: space.sm },
  problem: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  problemIcon: { justifyContent: 'center' },
  // Takes the room that is left, so long words wrap inside it.
  grow: { flex: 1 },
});
