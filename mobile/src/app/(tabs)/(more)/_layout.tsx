import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/state/app-state';

export default function MoreStack() {
  const t = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="more" options={{ title: t('more.title') }} />
      <Stack.Screen name="what-if" options={{ title: t('whatIf.title'), headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
