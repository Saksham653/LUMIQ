import '@/polyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { AppStateProvider, useAppState } from '@/state/app-state';
import { DatasetsProvider } from '@/state/datasets';
import { fixDirectionAtLaunch } from '@/state/layout-direction';
import { FONT, palettes, useAppFonts, useTheme, type Scheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// The start screen is held for the brand fonts for at most this long (brand
// spec, section 5, rule 6). After it the app opens in the phone's own font.
const FONT_BACKSTOP_MS = 900;

// The fonts the navigator uses for what it draws itself: the title bar of
// every stack. On a phone with the brand fonts in the app that is the text
// face (a title is semibold; the large title on iPhone is bold); a title in
// a script the face does not hold (Hindi, Hebrew, Japanese, Chinese) falls to
// the phone's own font by itself. In the browser, and with the brand fonts
// switched off, the navigator keeps its own.
function navigationFonts(): typeof DefaultTheme.fonts {
  const regular = FONT.text['400'];
  const semibold = FONT.text['600'];
  const bold = FONT.text['700'];
  if (Platform.OS === 'web' || regular === undefined || semibold === undefined || bold === undefined) {
    return DefaultTheme.fonts;
  }
  return {
    regular: { fontFamily: regular, fontWeight: '400' },
    // The title bar on Android takes `medium`, on iPhone `bold`.
    medium: { fontFamily: semibold, fontWeight: '600' },
    bold: { fontFamily: semibold, fontWeight: '600' },
    heavy: { fontFamily: bold, fontWeight: '700' },
  };
}
const NAVIGATION_FONTS = navigationFonts();

// What the navigator paints by itself (the gap behind a screen while it
// slides, the default header), in the paper and ink of each scheme, so
// nothing flashes white or black between screens.
const NAVIGATION_THEME = {
  light: {
    ...DefaultTheme,
    fonts: NAVIGATION_FONTS,
    colors: {
      ...DefaultTheme.colors,
      primary: palettes.light.actionText,
      background: palettes.light.ground,
      card: palettes.light.ground,
      text: palettes.light.ink,
      border: palettes.light.line,
      notification: palettes.light.bad,
    },
  },
  dark: {
    ...DarkTheme,
    fonts: NAVIGATION_FONTS,
    colors: {
      ...DarkTheme.colors,
      primary: palettes.dark.actionText,
      background: palettes.dark.ground,
      card: palettes.dark.ground,
      text: palettes.dark.ink,
      border: palettes.dark.line,
      notification: palettes.dark.bad,
    },
  },
} satisfies Record<Scheme, typeof DefaultTheme>;

// True once text can be drawn in its final fonts, or once the backstop has
// passed: a font that is slow or missing never holds the app.
function useFontsOrBackstop(): boolean {
  const loaded = useAppFonts();
  const [waitedEnough, setWaitedEnough] = useState(false);
  useEffect(() => {
    const backstop = setTimeout(() => setWaitedEnough(true), FONT_BACKSTOP_MS);
    return () => clearTimeout(backstop);
  }, []);
  return loaded || waitedEnough;
}

// First launch shows Welcome; after that the app opens straight on the tabs.
// The splash stays up if the layout direction needs a restart first, and
// until the fonts are in (`ready`): nothing is drawn before that, so no text
// is ever seen in the wrong font.
function RootStack({ ready }: { ready: boolean }) {
  const { onboarded, language } = useAppState();
  // True when the launch check below has asked for a restart.
  const restarting = useRef(false);

  useEffect(() => {
    if (fixDirectionAtLaunch(language)) {
      restarting.current = true;
      // A restart normally ends this JS before the timer fires; if it never
      // comes, open the app anyway rather than leave the splash up.
      const fallback = setTimeout(() => SplashScreen.hideAsync(), 2000);
      return () => clearTimeout(fallback);
    }
    // Only at launch: a language picked later restarts from its own screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Runs after the effect above, so the restart is already known. The screens
  // are on the page by the time this hides the splash.
  useEffect(() => {
    if (ready && !restarting.current) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

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
  // The scheme on screen: the choice made inside the app (Light or Dark), or
  // the phone's own when the app follows the phone.
  const { scheme } = useTheme();
  const ready = useFontsOrBackstop();
  return (
    <ThemeProvider value={NAVIGATION_THEME[scheme]}>
      {/* Status bar icons follow the theme on screen: dark on light screens, light on dark. */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppStateProvider>
        <DatasetsProvider>
          <RootStack ready={ready} />
        </DatasetsProvider>
      </AppStateProvider>
    </ThemeProvider>
  );
}
