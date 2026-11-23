import { Button, Host, Text } from '@expo/ui';

import { useTheme } from '@/hooks/use-theme';

// A full-width, 56dp native button (Jetpack Compose on Android, SwiftUI on
// iOS) with an 18pt bold label, tinted from the LUMIQ primary colour.
export function BigButton({
  label,
  onPress,
  variant = 'filled',
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
}) {
  const colors = useTheme();
  return (
    <Host matchContents={{ vertical: true }} seedColor={colors.primary} style={{ alignSelf: 'stretch' }}>
      <Button variant={variant} onPress={onPress} style={{ width: '100%', height: 56 }}>
        <Text textStyle={{ fontSize: 18, fontWeight: '700' }}>{label}</Text>
      </Button>
    </Host>
  );
}
