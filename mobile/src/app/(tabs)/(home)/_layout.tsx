import { Stack } from 'expo-router/stack';

import { useLocalT } from '@/i18n/local';
import { HOME_STRINGS } from '@/screens/home/strings';
import { useT } from '@/state/app-state';
import { useTheme } from '@/theme';

// The stack inside the Home tab, on the new paper and ink. Home draws its own
// top row (the logo and the language control), so it has no title bar. The
// Story opens above it, with a plain title bar and Back unless its own screen
// sets something else.
export default function HomeStack() {
  const t = useT();
  const tl = useLocalT(HOME_STRINGS);
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
      <Stack.Screen name="story" options={{ title: tl('story') }} />
    </Stack>
  );
}
