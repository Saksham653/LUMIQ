import { createContext, createElement, useContext, type ReactNode } from 'react';

// Every word the component library itself needs. No component in src/ui
// hard-codes a word a person can read or hear: a component takes its words as
// props, or reads the few shared ones below with useUIStrings().
//
// The app passes them in its own language once, near the root:
//   <UIStringsProvider strings={{ close: t('ui.close'), cancel: t('common.cancel') }}>
// Anything left out falls back to the English below. This file is the only
// place in src/ui where English is written down.

export type UIStrings = {
  // Closes a sheet, a dialog, a toast.
  close: string;
  cancel: string;
  ok: string;
  undo: string;
  // Tries the same thing again.
  retry: string;
  // The back control of a header.
  back: string;
  // Empties a field (the search bar's small button).
  clear: string;
  // Spoken for a control that is working, shown as a still label when the
  // phone asks for less motion.
  loading: string;
  // The count under an answer. {checked} and {total} are filled in, in the
  // app's own number style: "3 of 4 numbers checked on your phone".
  checkedCount: string;
  // The first line under an answer when every number matched.
  allChecked: string;
  // The screen shown when part of the app has crashed: what happened, what
  // to do next, and the button that does it.
  errorTitle: string;
  errorBody: string;
  errorAction: string;
  // Opens and closes a longer piece of text.
  showMore: string;
  showLess: string;
};

export const defaultUIStrings: UIStrings = {
  close: 'Close',
  cancel: 'Cancel',
  ok: 'OK',
  undo: 'Undo',
  retry: 'Try again',
  back: 'Back',
  clear: 'Clear',
  loading: 'Loading',
  checkedCount: '{checked} of {total} numbers checked on your phone',
  allChecked: 'Every number above matches the calculation.',
  errorTitle: 'Something went wrong',
  errorBody: 'This screen could not be shown. Try again. If it keeps happening, close the app and open it again.',
  errorAction: 'Try again',
  showMore: 'Show more',
  showLess: 'Show less',
};

const UIStringsContext = createContext<UIStrings>(defaultUIStrings);

// Gives the library its words. `strings` may hold only some of them.
export function UIStringsProvider({ strings, children }: { strings: Partial<UIStrings>; children?: ReactNode }) {
  const value: UIStrings = { ...defaultUIStrings };
  for (const key of Object.keys(defaultUIStrings) as (keyof UIStrings)[]) {
    // A word that is missing or undefined keeps its English.
    const word = strings[key];
    if (typeof word === 'string') value[key] = word;
  }
  return createElement(UIStringsContext.Provider, { value }, children);
}

// The library's words in the app's language (English without a provider).
export function useUIStrings(): UIStrings {
  return useContext(UIStringsContext);
}

// Puts values into a string's {places}:
//   fillUIString(strings.checkedCount, { checked: '3', total: '4' })
// Format numbers in the app's own number style before passing them in.
export function fillUIString(template: string, values: Record<string, string | number>): string {
  let text = template;
  for (const [name, value] of Object.entries(values)) {
    text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}
