import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { useTheme } from '@/hooks/use-theme';

// The reassurance line shown wherever a file is added.
export function PrivacyNote({ text }: { text: string }) {
  const colors = useTheme();
  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      <AppIcon name={{ ios: 'lock.fill', android: 'lock' }} size={18} color={colors.success} />
      <AppText variant="small" tone="secondary" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  text: { flexShrink: 1, textAlign: 'center' },
});
