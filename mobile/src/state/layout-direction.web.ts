import { isLanguage, languageInfo, type Language } from '@/i18n';
import { setWebDirection } from '@/theme';
// The settings' browser twin, by name: only it can say when a save happens
// (see onSettingsSaved there). In a browser '@/utils/settings-file' is this
// same file.
import { loadSettings, onSettingsSaved } from '@/utils/settings-file.web';

// The browser preview's twin of layout-direction.ts. On a phone the layout
// direction is fixed when the app starts, so switching to or from Hebrew
// restarts LUMIQ once. A browser has nothing to restart and needs none: the
// page takes a new direction while it is open. Metro picks this file for the
// web and layout-direction.ts for Android and iOS: the two must keep the same
// exports.
//
// What "the direction" is in a browser, set together here:
//   1. <html dir>   the browser's own direction: the order of a row, the side
//                   a scrollbar is on, and anything drawn outside the app's
//                   root view (a dialog element).
//   2. <html lang>  so the browser picks the right letter shapes (Chinese and
//                   Japanese share code points) and reads text out in the
//                   right voice.
//   3. the theme    setWebDirection, so useIsRTL() agrees: icons that point,
//                   the sign of a slide, the side a sweep starts from.
//
// One thing cannot be set from here. react-native-web works out `start` and
// `end` (paddingStart, marginEnd, textAlign 'start', insetInlineStart) from a
// `dir` on a view above them, not from the page. For the whole layout to
// mirror, the root view of the preview must carry it:
//   dir={useIsRTL() ? 'rtl' : 'ltr'}

// The language the page was last set up for.
let shown: Language | null = null;

function show(language: Language): void {
  shown = language;
  const info = languageInfo(language);
  if (typeof document !== 'undefined') {
    const page = document.documentElement;
    page.dir = info.rtl ? 'rtl' : 'ltr';
    page.lang = info.locale;
  }
  setWebDirection(info.rtl);
}

// Everyone starts in English until a language is chosen (see app-state).
function chosen(language: unknown): Language {
  return isLanguage(language) ? language : 'en';
}

// Set once as this file loads, from the saved language, so the first frame is
// already the right way round.
show(chosen(loadSettings().language));

// And again whenever a different language is saved: choosing Hebrew on the
// Language screen mirrors the page at once. Saves that leave the language
// alone change nothing here, so a preview page that flips the direction by
// hand (to look at a component both ways) keeps what it chose.
onSettingsSaved((settings) => {
  const language = chosen(settings.language);
  if (language !== shown) show(language);
});

// A browser never needs a restart to change direction.
export function needsRestart(language: Language): boolean {
  return false;
}

// On a phone this sets the direction for the next start. In a browser the
// next start is now: the page takes the language's direction at once.
export function matchLayoutDirection(language: Language): void {
  show(language);
}

// Nothing to restart: the page takes the direction and carries on.
export async function restartForLanguage(language: Language): Promise<void> {
  show(language);
}

// Called once at launch by the root layout. Sets the direction and answers
// false: no restart is on its way, so the start screen can go.
export function fixDirectionAtLaunch(language: Language): boolean {
  show(language);
  return false;
}
