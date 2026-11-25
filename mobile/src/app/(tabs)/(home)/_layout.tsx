import { Stack } from 'expo-router/stack';

import { useT } from '@/state/app-state';
import { useTheme } from '@/theme';

// The stack inside the Home tab, on the new paper and ink. Home draws its own
// top row (the logo and the language control), so it has no title bar. The
// Story is not here: it opens over the tabs from the root stack (app/story.tsx).
export default function HomeStack() {
  const t = useT();
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.ground },
        headerTitleStyle: { color: colors.ink },
        headerTintColor: colors.actionText,
        contentStyle: { backgroundColor: colors.ground },
      }}>
      <Stack.Screen name="index" options={{ title: t('home.title'), headerShown: false }} />
    </Stack>
  );
}
