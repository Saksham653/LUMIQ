// The browser preview's twin of settings-file.ts. A browser has no app folder
// to write a file into (expo-file-system is an empty stand-in there and
// throws), so the same settings are kept in the browser's own storage for
// this address (localStorage). Metro picks this file for the web and
// settings-file.ts for Android and iOS: the two must keep the same exports.
//
// Nothing here leaves the computer: the browser keeps it on its own disk.

// Types only, so nothing is loaded when the page runs: the shapes live in the
// phone's file and this one follows them.
import type { StoredSettings } from './settings-file';

export type { DefaultCurrency, NumberStyleChoice, StoredSettings } from './settings-file';

// Named after the phone's file, so the two are easy to match up.
const KEY = 'lumiq-settings.json';

// What the browser refused to keep (storage switched off, a private window,
// no room left), held here so the app still works until the page is reloaded.
let unsaved: string | null = null;

type SavedListener = (settings: StoredSettings) => void;
const savedListeners = new Set<SavedListener>();

export function loadSettings(): StoredSettings {
  try {
    const text = unsaved ?? localStorage.getItem(KEY);
    if (text === null) return {};
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as StoredSettings) : {};
  } catch {
    // Nothing kept, damaged, or storage switched off: first-launch defaults.
    return {};
  }
}

// Written at once, like the phone's file: localStorage is synchronous, so two
// saves in a row land in order and a save just before a reload is not lost.
export function saveSettings(settings: StoredSettings): void {
  const text = JSON.stringify(settings);
  try {
    localStorage.setItem(KEY, text);
    unsaved = null;
  } catch (error) {
    unsaved = text;
    console.warn('LUMIQ: this browser would not keep the settings; they last until the page is reloaded', error);
  }
  savedListeners.forEach((listener) => {
    try {
      listener(settings);
    } catch (error) {
      // A listener that fails must never look like a failed save.
      console.warn('LUMIQ: a settings listener failed', error);
    }
  });
}

// Browser preview only. The phone's file has no such export, so shared code
// cannot see it: another .web file imports it from '@/utils/settings-file.web'
// by name. The listener is called after every save with what was saved; the
// page's reading direction follows the chosen language through it (see
// @/state/layout-direction.web). Returns the function that stops it.
export function onSettingsSaved(listener: SavedListener): () => void {
  savedListeners.add(listener);
  return () => {
    savedListeners.delete(listener);
  };
}
