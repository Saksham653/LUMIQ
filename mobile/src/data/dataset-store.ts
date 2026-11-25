import { Directory, File, Paths } from 'expo-file-system';

import type { Dataset } from '@/data/types';

// The user's own files, kept in the app's private storage on the phone:
// one JSON file per dataset plus a small index for the Home list. Nothing
// here ever leaves the device.
export type StoredFile = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  addedAt: number;
};

const folder = () => new Directory(Paths.document, 'datasets');
const indexFile = () => new File(folder(), 'index.json');
const dataFile = (id: string) => new File(folder(), `${id}.json`);

function ensureFolder() {
  const dir = folder();
  if (!dir.exists) dir.create();
}

// Written synchronously, as utils/settings-file.ts does: `write()` is
// asynchronous and was never awaited, so the index could be written before
// the file it lists (or two saves land out of order), and a failed write went
// unseen. Now a write has finished, or thrown, before the next line runs.
function writeText(file: File, text: string) {
  if (!file.exists) file.create();
  file.writeSync(text);
}

export function listStoredFiles(): StoredFile[] {
  try {
    const file = indexFile();
    if (!file.exists) return [];
    const parsed: unknown = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? (parsed as StoredFile[]) : [];
  } catch {
    return [];
  }
}

// Saves the dataset and returns the updated list, newest first.
export function storeDataset(dataset: Dataset, current: StoredFile[]): StoredFile[] {
  ensureFolder();
  writeText(dataFile(dataset.id), JSON.stringify(dataset));
  const entry: StoredFile = {
    id: dataset.id,
    name: dataset.name,
    rows: dataset.data.length,
    columns: dataset.columns.length,
    addedAt: Date.now(),
  };
  const next = [entry, ...current.filter((file) => file.id !== dataset.id)];
  writeText(indexFile(), JSON.stringify(next));
  return next;
}

export function readDataset(id: string): Dataset | null {
  try {
    const file = dataFile(id);
    if (!file.exists) return null;
    return JSON.parse(file.textSync()) as Dataset;
  } catch {
    return null;
  }
}

// Deletes the dataset from the phone and returns the updated list.
export function deleteDataset(id: string, current: StoredFile[]): StoredFile[] {
  try {
    const file = dataFile(id);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('LUMIQ: could not delete a dataset file', error);
  }
  const next = current.filter((file) => file.id !== id);
  try {
    ensureFolder();
    writeText(indexFile(), JSON.stringify(next));
  } catch (error) {
    // The file itself is gone; a list that still names it opens nothing.
    console.warn('LUMIQ: could not update the list of files', error);
  }
  return next;
}
