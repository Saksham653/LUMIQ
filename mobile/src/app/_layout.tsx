import '@/polyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AppStateProvider, useAppState } from '@/state/app-state';
import { DatasetsProvider } from '@/state/datasets';
import { fixDirectionAtLaunch } from '@/state/layout-direction';

SplashScreen.preventAutoHideAsync();

// First launch shows Welcome; after that the app opens straight on the tabs.
// The splash stays up if the layout direction needs a restart first.
function RootStack() {
  const { onboarded, language } = useAppState();

  useEffect(() => {
    if (fixDirectionAtLaunch(language)) return;
    SplashScreen.hideAsync();
    // Only at launch: a language picked later restarts from its own screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppStateProvider>
        <DatasetsProvider>
          <RootStack />
        </DatasetsProvider>
      </AppStateProvider>
    </ThemeProvider>
  );
}
