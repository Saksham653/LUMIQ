import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { FontSize, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The question box at the bottom of Ask, with one big round button: send,
// or stop while an answer is on its way.
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
  const colors = useTheme();
  const canSend = !busy && !disabled && value.trim().length > 0;
  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          editable={!disabled}
          multiline
          maxLength={500}
          maxFontSizeMultiplier={1.6}
          accessibilityLabel={placeholder}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Pressable
          onPress={busy ? onStop : onSend}
          disabled={!busy && !canSend}
          accessibilityRole="button"
          accessibilityLabel={busy ? stopLabel : sendLabel}
          accessibilityState={{ disabled: !busy && !canSend }}
          hitSlop={4}
          style={[
            styles.send,
            { backgroundColor: busy ? colors.accentContainer : canSend ? colors.primary : colors.border },
          ]}>
          <AppIcon
            name={busy ? { ios: 'stop.fill', android: 'stop' } : { ios: 'arrow.up', android: 'send' }}
            size={24}
            color={busy ? colors.accent : colors.onPrimary}
          />
        </Pressable>
      </View>
      {footer ? (
        <AppText variant="small" tone="secondary" style={styles.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  input: {
    flex: 1,
    minHeight: TouchTarget,
    maxHeight: 140,
    fontSize: FontSize.body,
    paddingHorizontal: Spacing.lg,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  send: { width: TouchTarget, height: TouchTarget, borderRadius: TouchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  footer: { textAlign: 'center' },
});
