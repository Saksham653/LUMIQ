import { File, type PickSingleFileResult } from 'expo-file-system';

// Asks the person for one file. On a phone this is the phone's own file
// picker; in the browser preview it is the browser's own file window (see
// pick-file.web.ts, which Metro picks for the web). The two files keep the
// same exports, so whoever opens a file imports from '@/data/pick-file' and
// never needs to know where the app is running.

// The five things the importer (import-file.ts) reads from a picked file. The
// phone's File has all of them; the browser twin returns a plain object with
// the same five and nothing else. Read anything more from a picked file and
// it must be added here, and to the twin, first.
export type PickedFile = Pick<File, 'uri' | 'name' | 'type' | 'text' | 'arrayBuffer'>;

// { result: File, canceled: false } when a file was picked;
// { result: null, canceled: true } when the picker was closed without one.
export type PickFileResult = PickSingleFileResult;

// Opens the picker for one file of any kind. Any kind on purpose: the
// importer decides what it can read and says so in plain words, so the same
// "this file cannot be opened" message is reached on every platform.
export function pickFile(): Promise<PickFileResult> {
  return File.pickFileAsync({ mimeTypes: '*/*' });
}
