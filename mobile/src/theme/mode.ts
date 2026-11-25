import { useSyncExternalStore } from 'react';
import { Appearance, AppState, Platform } from 'react-native';

import { loadSettings, saveSettings } from '@/utils/settings-file';

// The person's choice of theme: follow the phone, or always light, or always
// dark. A small store outside React (no context, no provider): any component
// reads it with useThemeMode(), anything may call setThemeMode().
//
// The choice is kept in the app's settings file on the phone and read once
// when this module loads, so the very first frame is already in the right
// theme.

export type ThemeMode = 'system' | 'light' | 'dark';

// In the order a picker shows them.
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function storedMode(): ThemeMode {
  const stored = loadSettings().themeMode;
  return isThemeMode(stored) ? stored : 'system';
}

let mode: ThemeMode = storedMode();
const listeners = new Set<() => void>();

// The phone's own surfaces (the keyboard, system dialogs, native bars) and
// everything that reads useColorScheme() follow the choice too, so old and new
// screens never disagree. The browser has no such switch: there the choice
// lives in useTheme() alone.
function applyToPhone(next: ThemeMode): void {
  if (Platform.OS === 'web') return;
  try {
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  } catch {
    // A phone that cannot be told still gets the right colours from useTheme().
  }
}

// Writes the choice into the settings file, keeping everything else in it.
// Nothing is written when the file already agrees.
function persist(): void {
  if (storedMode() === mode) return;
  saveSettings({ ...loadSettings(), themeMode: mode });
}

if (mode !== 'system') applyToPhone(mode);

// The settings file has a second writer: the app state provider keeps its own
// copy of the settings in memory and writes the whole file on every change
// (language, number style, open file), so its copy of the theme can be an old
// one. Putting the choice back whenever the app leaves the screen keeps the
// file right for the next start. (The lasting fix is for that provider to
// write `themeMode: getThemeMode()` itself.)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') persist();
  });
}

export function getThemeMode(): ThemeMode {
  return mode;
}

export function subscribeThemeMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Changes the theme at once and remembers it. The store changes and every
// reader is told before the file is written.
export function setThemeMode(next: ThemeMode): void {
  if (next === mode) return;
  mode = next;
  applyToPhone(next);
  listeners.forEach((listener) => listener());
  persist();
}

// The chosen mode, kept up to date.
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeThemeMode, getThemeMode, getThemeMode);
}
