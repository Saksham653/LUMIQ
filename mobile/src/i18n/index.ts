import { en, hi, type StringKey } from './strings';

export type { StringKey } from './strings';
export type Language = 'en' | 'hi';

const dictionaries: Record<Language, Record<StringKey, string>> = { en, hi };

// Looks up a string in the chosen language (falling back to English) and
// fills {placeholders} from params.
export function translate(
  language: Language,
  key: StringKey,
  params?: Record<string, string | number>,
): string {
  let text = dictionaries[language][key] ?? en[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
