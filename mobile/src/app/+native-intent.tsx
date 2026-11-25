// "Open with LUMIQ": a CSV or Excel file tapped in WhatsApp, Files or Gmail
// reaches the app as the phone's own link to that file (content://… or
// file://…, from the intent filter in app.json), not as a page of the app.
// This turns such a link into the page that opens it, /open-file, and passes
// every other link (the app's own lumiq:// links) through untouched.
//
// It runs on the phone only, before anything is drawn, both when the app is
// started by the link and when the link arrives while the app is open. It
// must never throw.

const FILE_LINK = /^(content|file):\/\//i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (typeof path !== 'string' || !FILE_LINK.test(path)) return path;
    // Wrapped twice on purpose. The router unwraps a query value once while it
    // reads the link and useLocalSearchParams unwraps it a second time. With
    // a single wrap that second pass would also undo the %3A and %2F that are
    // part of many file links ("…/document/msf%3A1000000034"), and the phone
    // would be asked for a file that is not there. /open-file peels any wrap
    // a different router version leaves on.
    return `/open-file?uri=${encodeURIComponent(encodeURIComponent(path))}`;
  } catch {
    // The link could not be passed on: the page says no file came with it.
    return '/open-file';
  }
}
