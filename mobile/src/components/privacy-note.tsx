import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The reassurance line shown wherever a file is added or data is used: a
// small lock in soft ink and one plain sentence. `align` start keeps longer text easy to
// read; centre suits one short line under a button.
export function PrivacyNote({ text, align = 'center' }: { text: string; align?: 'center' | 'start' }) {
  const colors = useTheme();
  return (
    <View style={[styles.row, align === 'start' && styles.start]} accessible accessibilityLabel={text}>
      <AppIcon name={{ ios: 'lock.fill', android: 'lock' }} size={18} color={colors.textSecondary} />
      <AppText variant="small" tone="secondary" style={[styles.text, align === 'center' && styles.centered]}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  start: { alignItems: 'flex-start', justifyContent: 'flex-start' },
  text: { flexShrink: 1 },
  centered: { textAlign: 'center' },
});
