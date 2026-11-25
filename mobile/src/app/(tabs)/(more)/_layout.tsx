import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/state/app-state';
import { useTheme } from '@/theme';

// Opened from Home, What if, File check, Report and Language switch to this
// tab; the anchor puts More under them, so Back lands on More.
export const unstable_settings = {
  anchor: 'more',
};

export default function MoreStack() {
  const t = useT();
  const shared = useStackOptions();
  const { colors } = useTheme();

  // The header of this tab in the new look: the paper of the screen under it,
  // ink for the title, and the blue as text for the way back. Laid over the
  // shared options, which still carry the old colours.
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
      <Stack.Screen name="more" options={{ title: t('more.title') }} />
      <Stack.Screen name="what-if" options={{ title: t('whatIf.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="file-check" options={{ title: t('check.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="report" options={{ title: t('report.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="language" options={{ title: t('language.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="numbers" options={{ title: t('numbers.title'), headerLargeTitleEnabled: false }} />
      {/* A native sheet rather than a dropdown. A sheet is the lighter paper. */}
      <Stack.Screen
        name="currency"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: [0.75, 1],
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
