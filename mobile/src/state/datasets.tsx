import { datasetFromPreview } from '@core/data/uploadPreview.js';
import { uniqueDatasetName } from '@core/data/dataset.js';
import { BottomSheet, Button, Column, Host, Text as UIText } from '@expo/ui';
import { File, type PickSingleFileResult } from 'expo-file-system';
import { router, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { hapticSuccess } from '@/components/haptics';
import { deleteDataset, listStoredFiles, readDataset, storeDataset, type StoredFile } from '@/data/dataset-store';
import {
  BIG_FILE_BYTES,
  IMPORT_LIMITS_MB,
  IMPORT_MAX_ROWS,
  ImportCancelled,
  ImportError,
  fileSize,
  readFileForImport,
  revisePreview,
  type ImportPreview,
  type ImportProgress,
  type PreviewOverrides,
} from '@/data/import-file';
import { SAMPLE_DATASETS, sampleName } from '@/data/samples';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { localText } from '@/i18n/local';
import { IMPORT_STRINGS, type ImportStringKey } from '@/screens/import-review/strings';
import { useAppState, useNumbers, useT } from '@/state/app-state';

// What the import is doing right now; the import review screen draws it.
//   reading  a file is being read (`name` is null when the phone gave none)
//   review   the file is read and waits for the person before it is saved:
//            `first` is how it was read at first (its questions stay on
//            screen once answered), `revising` the progress of reading it
//            again after a correction, `failed` a correction that could not
//            be made, `saving` "Use this file" was pressed
export type ImportState =
  | { phase: 'idle' }
  | { phase: 'reading'; name: string | null; progress: ImportProgress }
  | {
      phase: 'review';
      preview: ImportPreview;
      first: ImportPreview;
      revising: ImportProgress | null;
      failed: boolean;
      saving: boolean;
    };

type DatasetsState = {
  myFiles: StoredFile[];
  // A file is being read: Home shows a skeleton row in its place.
  importing: boolean;
  // The file added last in this session, so only it fades in.
  lastAddedId: string | null;
  // Opens the phone's file picker and imports the chosen file.
  importFile: () => Promise<void>;
  // Imports a file the phone handed to the app ("Open with LUMIQ"): a
  // content:// or file:// link, and its name when the phone gave one. Same
  // path as the picker: guards, progress, the review when needed.
  importFromUri: (uri: string, name?: string) => Promise<void>;
  importState: ImportState;
  // Reads the file under review again with the person's corrections.
  reviseImport: (overrides: PreviewOverrides) => Promise<void>;
  // Saves the file under review and opens its Insights.
  confirmImport: () => void;
  // Stops the import (reading or under review). Nothing is saved.
  cancelImport: () => void;
  removeFile: (id: string) => void;
  // Deletes every stored file in one go (Erase everything). Throws if the
  // phone refuses to delete one, after removing all it could.
  removeAllFiles: () => void;
  getDataset: (id: string | null) => Dataset | null;
  datasetName: (id: string | null) => string | null;
};

type SheetChoice = { names: string[]; resolve: (name: string | null) => void };
type ImportToken = { cancelled: boolean };

const SAMPLE_PREFIX = 'sample:';
// Rows read after which a file counts as big (see BIG_FILE_BYTES).
const BIG_FILE_ROWS = 20000;
// Typed routes are generated when the app is started; the review route is new.
const REVIEW_ROUTE = '/import-review' as unknown as Href;
const DatasetsContext = createContext<DatasetsState | null>(null);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The name to show while a file is read: a content:// link's last part is
// not a name ("document:1000000034").
function shownName(file: File, given?: string): string | null {
  const name = given?.trim() || (file.uri.startsWith('content://') ? '' : file.name);
  return name ? name.replace(/\.[^.]+$/, '') || name : null;
}

// The sample files plus the user's own files: import (CSV or Excel, picked
// from the phone or handed over by it), the review before saving, the Home
// list, delete, and loading a file's rows.
export function DatasetsProvider({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { language, activeDatasetId, setActiveDatasetId } = useAppState();
  const [myFiles, setMyFiles] = useState<StoredFile[]>(listStoredFiles);
  const [busy, setBusy] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [sheetChoice, setSheetChoice] = useState<SheetChoice | null>(null);
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' });
  const cache = useRef(new Map<string, Dataset>());
  // The import under way (one at a time), and whether its screen is open.
  const pending = useRef<ImportToken | null>(null);
  const reviewShown = useRef(false);
  const sheetResolve = useRef<((name: string | null) => void) | null>(null);
  // The list as it is now, for imports that finish after it changed.
  const myFilesRef = useRef(myFiles);
  useEffect(() => {
    myFilesRef.current = myFiles;
  }, [myFiles]);
  // Percentage widths are not applied inside the bottom sheet, so the sheet
  // list and its buttons get fixed widths: the screen (capped for tablets)
  // minus the sheet's 16-point side padding.
  const { width: windowWidth } = useWindowDimensions();
  const sheetListWidth = Math.min(windowWidth, 560) - 32;
  const sheetButtonWidth = sheetListWidth - 16;

  const getDataset = useCallback(
    (id: string | null): Dataset | null => {
      if (!id) return null;
      if (id.startsWith(SAMPLE_PREFIX)) {
        const sample = (SAMPLE_DATASETS as Record<string, Dataset | undefined>)[id.slice(SAMPLE_PREFIX.length)];
        return sample ?? null;
      }
      if (!myFiles.some((file) => file.id === id)) return null;
      let dataset = cache.current.get(id);
      if (!dataset) {
        dataset = readDataset(id) ?? undefined;
        if (dataset) cache.current.set(id, dataset);
      }
      return dataset ?? null;
    },
    [myFiles],
  );

  const datasetName = useCallback(
    (id: string | null): string | null => {
      if (!id) return null;
      // A sample file's name in the person's language (the web app's three
      // and the phone's own two).
      const sample = sampleName(id, language);
      if (sample !== null) return sample;
      return myFiles.find((file) => file.id === id)?.name ?? null;
    },
    [myFiles, language],
  );

  // Why a file could not be opened, in the person's language.
  const failureText = useCallback(
    (error: unknown): string => {
      const local = (key: ImportStringKey, params?: Record<string, string | number>) => localText(IMPORT_STRINGS, language, key, params);
      if (!(error instanceof ImportError)) return t('import.failed');
      switch (error.reason) {
        case 'unsupported':
          return t('import.unsupported');
        case 'empty':
          return t('import.empty');
        case 'tooLargeCsv':
          return local('tooLargeCsv', { size: numbers.count(error.sizeMb ?? 0), max: numbers.count(IMPORT_LIMITS_MB.csv) });
        case 'tooLargeExcel':
          return local('tooLargeExcel', { size: numbers.count(error.sizeMb ?? 0), max: numbers.count(IMPORT_LIMITS_MB.excel) });
        case 'tooManyRows':
          return local('tooManyRows', { max: numbers.count(IMPORT_MAX_ROWS) });
        case 'notSpreadsheet':
          return local('notSpreadsheet');
        case 'oneColumn':
          return local('oneColumn');
        case 'password':
          return local('password');
        default:
          return t('import.failed');
      }
    },
    [language, numbers, t],
  );

  // Asks which sheet to open, hiding the busy row while the person chooses.
  const chooseSheet = useCallback((names: string[]) => {
    setBusy(false);
    return new Promise<string | null>((resolve) => {
      const answer = (name: string | null) => {
        sheetResolve.current = null;
        setSheetChoice(null);
        if (name) setBusy(true);
        resolve(name);
      };
      sheetResolve.current = answer;
      setSheetChoice({ names, resolve: answer });
    });
  }, []);

  const openReview = useCallback(() => {
    if (reviewShown.current) return;
    reviewShown.current = true;
    router.push(REVIEW_ROUTE);
  }, []);

  // Takes the review screen away, if it is open.
  const leaveReview = useCallback(() => {
    if (!reviewShown.current) return;
    reviewShown.current = false;
    if (router.canGoBack()) router.back();
  }, []);

  // The import is over (saved, failed or stopped).
  const endImport = useCallback((token: ImportToken) => {
    if (pending.current === token) pending.current = null;
    setBusy(false);
    setImportState({ phase: 'idle' });
  }, []);

  const save = useCallback(
    (preview: ImportPreview, token: ImportToken) => {
      let dataset: Dataset;
      try {
        dataset = datasetFromPreview(preview, preview.types) as Dataset;
        const next = storeDataset(dataset, myFilesRef.current);
        myFilesRef.current = next;
        setMyFiles(next);
      } catch {
        endImport(token);
        leaveReview();
        Alert.alert(t('import.errorTitle'), localText(IMPORT_STRINGS, language, 'saveFailed'));
        return;
      }
      cache.current.set(dataset.id, dataset);
      setLastAddedId(dataset.id);
      setActiveDatasetId(dataset.id);
      endImport(token);
      // One success haptic, as the new file appears.
      hapticSuccess();
      leaveReview();
      router.navigate('/insights');
    },
    [endImport, language, leaveReview, setActiveDatasetId, t],
  );

  // One road for every file: guards, reading (with progress and Cancel on
  // their own screen for a big file), the review when something needs the
  // person, then saving.
  const runImport = useCallback(
    async (file: File, name?: string) => {
      if (pending.current) {
        Alert.alert(t('import.errorTitle'), localText(IMPORT_STRINGS, language, 'busy'));
        return;
      }
      const token: ImportToken = { cancelled: false };
      pending.current = token;
      setBusy(true);
      setImportState({ phase: 'reading', name: shownName(file, name), progress: { stage: 'opening', rows: null, total: null, fraction: null } });
      const size = fileSize(file);
      const big = size !== null && size >= BIG_FILE_BYTES;
      if (big) openReview();
      try {
        // Let the skeleton row (or the reading screen) appear before the work.
        await wait(big ? 250 : 60);
        const preview = await readFileForImport(file, {
          chooseSheet,
          name,
          isCancelled: () => token.cancelled,
          onProgress: (progress) => {
            if (token.cancelled) return;
            // A file whose size the phone did not tell turns out big: show
            // its reading, with Cancel, from here on.
            if (progress.rows !== null && progress.rows >= BIG_FILE_ROWS) openReview();
            setImportState((previous) => (previous.phase === 'reading' ? { ...previous, progress } : previous));
          },
        });
        if (token.cancelled) return;
        if (!preview) {
          // The sheet choice was closed: nothing to open.
          endImport(token);
          leaveReview();
          return;
        }
        preview.name = uniqueDatasetName(preview.name, myFilesRef.current.map((stored) => stored.name));
        if (preview.needsReview) {
          setBusy(false);
          setImportState({ phase: 'review', preview, first: preview, revising: null, failed: false, saving: false });
          openReview();
          return;
        }
        save(preview, token);
      } catch (error) {
        if (token.cancelled || error instanceof ImportCancelled) return;
        endImport(token);
        leaveReview();
        Alert.alert(t('import.errorTitle'), failureText(error));
      }
    },
    [chooseSheet, endImport, failureText, language, leaveReview, openReview, save, t],
  );

  const importFile = useCallback(async () => {
    if (pending.current) {
      Alert.alert(t('import.errorTitle'), localText(IMPORT_STRINGS, language, 'busy'));
      return;
    }
    let picked: PickSingleFileResult;
    try {
      picked = await File.pickFileAsync({ mimeTypes: '*/*' });
    } catch {
      Alert.alert(t('import.errorTitle'), t('import.failed'));
      return;
    }
    if (picked.canceled || !picked.result) return;
    await runImport(picked.result);
  }, [language, runImport, t]);

  const importFromUri = useCallback(
    async (uri: string, name?: string) => {
      let file: File;
      try {
        file = new File(uri);
      } catch {
        Alert.alert(t('import.errorTitle'), t('import.failed'));
        return;
      }
      await runImport(file, name);
    },
    [runImport, t],
  );

  const reviseImport = useCallback(
    async (overrides: PreviewOverrides) => {
      const token = pending.current;
      if (!token || importState.phase !== 'review' || importState.revising || importState.saving) return;
      const base = importState.preview;
      setImportState({ ...importState, revising: { stage: 'checking', rows: null, total: null, fraction: null }, failed: false });
      try {
        // Let "Updating" appear before the work.
        await wait(30);
        const next = await revisePreview(base, overrides, {
          isCancelled: () => token.cancelled,
          onProgress: (progress) => {
            if (token.cancelled) return;
            setImportState((previous) => (previous.phase === 'review' ? { ...previous, revising: progress } : previous));
          },
        });
        if (token.cancelled) return;
        next.name = base.name;
        setImportState((previous) => (previous.phase === 'review' ? { ...previous, preview: next, revising: null } : previous));
      } catch {
        if (token.cancelled) return;
        setImportState((previous) => (previous.phase === 'review' ? { ...previous, revising: null, failed: true } : previous));
      }
    },
    [importState],
  );

  const confirmImport = useCallback(() => {
    const token = pending.current;
    if (!token || importState.phase !== 'review' || importState.revising || importState.saving) return;
    const { preview } = importState;
    setImportState({ ...importState, saving: true });
    // Let the busy button draw before the file is written.
    setTimeout(() => {
      if (!token.cancelled) save(preview, token);
    }, 30);
  }, [importState, save]);

  // Called by the review screen whenever it goes away without saving (Cancel,
  // Back, a swipe), and safe to call when nothing is under way.
  const cancelImport = useCallback(() => {
    const token = pending.current;
    if (token) token.cancelled = true;
    pending.current = null;
    reviewShown.current = false;
    sheetResolve.current?.(null);
    setBusy(false);
    setImportState({ phase: 'idle' });
  }, []);

  const removeFile = useCallback(
    (id: string) => {
      cache.current.delete(id);
      setMyFiles(deleteDataset(id, myFiles));
      if (activeDatasetId === id) setActiveDatasetId(null);
    },
    [activeDatasetId, myFiles, setActiveDatasetId],
  );

  const removeAllFiles = useCallback(() => {
    // One pass over the current list, each step working from the list the
    // step before left, so no file comes back.
    let remaining = myFiles;
    for (const file of myFiles) remaining = deleteDataset(file.id, remaining);
    cache.current.clear();
    setMyFiles(remaining);
    setActiveDatasetId(null);
    if (remaining.length > 0) throw new Error('LUMIQ: some files could not be deleted');
  }, [myFiles, setActiveDatasetId]);

  const value = useMemo<DatasetsState>(
    () => ({
      myFiles,
      importing: busy,
      lastAddedId,
      importFile,
      importFromUri,
      importState,
      reviseImport,
      confirmImport,
      cancelImport,
      removeFile,
      removeAllFiles,
      getDataset,
      datasetName,
    }),
    [
      myFiles,
      busy,
      lastAddedId,
      importFile,
      importFromUri,
      importState,
      reviseImport,
      confirmImport,
      cancelImport,
      removeFile,
      removeAllFiles,
      getDataset,
      datasetName,
    ],
  );

  return (
    <DatasetsContext.Provider value={value}>
      {children}

      {sheetChoice && (
        <Host matchContents seedColor={colors.primary}>
          <BottomSheet isPresented onDismiss={() => sheetChoice.resolve(null)}>
            <Column spacing={12} style={{ width: sheetListWidth, padding: 8 }}>
              <UIText textStyle={{ fontSize: 20, fontWeight: '700' }}>
                {t('import.chooseSheet', { count: sheetChoice.names.length })}
              </UIText>
              {sheetChoice.names.map((name) => (
                <Button key={name} variant="outlined" onPress={() => sheetChoice.resolve(name)} style={{ width: sheetButtonWidth, height: 52 }}>
                  <UIText textStyle={{ fontSize: 18 }}>{name}</UIText>
                </Button>
              ))}
            </Column>
          </BottomSheet>
        </Host>
      )}
    </DatasetsContext.Provider>
  );
}

export function useDatasets(): DatasetsState {
  const state = useContext(DatasetsContext);
  if (!state) throw new Error('useDatasets must be used inside DatasetsProvider');
  return state;
}

// The file chosen on Home (a sample or one of the user's own), with its rows.
export function useActiveDataset(): Dataset | null {
  const { activeDatasetId } = useAppState();
  const { getDataset } = useDatasets();
  return useMemo(() => getDataset(activeDatasetId), [getDataset, activeDatasetId]);
}
