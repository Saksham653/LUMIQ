import { StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/pressable-scale';
import { CSS_EASE_OUT } from '@/constants/motion';
import { FontSize, Motion, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The question box at the bottom of Ask, with one big round button: send
// (cyan, an action, once there is something to send), or stop (neutral)
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
  const colors = useTheme();
  const canSend = !busy && !disabled && value.trim().length > 0;
  const background = busy ? colors.surfaceVariant : canSend ? colors.primary : colors.surfaceVariant;
  return (
    <View style={[styles.bar, { backgroundColor: colors.background }]}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          editable={!disabled}
          multiline
          maxLength={500}
          maxFontSizeMultiplier={1.6}
          accessibilityLabel={placeholder}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
        />
        <PressableScale
          onPress={busy ? onStop : onSend}
          disabled={!busy && !canSend}
          accessibilityRole="button"
          accessibilityLabel={busy ? stopLabel : sendLabel}
          accessibilityState={{ disabled: !busy && !canSend }}
          hitSlop={4}>
          <Animated.View
            style={[
              styles.send,
              {
                backgroundColor: background,
                transitionProperty: 'backgroundColor',
                transitionDuration: Motion.fast,
                transitionTimingFunction: CSS_EASE_OUT,
              },
            ]}>
            {busy ? (
              <View style={[styles.stop, { backgroundColor: colors.text }]} />
            ) : (
              <AppIcon
                name={{ ios: 'arrow.up', android: 'arrow_upward' }}
                size={24}
                color={canSend ? colors.onPrimary : colors.textTertiary}
              />
            )}
          </Animated.View>
        </PressableScale>
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
  bar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  input: {
    flex: 1,
    minHeight: TouchTarget,
    maxHeight: 140,
    fontSize: FontSize.body,
    paddingHorizontal: Spacing.xl,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: Radius.xxl,
  },
  send: { width: TouchTarget, height: TouchTarget, borderRadius: TouchTarget / 2, alignItems: 'center', justifyContent: 'center' },
  stop: { width: 16, height: 16, borderRadius: 3 },
  footer: { textAlign: 'center', alignSelf: 'stretch' },
});
