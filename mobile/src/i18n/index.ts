import type { Language } from './languages';
import { en, type StringKey } from './locales/en';
import { hi } from './locales/hi';

export type { StringKey } from './locales/en';
export { LANGUAGES, isLanguage, languageInfo, lineHeightFactor, type Language, type LanguageInfo } from './languages';

const dictionaries: Partial<Record<Language, Record<StringKey, string>>> = { en, hi };

// Looks up a string in the chosen language (falling back to English) and
// fills {placeholders} from params.
export function translate(
  language: Language,
  key: StringKey,
  params?: Record<string, string | number>,
): string {
  let text = dictionaries[language]?.[key] ?? en[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
