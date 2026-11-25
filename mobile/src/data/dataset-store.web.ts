// The browser preview's twin of dataset-store.ts. A browser has no app folder
// (expo-file-system is an empty stand-in there and throws), so the person's
// files are kept in the browser's own storage for this address
// (localStorage): one entry per file plus a small index for the Home list.
// Metro picks this file for the web and dataset-store.ts for Android and iOS:
// the two must keep the same exports.
//
// Nothing here leaves the computer: the browser keeps it on its own disk.

import type { Dataset } from '@/data/types';

// Types only, so nothing is loaded when the page runs: the shape lives in the
// phone's file and this one follows it.
import type { StoredFile } from './dataset-store';

export type { StoredFile } from './dataset-store';

// Named after the phone's folder and files. The prefix keeps them apart from
// anything else served from the same address.
const FOLDER = 'lumiq-datasets/';
const INDEX_KEY = `${FOLDER}index.json`;
const dataKey = (id: string) => `${FOLDER}${id}.json`;

// Most browsers give one address only a few megabytes of this storage, so a
// big spreadsheet may not fit (and a private window may keep nothing at all).
// What the browser refused is held here instead: the file opens and works as
// usual, and is gone when the page is reloaded.
const unsaved = new Map<string, string>();

function read(key: string): string | null {
  const held = unsaved.get(key);
  if (held !== undefined) return held;
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage switched off: the same as nothing kept.
    return null;
  }
}

function write(key: string, text: string): void {
  try {
    localStorage.setItem(key, text);
    unsaved.delete(key);
  } catch (error) {
    unsaved.set(key, text);
    console.warn('LUMIQ: this browser has no room to keep a file; it lasts until the page is reloaded', error);
  }
}

function remove(key: string): void {
  unsaved.delete(key);
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('LUMIQ: could not delete a dataset from this browser', error);
  }
}

export function listStoredFiles(): StoredFile[] {
  try {
    const text = read(INDEX_KEY);
    if (text === null) return [];
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    // A file whose rows did not survive a reload (see `unsaved`) is left out,
    // so Home never lists a file that cannot be opened.
    return (parsed as StoredFile[]).filter((file) => read(dataKey(file.id)) !== null);
  } catch {
    return [];
  }
}

// Saves the dataset and returns the updated list, newest first.
export function storeDataset(dataset: Dataset, current: StoredFile[]): StoredFile[] {
  write(dataKey(dataset.id), JSON.stringify(dataset));
  const entry: StoredFile = {
    id: dataset.id,
    name: dataset.name,
    rows: dataset.data.length,
    columns: dataset.columns.length,
    addedAt: Date.now(),
  };
  const next = [entry, ...current.filter((file) => file.id !== dataset.id)];
  write(INDEX_KEY, JSON.stringify(next));
  return next;
}

export function readDataset(id: string): Dataset | null {
  try {
    const text = read(dataKey(id));
    return text === null ? null : (JSON.parse(text) as Dataset);
  } catch {
    return null;
  }
}

// Deletes the dataset from the browser and returns the updated list.
export function deleteDataset(id: string, current: StoredFile[]): StoredFile[] {
  remove(dataKey(id));
  const next = current.filter((file) => file.id !== id);
  write(INDEX_KEY, JSON.stringify(next));
  return next;
}
