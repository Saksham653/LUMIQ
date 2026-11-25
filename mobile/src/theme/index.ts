import { useSyncExternalStore } from 'react';
import { I18nManager, Platform, useColorScheme } from 'react-native';

import { palettes, type Palette, type Scheme } from './colors';
import { useThemeMode, type ThemeMode } from './mode';

// The LUMIQ design tokens ("Roshni"), the one entry point:
//   import { useTheme, space, radius, typeScale, lift, spring, duration } from '@/theme';
//
// House rule: colours come from useTheme(), text sizes from the type scale,
// gaps from space, corners from radius, depth from lift(), movement from
// motion. No raw hex, font size, duration or spring number outside this
// folder. Every value here is copied from the locked brand tokens.

export * from './colors';
export * from './fonts';
export * from './lift';
export * from './mode';
export * from './motion';
export * from './radius';
export * from './space';
export * from './type';

// --- The theme -------------------------------------------------------------

export type Theme = {
  // The colours for the scheme on screen. Read roles from here, never a hex.
  colors: Palette;
  // What is on screen right now.
  scheme: Scheme;
  // What the person chose: follow the phone, light, or dark.
  mode: ThemeMode;
};

function themesFor(mode: ThemeMode): Record<Scheme, Theme> {
  return {
    light: { colors: palettes.light, scheme: 'light', mode },
    dark: { colors: palettes.dark, scheme: 'dark', mode },
  };
}

// One object per mode and scheme, so the same theme is always the same
// object.
const THEMES: Record<ThemeMode, Record<Scheme, Theme>> = {
  system: themesFor('system'),
  light: themesFor('light'),
  dark: themesFor('dark'),
};

// The theme for the chosen mode and the phone's scheme:
//   const { colors, scheme, mode } = useTheme();
// It follows the phone while the mode is 'system', and repaints when either
// changes.
export function useTheme(): Theme {
  const mode = useThemeMode();
  const phone = useColorScheme();
  const scheme: Scheme = mode === 'system' ? (phone === 'dark' ? 'dark' : 'light') : mode;
  return THEMES[mode][scheme];
}

// --- Layout direction --------------------------------------------------------

// Hebrew runs right to left: the layout mirrors and icons that point flip.
// Write `start` and `end` in styles, never `left` and `right`, and rows mirror
// by themselves. Ask useIsRTL() only for what a style cannot say: the sign of
// a translateX, the side a sweep starts from, an icon to flip. Digits, the
// time axis of a chart, the mark, the wordmark and the stamp never flip.
//
// On a phone the direction is fixed when the app starts (switching to or from
// Hebrew restarts it), so it never changes while the app runs. The browser
// preview cannot be restarted into a direction, so there it is a small store:
// whoever sets dir="rtl" on the preview's root view also calls
// setWebDirection(true).

let webRTL = false;
const directionListeners = new Set<() => void>();

// Browser preview only (it does nothing on a phone).
export function setWebDirection(rtl: boolean): void {
  if (Platform.OS !== 'web' || rtl === webRTL) return;
  webRTL = rtl;
  directionListeners.forEach((listener) => listener());
}

// Outside React (a worklet's setup, a plain function). Inside a component use
// useIsRTL().
export function isRTL(): boolean {
  return Platform.OS === 'web' ? webRTL : I18nManager.isRTL;
}

function subscribeDirection(listener: () => void): () => void {
  directionListeners.add(listener);
  return () => {
    directionListeners.delete(listener);
  };
}

// True when the layout runs right to left.
export function useIsRTL(): boolean {
  return useSyncExternalStore(subscribeDirection, isRTL, isRTL);
}

// For a row that must read left to right in every language (digits, a
// chart's time axis, the mark). Phones honour `direction`; the browser preview
// has no such style on a view and warns, so there it is left out.
export const keepLeftToRight = Platform.OS === 'web' ? {} : ({ direction: 'ltr' } as const);
