import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { loadSettings, saveSettings } from '@/utils/settings-file';

// The person's answer to "may a question be sent to the AI?". Until it is
// 'yes', nothing leaves the phone: Ask shows its permission card instead of
// sending.
//
//   'unset'  never asked, or the answer was taken back
//   'yes'    allowed
//   'no'     said "Not now": Ask asks again the next time a question is sent
//
// A small store outside React (no context, no provider), the same shape as
// the theme mode store: any component reads it with useAiConsent(), anything
// may call getAiConsent() and setAiConsent(). The answer is kept in the app's
// settings file on the phone and read once when this module loads.

export type AiConsent = 'yes' | 'no' | 'unset';

function isAiConsent(value: unknown): value is AiConsent {
  return value === 'yes' || value === 'no' || value === 'unset';
}

// What the settings file says now. A missing or damaged answer is 'unset', so
// the safe side is always "ask first".
function storedConsent(): AiConsent {
  const stored: unknown = loadSettings().aiConsent;
  return stored === 'yes' || stored === 'no' ? stored : 'unset';
}

let consent: AiConsent = storedConsent();
const listeners = new Set<() => void>();

// Writes the answer into the settings file, keeping everything else in it.
// 'unset' removes the field. Nothing is written when the file already agrees.
function persist(): void {
  const answer = consent;
  if (storedConsent() === answer) return;
  const settings = { ...loadSettings() };
  if (answer === 'unset') delete settings.aiConsent;
  else settings.aiConsent = answer;
  saveSettings(settings);
}

// The settings file has a second writer: the app state provider keeps its own
// copy of the settings in memory and writes the whole file on every change
// (language, number style, open file), so its copy of this answer can be an
// old one. Putting the answer back whenever the app leaves the screen keeps
// the file right for the next start. (The lasting fix is for that provider to
// write `aiConsent` from getAiConsent() itself.)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') persist();
  });
}

// The answer right now. Use this at the moment of sending, so a change made a
// moment ago is never missed.
export function getAiConsent(): AiConsent {
  return consent;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Changes the answer at once and remembers it. The store changes and every
// reader is told before the file is written. Setting the answer it already
// has tells nobody, and only makes sure the file still holds it.
export function setAiConsent(value: AiConsent): void {
  const next: AiConsent = isAiConsent(value) ? value : 'unset';
  if (next !== consent) {
    consent = next;
    listeners.forEach((listener) => listener());
  }
  persist();
}

// The answer, kept up to date.
export function useAiConsent(): AiConsent {
  return useSyncExternalStore(subscribe, getAiConsent, getAiConsent);
}
