import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// One of the four checks, as a row of the "What we checked" group: a green
// tick and "OK" when clear; otherwise what was found in the warning colour,
// and "See it" (an action, so blue) to show where and how to fix it in a
// sunk well.
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

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <View style={styles.text}>
          <AppText variant="label">{title}</AppText>
          <AppText variant="small" tone={clear ? 'secondary' : 'accent'}>
            {summary}
          </AppText>
        </View>
        {clear ? (
          <View style={styles.ok} accessible accessibilityLabel={okLabel}>
            <AppIcon name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} size={20} color={colors.success} />
            <AppText variant="small" tone="success" snug style={styles.okText}>
              {okLabel}
            </AppText>
          </View>
        ) : (
          <Pressable
            onPress={() => setOpen((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${open ? hideLabel : seeLabel}: ${title}`}
            hitSlop={8}
            style={styles.see}>
            {/* Fixed width, full-width centred text: shrink-wrapped bold Hindi
                is measured too narrow on Android and loses letters. */}
            <AppText variant="label" tone="primary" style={styles.seeText}>
              {open ? hideLabel : seeLabel}
            </AppText>
          </Pressable>
        )}
      </View>
      {!clear && open && <View style={[styles.details, { backgroundColor: colors.surfaceVariant }]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: TouchTarget - 8 },
  text: { flex: 1, gap: 2 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  okText: { fontWeight: '700' },
  see: { minHeight: 44, width: 96, justifyContent: 'center' },
  seeText: { textAlign: 'center', alignSelf: 'stretch' },
  details: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
});
