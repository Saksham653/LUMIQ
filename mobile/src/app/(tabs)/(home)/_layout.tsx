import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/state/app-state';

export default function HomeStack() {
  const t = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: t('home.title') }} />
    </Stack>
  );
}
