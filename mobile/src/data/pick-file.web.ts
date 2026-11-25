// The browser preview's twin of pick-file.ts. A browser cannot open the
// phone's file picker (expo-file-system is an empty stand-in there, and its
// picker answers "nothing picked" without ever opening), so this asks with
// the browser's own file window, through a file input that is never shown.
// Metro picks this file for the web and pick-file.ts for Android and iOS: the
// two must keep the same exports.
//
// The file is read by the page itself. Picking it uploads nothing.

// Types only, so nothing from the phone's file system is loaded when the page
// runs. `PhoneFile` is the phone's File class; a bare `File` in this file is
// the browser's own.
import type { File as PhoneFile } from 'expo-file-system';

import type { PickedFile, PickFileResult } from './pick-file';

export type { PickedFile, PickFileResult } from './pick-file';

// The browser's file, as the five things the importer reads. There is no path
// to give in a browser, so `uri` is empty: the importer only asks whether it
// starts with "content://" (an Android matter), and an empty one does not.
function fromBrowser(file: File): PhoneFile {
  const picked: PickedFile = {
    uri: '',
    name: file.name,
    type: file.type,
    text: () => file.text(),
    arrayBuffer: () => file.arrayBuffer(),
  };
  // The one place the two worlds meet. Callers are written against the
  // phone's File; PickedFile above is the promise that they read no more of
  // it than a browser can give.
  return picked as unknown as PhoneFile;
}

// Opens the browser's file window for one file of any kind, like the phone's
// picker. It must be called while the press that asked for it is still being
// handled (before any `await`): a browser only opens a file window in answer
// to a press.
//
// Closing the window without choosing answers { result: null, canceled: true }
// through the input's "cancel" event, which every current browser sends. A
// browser too old to send it leaves the promise waiting; nothing is held up
// by that, and the next press asks again.
export function pickFile(): Promise<PickFileResult> {
  return new Promise<PickFileResult>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    // Never drawn, never focused, never read out. It has to be in the page
    // all the same: some browsers do not report the choice of an input that
    // is not.
    input.hidden = true;
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');

    const finish = (result: PickFileResult) => {
      input.remove();
      resolve(result);
    };

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.item(0) ?? null;
        finish(file === null ? { result: null, canceled: true } : { result: fromBrowser(file), canceled: false });
      },
      { once: true },
    );
    input.addEventListener('cancel', () => finish({ result: null, canceled: true }), { once: true });

    document.body.appendChild(input);
    input.click();
  });
}
