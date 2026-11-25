import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useAppState } from '@/state/app-state';
import { MAX_FONT_SCALE, border, radius, rhythm, sizes, space, textFont, typeScale, useTheme } from '@/theme';
import { IconButton } from '@/ui/icon-button';
import { Press } from '@/ui/press';
import { Txt } from '@/ui/text';

// Room at the two ends of the field (brand spec, section 6). It is not a step
// of the spacing scale, so it lives here.
const FIELD_PADDING = 18;
// The Ask field grows with its text and keeps the corner of a 52 pill at
// every height (brand board, the Ask field).
const FIELD_CORNER = sizes.control / 2;
// The tallest the field grows before its text scrolls inside it.
const FIELD_MAX_HEIGHT = 140;

// The question box at the bottom of Ask, with one round button beside it:
// send (the action blue, once there is something to send), or stop (neutral)
// while an answer is on its way. Typing itself never animates.
export function AskInput({
  value,
  onChangeText,
  onSend,
  onStop,
  busy,
  disabled,
  placeholder,
  sendLabel,
  stopLabel,
  footer,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  disabled: boolean;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  footer: string | null;
}) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const [focused, setFocused] = useState(false);
  const canSend = !busy && !disabled && value.trim().length > 0;

  // A field that cannot be used is plain paper. A focused one takes the blue
  // edge; the width of the edge never changes, so nothing moves.
  const fill = disabled ? colors.disabledFill : colors.surface;
  const edge = disabled ? colors.disabledFill : focused ? colors.action : colors.inkFaint;

  return (
    <View style={[styles.bar, { backgroundColor: colors.ground }]}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          editable={!disabled}
          multiline
          maxLength={500}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            textFont('400', language, value === '' ? placeholder : value),
            { color: disabled ? colors.disabledInk : colors.ink, backgroundColor: fill, borderColor: edge },
          ]}
        />
        {busy ? (
          <Press
            weight="sm"
            onPress={onStop}
            accessibilityLabel={stopLabel}
            style={[styles.stop, { backgroundColor: colors.surfaceSunk }]}>
            <View style={[styles.stopMark, { backgroundColor: colors.ink }]} />
          </Press>
        ) : (
          <IconButton
            icon="send"
            variant="main"
            size="lg"
            accessibilityLabel={sendLabel}
            disabled={!canSend}
            onPress={onSend}
          />
        )}
      </View>
      {footer ? (
        <Txt variant="small" tone="soft" align="center" style={styles.footer}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: rhythm.screenEdge, paddingVertical: space.sm, gap: space.sm },
  // The button stays at the foot of the row while the field grows.
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    minHeight: sizes.control,
    maxHeight: FIELD_MAX_HEIGHT,
    fontSize: typeScale.body.size,
    paddingHorizontal: FIELD_PADDING,
    paddingTop: space.md,
    paddingBottom: space.md,
    textAlignVertical: 'center',
    borderWidth: border.control,
    borderRadius: FIELD_CORNER,
  },
  // The stop button: the size of the send button, on quiet paper.
  stop: {
    width: sizes.control,
    height: sizes.control,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMark: { width: space.lg, height: space.lg, borderRadius: space.xs },
  // Centred text is given the bar's whole width.
  footer: { alignSelf: 'stretch' },
});
