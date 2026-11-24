import type { Language } from './languages';
import { de } from './locales/de';
import { en, type StringKey } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { he } from './locales/he';
import { hi } from './locales/hi';
import { ja } from './locales/ja';
import { zh } from './locales/zh';

export type { StringKey } from './locales/en';
export { LANGUAGES, isLanguage, languageInfo, lineHeightFactor, type Language, type LanguageInfo } from './languages';

const dictionaries: Record<Language, Record<StringKey, string>> = { en, hi, es, fr, de, ja, zh, he };

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

// A column name in the middle of a sentence: lower case where the language
// writes it so ("revenue by month"); as it is where nouns keep their capital
// (German) or the script has no case.
export function inSentence(name: string, language: Language): string {
  return language === 'en' || language === 'es' || language === 'fr' ? name.toLowerCase() : name;
}

// Joins a list the way the language does: "Jan, Feb" / "1月、2月".
export function listJoin(items: string[], language: Language): string {
  return items.join(language === 'ja' || language === 'zh' ? '、' : ', ');
}
