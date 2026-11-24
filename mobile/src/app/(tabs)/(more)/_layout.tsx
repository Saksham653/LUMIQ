import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/state/app-state';

export default function MoreStack() {
  const t = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="more" options={{ title: t('more.title') }} />
      <Stack.Screen name="what-if" options={{ title: t('whatIf.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="file-check" options={{ title: t('check.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="report" options={{ title: t('report.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="language" options={{ title: t('language.title'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="numbers" options={{ title: t('numbers.title'), headerLargeTitleEnabled: false }} />
      {/* A native sheet rather than a dropdown. */}
      <Stack.Screen
        name="currency"
        options={{ presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }}
      />
    </Stack>
  );
}
