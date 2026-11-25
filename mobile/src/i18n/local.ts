import type { Language } from './languages';
import { useAppState } from '@/state/app-state';

// Words that belong to one screen, kept beside that screen instead of in the
// eight shared locale files:
//
//   const STRINGS = defineStrings({
//     en: { title: 'Story of your file', cards: '{done} of {total}' },
//     hi: { title: 'आपकी फ़ाइल की कहानी', cards: '{total} में से {done}' },
//   });
//   const t = useLocalT(STRINGS);
//   t('cards', { done: 2, total: 5 })
//
// English must have every key. Any other language may leave keys out and
// falls back to English, so a screen can ship in English and Hindi first.

export type LocalStrings<K extends string> = { en: Record<K, string> } & Partial<Record<Language, Partial<Record<K, string>>>>;

export function defineStrings<K extends string>(strings: LocalStrings<K>): LocalStrings<K> {
  return strings;
}

// Fills {placeholders} from params, the same way the shared translate() does.
export function fillPlaceholders(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let filled = text;
  for (const [name, value] of Object.entries(params)) {
    filled = filled.split(`{${name}}`).join(String(value));
  }
  return filled;
}

export function localText<K extends string>(
  strings: LocalStrings<K>,
  language: Language,
  key: K,
  params?: Record<string, string | number>,
): string {
  return fillPlaceholders(strings[language]?.[key] ?? strings.en[key], params);
}

// t('key') in the app's current language for one screen's own words.
export function useLocalT<K extends string>(strings: LocalStrings<K>) {
  const { language } = useAppState();
  return (key: K, params?: Record<string, string | number>) => localText(strings, language, key, params);
}
