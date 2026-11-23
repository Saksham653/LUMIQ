import { Stack } from 'expo-router/stack';

import { useStackOptions } from '@/components/stack-options';
import { useT } from '@/state/app-state';

export default function InsightsStack() {
  const t = useT();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="insights" options={{ title: t('tabs.insights') }} />
    </Stack>
  );
}
