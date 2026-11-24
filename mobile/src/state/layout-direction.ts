import Constants, { ExecutionEnvironment } from 'expo-constants';
import { File, Paths } from 'expo-file-system';
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

// A phone set to Arabic, Hebrew or another right-to-left language opens
// LUMIQ right to left the very first time, even in English. Called once at
// launch while the splash screen is still up: when the direction is wrong it
// restarts once, behind the splash, and returns true. A note in the cache
// stops a second try when a restart did not change the direction, so this
// can never loop. Expo Go resets the direction itself, so it is left alone
// there.
export function fixDirectionAtLaunch(language: Language): boolean {
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  const wanted = languageInfo(language).rtl ? 'rtl' : 'ltr';
  try {
    const note = new File(Paths.cache, 'lumiq-direction-restart.txt');
    if (!needsRestart(language)) {
      if (note.exists) note.delete();
      return false;
    }
    if (note.exists && note.textSync() === wanted) {
      // Already restarted once for this: carry on, set for the next start.
      note.delete();
      matchLayoutDirection(language);
      return false;
    }
    if (!note.exists) note.create();
    note.writeSync(wanted);
  } catch {
    // Without the note there is no loop guard, so no restart either.
    matchLayoutDirection(language);
    return false;
  }
  void restartForLanguage(language);
  return true;
}
