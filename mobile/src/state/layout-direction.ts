import * as Updates from 'expo-updates';
import { DevSettings, I18nManager, Platform } from 'react-native';

import { languageInfo, type Language } from '@/i18n';

// Hebrew lays the whole app out right to left. The phone only applies a new
// layout direction when the app starts, so switching to or from Hebrew
// restarts LUMIQ once (after a one-line notice on the Language screen).

export function needsRestart(language: Language): boolean {
  return Platform.OS !== 'web' && languageInfo(language).rtl !== I18nManager.isRTL;
}

// Sets the direction for the next start, without restarting.
export function matchLayoutDirection(language: Language): void {
  if (!needsRestart(language)) return;
  const rtl = languageInfo(language).rtl;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

// Sets the direction and restarts the app so it takes effect. expo-updates
// does the restart in release builds (it never fetches updates here); in
// development the dev server reloads instead.
export async function restartForLanguage(language: Language): Promise<void> {
  matchLayoutDirection(language);
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}
