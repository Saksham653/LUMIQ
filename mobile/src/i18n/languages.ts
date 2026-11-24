// The languages LUMIQ speaks, in the order the Language screen lists them:
// each one's own name in its own script, and its English name. `beta` marks
// a translation no native speaker has checked yet. Hebrew is right-to-left:
// choosing it (or leaving it) mirrors the whole app after one restart.
export const LANGUAGES = [
  { code: 'en', native: 'English', english: 'English', beta: false, rtl: false, locale: 'en-GB' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', beta: true, rtl: false, locale: 'hi-IN' },
  { code: 'es', native: 'Español', english: 'Spanish', beta: true, rtl: false, locale: 'es-ES' },
  { code: 'fr', native: 'Français', english: 'French', beta: true, rtl: false, locale: 'fr-FR' },
  { code: 'de', native: 'Deutsch', english: 'German', beta: true, rtl: false, locale: 'de-DE' },
  { code: 'ja', native: '日本語', english: 'Japanese', beta: true, rtl: false, locale: 'ja-JP' },
  { code: 'zh', native: '简体中文', english: 'Chinese, Simplified', beta: true, rtl: false, locale: 'zh-CN' },
  { code: 'he', native: 'עברית', english: 'Hebrew', beta: true, rtl: true, locale: 'he-IL' },
] as const;

export type LanguageInfo = (typeof LANGUAGES)[number];
export type Language = LanguageInfo['code'];

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.code === value);
}

export function languageInfo(code: Language): LanguageInfo {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}

// Line height for body text, as a multiple of the font size: Devanagari and
// Hebrew need room above and below the letters, Japanese and Chinese more.
export function lineHeightFactor(code: Language): number {
  if (code === 'ja' || code === 'zh') return 1.6;
  if (code === 'hi' || code === 'he') return 1.5;
  return 1.45;
}
