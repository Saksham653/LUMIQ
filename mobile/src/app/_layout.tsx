import '@/polyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AppStateProvider, useAppState } from '@/state/app-state';
import { DatasetsProvider } from '@/state/datasets';

SplashScreen.preventAutoHideAsync();

// First launch shows Welcome; after that the app opens straight on the tabs.
function RootStack() {
  const { onboarded } = useAppState();

  useEffect(() => {
    SplashScreen.hideAsync();
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
