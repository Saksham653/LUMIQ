import { useSyncExternalStore } from 'react';

// The brand fonts in the browser preview. One stylesheet link for the three
// families is added to the page once, the first time the theme is loaded.
// useAppFonts answers true when the browser reports the fonts ready, or after
// two seconds, whichever comes first: a font that is slow or blocked never
// holds the page.
//
// This file is only ever bundled for the web (the phone gets fonts.ts), so it
// may use `document`. Only the preview fetches fonts from the network; the
// phone app never does.

const STYLESHEET =
  'https://fonts.googleapis.com/css2' +
  '?family=Anek+Devanagari:wght@400;500;600;700' +
  '&family=Anek+Latin:wght@400;500;600;700' +
  '&family=Outfit:wght@500;600' +
  '&display=swap';

const LINK_ID = 'brand-fonts';
const BACKSTOP_MS = 2000;

// One request per family and weight in use, each with a letter of its own
// script: the families are served in pieces by script, and a piece is only
// fetched when a letter from it is asked for. The Devanagari sample is built
// from its code point (the letter "a") so this file stays plain Latin.
const LATIN_SAMPLE = 'A';
const DEVANAGARI_SAMPLE = String.fromCharCode(0x0905);
const FIGURE_SAMPLE = '0';

const WANTED: [font: string, sample: string][] = [
  ['400 16px "Anek Latin"', LATIN_SAMPLE],
  ['500 16px "Anek Latin"', LATIN_SAMPLE],
  ['600 16px "Anek Latin"', LATIN_SAMPLE],
  ['700 16px "Anek Latin"', LATIN_SAMPLE],
  ['400 16px "Anek Devanagari"', DEVANAGARI_SAMPLE],
  ['500 16px "Anek Devanagari"', DEVANAGARI_SAMPLE],
  ['600 16px "Anek Devanagari"', DEVANAGARI_SAMPLE],
  ['700 16px "Anek Devanagari"', DEVANAGARI_SAMPLE],
  ['500 16px "Outfit"', FIGURE_SAMPLE],
  ['600 16px "Outfit"', FIGURE_SAMPLE],
];

// Nothing to wait for where there is no page (a server render).
let ready = typeof document === 'undefined';
const listeners = new Set<() => void>();

function finish(): void {
  if (ready) return;
  ready = true;
  listeners.forEach((listener) => listener());
}

function waitForFonts(): void {
  const fonts = document.fonts;
  if (fonts === undefined || typeof fonts.load !== 'function') {
    finish();
    return;
  }
  Promise.all(WANTED.map(([font, sample]) => fonts.load(font, sample))).then(finish, finish);
}

function start(): void {
  if (typeof document === 'undefined') return;
  setTimeout(finish, BACKSTOP_MS);
  if (document.getElementById(LINK_ID) !== null) {
    // Already on the page (the module was loaded again): just wait.
    waitForFonts();
    return;
  }
  const link = document.createElement('link');
  link.id = LINK_ID;
  link.rel = 'stylesheet';
  link.href = STYLESHEET;
  // The font list is only known once the stylesheet has arrived.
  link.addEventListener('load', waitForFonts);
  link.addEventListener('error', finish);
  document.head.appendChild(link);
}

start();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isReady(): boolean {
  return ready;
}

function isReadyOnServer(): boolean {
  return true;
}

// True once text can be drawn in its final fonts.
export function useAppFonts(): boolean {
  return useSyncExternalStore(subscribe, isReady, isReadyOnServer);
}
