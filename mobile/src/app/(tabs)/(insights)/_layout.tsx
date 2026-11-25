import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/state/app-state';
import { useTheme } from '@/theme';

// The stack inside the Insights tab. The header in the new look: the paper of
// the screen under it, ink for the title and the blue as text for the way
// back, laid over the shared options, which still carry the old colours.
export default function InsightsStack() {
  const t = useT();
  const shared = useStackOptions();
  const { colors } = useTheme();
  const screenOptions = {
    ...shared,
    headerStyle: { backgroundColor: colors.ground },
    headerLargeStyle: { backgroundColor: colors.ground },
    headerTitleStyle: { color: colors.ink },
    headerLargeTitleStyle: { color: colors.ink },
    headerTintColor: colors.actionText,
    contentStyle: { backgroundColor: colors.ground },
  };
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="insights" options={{ title: t('tabs.insights') }} />
    </Stack>
  );
}
