import { datasetFromPreview } from '@core/data/uploadPreview.js';
import { uniqueDatasetName } from '@core/data/dataset.js';
import { SAMPLE_DATASETS } from '@core/data/sampleDatasets.js';
import { BottomSheet, Button, Column, Host, Text as UIText } from '@expo/ui';
import { File, type PickSingleFileResult } from 'expo-file-system';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { deleteDataset, listStoredFiles, readDataset, storeDataset, type StoredFile } from '@/data/dataset-store';
import { ImportError, previewFromFile } from '@/data/import-file';
import { findSample } from '@/data/samples';
import type { Dataset } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';

type DatasetsState = {
  myFiles: StoredFile[];
  importFile: () => Promise<void>;
  removeFile: (id: string) => void;
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
      // Let the "Opening your file" overlay appear before the parsing work.
      await new Promise((resolve) => setTimeout(resolve, 60));
      const preview = await previewFromFile(file, chooseSheet);
      if (!preview) return;
      preview.name = uniqueDatasetName(preview.name, myFiles.map((stored) => stored.name));
      const dataset = datasetFromPreview(preview, preview.types) as Dataset;
      cache.current.set(dataset.id, dataset);
      setMyFiles(storeDataset(dataset, myFiles));
      setActiveDatasetId(dataset.id);
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

  const value = useMemo<DatasetsState>(
    () => ({ myFiles, importFile, removeFile, getDataset, datasetName }),
    [myFiles, importFile, removeFile, getDataset, datasetName],
  );

  return (
    <DatasetsContext.Provider value={value}>
      {children}

      <Modal transparent visible={busy} animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.busyCard, { backgroundColor: colors.card }]} accessible accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="label">{t('import.opening')}</AppText>
          </View>
        </View>
      </Modal>

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

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5, 9, 20, 0.45)' },
  busyCard: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xxxl, borderRadius: Radius.lg },
});
