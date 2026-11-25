import { datasetFromPreview } from '@core/data/uploadPreview.js';
import { uniqueDatasetName } from '@core/data/dataset.js';
import { SAMPLE_DATASETS } from '@core/data/sampleDatasets.js';
import { BottomSheet, Button, Column, Host, Text as UIText } from '@expo/ui';
import { File, type PickSingleFileResult } from 'expo-file-system';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { hapticSuccess } from '@/components/haptics';
import { deleteDataset, listStoredFiles, readDataset, storeDataset, type StoredFile } from '@/data/dataset-store';
import { ImportError, previewFromFile } from '@/data/import-file';
import { findSample } from '@/data/samples';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';

type DatasetsState = {
  myFiles: StoredFile[];
  // A file is being read: Home shows a skeleton row in its place.
  importing: boolean;
  // The file added last in this session, so only it fades in.
  lastAddedId: string | null;
  importFile: () => Promise<void>;
  removeFile: (id: string) => void;
  // Deletes every stored file in one go (Erase everything). Throws if the
  // phone refuses to delete one, after removing all it could.
  removeAllFiles: () => void;
  getDataset: (id: string | null) => Dataset | null;
  datasetName: (id: string | null) => string | null;
};

type SheetChoice = { names: string[]; resolve: (name: string | null) => void };

const SAMPLE_PREFIX = 'sample:';
const DatasetsContext = createContext<DatasetsState | null>(null);

// The sample files plus the user's own files: import (CSV or Excel, picked
// from the phone), the Home list, delete, and loading a file's rows.
export function DatasetsProvider({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const t = useT();
  const { activeDatasetId, setActiveDatasetId } = useAppState();
  const [myFiles, setMyFiles] = useState<StoredFile[]>(listStoredFiles);
  const [busy, setBusy] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [sheetChoice, setSheetChoice] = useState<SheetChoice | null>(null);
  const cache = useRef(new Map<string, Dataset>());
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
      const sample = findSample(id);
      if (sample) return t(sample.nameKey);
      return myFiles.find((file) => file.id === id)?.name ?? null;
    },
    [myFiles, t],
  );

  // Asks which sheet to open, hiding the busy overlay while the user chooses.
  const chooseSheet = useCallback((names: string[]) => {
    setBusy(false);
    return new Promise<string | null>((resolve) =>
      setSheetChoice({
        names,
        resolve: (name) => {
          setSheetChoice(null);
          if (name) setBusy(true);
          resolve(name);
        },
      }),
    );
  }, []);

  const importFile = useCallback(async () => {
    let picked: PickSingleFileResult;
    try {
      picked = await File.pickFileAsync({ mimeTypes: '*/*' });
    } catch {
      Alert.alert(t('import.errorTitle'), t('import.failed'));
      return;
    }
    if (picked.canceled || !picked.result) return;
    const file = picked.result;

    setBusy(true);
    try {
      // Let the skeleton row appear before the parsing work.
      await new Promise((resolve) => setTimeout(resolve, 60));
      const preview = await previewFromFile(file, chooseSheet);
      if (!preview) return;
      preview.name = uniqueDatasetName(preview.name, myFiles.map((stored) => stored.name));
      const dataset = datasetFromPreview(preview, preview.types) as Dataset;
      cache.current.set(dataset.id, dataset);
      setMyFiles(storeDataset(dataset, myFiles));
      setLastAddedId(dataset.id);
      setActiveDatasetId(dataset.id);
      // One success haptic, as the new file appears.
      hapticSuccess();
      router.navigate('/insights');
    } catch (error) {
      Alert.alert(t('import.errorTitle'), t(error instanceof ImportError ? error.messageKey : 'import.failed'));
    } finally {
      setBusy(false);
    }
  }, [chooseSheet, myFiles, setActiveDatasetId, t]);

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
    () => ({ myFiles, importing: busy, lastAddedId, importFile, removeFile, removeAllFiles, getDataset, datasetName }),
    [myFiles, busy, lastAddedId, importFile, removeFile, removeAllFiles, getDataset, datasetName],
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
