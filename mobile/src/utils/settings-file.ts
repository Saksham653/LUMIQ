import { File, Paths } from 'expo-file-system';

import type { Language } from '@/i18n';

// Small app settings, kept in one JSON file in the app's private storage on the
// phone. Nothing here ever leaves the device.
export type StoredSettings = {
  language?: Language;
  onboarded?: boolean;
  activeDatasetId?: string;
};

const settingsFile = () => new File(Paths.document, 'lumiq-settings.json');

export function loadSettings(): StoredSettings {
  try {
    const file = settingsFile();
    if (!file.exists) return {};
    const parsed: unknown = JSON.parse(file.textSync());
    return parsed && typeof parsed === 'object' ? (parsed as StoredSettings) : {};
  } catch {
    // A missing or damaged file just means first-launch defaults.
    return {};
  }
}

export function saveSettings(settings: StoredSettings): void {
  try {
    const file = settingsFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(settings));
  } catch (error) {
    console.warn('LUMIQ: could not save settings', error);
  }
}
