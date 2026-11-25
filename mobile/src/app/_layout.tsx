import '@/polyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { defineStrings, useLocalT } from '@/i18n/local';
import { AppStateProvider, useAppState } from '@/state/app-state';
import { DatasetsProvider } from '@/state/datasets';
import { fixDirectionAtLaunch } from '@/state/layout-direction';
import { FONT, palettes, useAppFonts, useTheme, type Scheme } from '@/theme';
import { ErrorBoundary, ErrorRecovery, type ErrorBoundaryRecovery } from '@/ui/error-boundary';
import { LaunchMoment } from '@/ui/launch-moment';
import { UIStringsProvider } from '@/ui/strings';
import { loadSettings, saveSettings } from '@/utils/settings-file';

SplashScreen.preventAutoHideAsync();

// The words of the safety net below: what a person reads if a screen crashes
// while it is drawn, in place of a blank white screen.
const CRASH_STRINGS = defineStrings({
  en: {
    title: 'Something broke',
    body: 'Your files are safe on this phone. Try again. If it keeps happening, close LUMIQ and open it again.',
    action: 'Try again',
  },
  hi: {
    title: 'कुछ गड़बड़ हो गई',
    body: 'आपकी फ़ाइलें इस फ़ोन पर सुरक्षित हैं। फिर कोशिश करें। अगर ऐसा बार-बार हो, तो LUMIQ बंद करके दोबारा खोलें।',
    action: 'फिर कोशिश करें',
  },
});

// The library's recovery screen (a torn sheet, what happened, one button that
// tries again) with the words above in the app's language. The words are
// given to this screen alone, so the rest of the library keeps whatever
// words it reads today.
function CrashScreen({ restart }: { restart: () => void }) {
  const t = useLocalT(CRASH_STRINGS);
  return (
    <UIStringsProvider strings={{ errorTitle: t('title'), errorBody: t('body'), errorAction: t('action') }}>
      <ErrorRecovery variant="screen" onRestart={restart} />
    </UIStringsProvider>
  );
}

function drawCrashScreen({ restart }: ErrorBoundaryRecovery) {
  return <CrashScreen restart={restart} />;
}

// Nothing leaves the phone: the failure goes to the phone's own log, for a
// tester's bug report. The person only ever sees the recovery screen.
function logCrash(error: unknown, info: { componentStack: string | null }) {
  console.warn('LUMIQ: a screen crashed while drawing; the recovery screen took its place', error, info.componentStack);
}

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

// The opening: the full moment on the very first open, only its end (the sun
// coming on) on every later one. In the browser preview "?opening=full" plays
// the full moment again, for showing it.
function openingMode(): 'full' | 'short' {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search.includes('opening=full')) {
    return 'full';
  }
  return loadSettings().launchSeen ? 'short' : 'full';
}

// First launch shows Welcome; after that the app opens straight on the tabs.
// The splash stays up if the layout direction needs a restart first, and
// until the fonts are in (`ready`): nothing is drawn before that, so no text
// is ever seen in the wrong font.
function RootStack({ ready }: { ready: boolean }) {
  const { onboarded, language } = useAppState();
  // True when the launch check below has asked for a restart.
  const restarting = useRef(false);
  // Decided once per start, before anything is drawn.
  const [opening] = useState(openingMode);
  const [opened, setOpened] = useState(false);

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
    <View style={styles.fill}>
      {/* The safety net: a crash while anything below draws (a screen, the
          launch moment) shows the calm recovery screen instead of a white
          one. It sits inside the providers, so the recovery screen has the
          theme and the language, and below the checks above, so the splash
          still hides and a restart for the layout direction is still known.
          Trying again draws the screens afresh and skips the launch moment,
          in case that was what broke. */}
      <ErrorBoundary variant="screen" fallback={drawCrashScreen} onError={logCrash} onRestart={() => setOpened(true)}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            {/* The Story covers the whole screen, the tab bar too: it rises
                over the tabs and its close button takes it away. */}
            <Stack.Screen name="story" options={{ animation: 'slide_from_bottom' }} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="welcome" />
          </Stack.Protected>
        </Stack>
        {/* Over everything, once per start. Its first frame is the phone's start
            screen (the tile with the still L), so nothing jumps; the browser has
            no start screen, so there the L draws itself. */}
        {!opened ? (
          <LaunchMoment
            mode={opening}
            drawMark={Platform.OS === 'web'}
            style={StyleSheet.absoluteFill}
            onDone={() => {
              setOpened(true);
              if (opening === 'full') saveSettings({ ...loadSettings(), launchSeen: true });
            }}
          />
        ) : null}
      </ErrorBoundary>
    </View>
  );
}

export default function RootLayout() {
  // The scheme on screen: the choice made inside the app (Light or Dark), or
  // the phone's own when the app follows the phone.
  const { scheme } = useTheme();
  const ready = useFontsOrBackstop();
  return (
    // The gesture root: drags and taps on the charts and sliders need it
    // around the whole app.
    <GestureHandlerRootView style={styles.fill}>
      <ThemeProvider value={NAVIGATION_THEME[scheme]}>
        {/* Status bar icons follow the theme on screen: dark on light screens, light on dark. */}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <AppStateProvider>
          <DatasetsProvider>
            <RootStack ready={ready} />
          </DatasetsProvider>
        </AppStateProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
