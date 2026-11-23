import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/state/app-state';

export default function AskStack() {
  const t = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="ask" options={{ title: t('tabs.ask') }} />
    </Stack>
  );
}
