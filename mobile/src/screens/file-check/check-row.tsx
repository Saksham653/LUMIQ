import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One of the four checks: a green tick and "OK" when clear; otherwise an amber
// warning, what was found, and "See it" to show where and how to fix it.
export function CheckRow({
  title,
  summary,
  clear,
  okLabel,
  seeLabel,
  hideLabel,
  children,
}: {
  title: string;
  summary: string;
  clear: boolean;
  okLabel: string;
  seeLabel: string;
  hideLabel: string;
  children?: ReactNode;
}) {
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const tone = clear ? colors.success : colors.accent;

  return (
    <View style={[styles.row, { backgroundColor: clear ? colors.background : colors.accentContainer }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: clear ? colors.successContainer : colors.card }]}>
          <AppIcon
            name={clear ? { ios: 'checkmark', android: 'check' } : { ios: 'exclamationmark.triangle.fill', android: 'warning' }}
            size={20}
            color={tone}
          />
        </View>
        <View style={styles.text}>
          <AppText variant="label">{title}</AppText>
          <AppText variant="small" tone={clear ? 'secondary' : 'accent'}>
            {summary}
          </AppText>
        </View>
        {clear ? (
          <AppText variant="small" tone="success" style={styles.ok}>
            {okLabel}
          </AppText>
        ) : (
          <Pressable
            onPress={() => setOpen((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${open ? hideLabel : seeLabel}: ${title}`}
            style={[styles.see, { backgroundColor: colors.card, borderColor: tone }]}>
            <AppText variant="small" style={[styles.seeText, { color: tone }]}>
              {open ? hideLabel : seeLabel}
            </AppText>
          </Pressable>
        )}
      </View>
      {!clear && open && <View style={[styles.details, { borderTopColor: colors.border }]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: TouchTarget - 8 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  ok: { fontWeight: '700' },
  // A fixed width with full-width, centred text: shrink-wrapped bold Hindi is
  // measured too narrow on Android and loses letters.
  see: { minHeight: 40, width: 92, paddingHorizontal: Spacing.sm, borderRadius: Radius.pill, borderWidth: 1, justifyContent: 'center' },
  seeText: { fontWeight: '700', textAlign: 'center', alignSelf: 'stretch' },
  details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.xs },
});
