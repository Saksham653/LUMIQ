import { File, Paths } from 'expo-file-system';

import type { Language } from '@/i18n';

// A number style picked by hand on the Numbers & currency screen, or "auto"
// to follow the language (see @core/lib/numberFormat.js).
export type NumberStyleChoice = 'auto' | 'comma-dot' | 'dot-comma' | 'space-comma' | 'indian' | 'cjk';

// The currency for amount columns when a file shows none, or null for plain
// numbers. Never used to convert anything.
export type DefaultCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'INR' | 'ILS';

// Small app settings, kept in one JSON file in the app's private storage on the
// phone. Nothing here ever leaves the device.
export type StoredSettings = {
  language?: Language;
  onboarded?: boolean;
  activeDatasetId?: string;
  numberStyle?: NumberStyleChoice;
  defaultCurrency?: DefaultCurrency | null;
  // Light, dark, or follow the phone (see @/theme/mode).
  themeMode?: 'system' | 'light' | 'dark';
  // Whether the person has allowed questions to be sent to the AI (see
  // @/state/consent). Missing means they have not been asked yet.
  aiConsent?: 'yes' | 'no';
  // True once the full opening has played; later opens play only its end.
  launchSeen?: boolean;
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

// Written synchronously: `write()` is asynchronous, so two saves in a row
// (Welcome's "Try with sample data" saves twice) could land out of order and
// lose the newer one, and a save just before the Hebrew restart could miss it.
export function saveSettings(settings: StoredSettings): void {
  try {
    const file = settingsFile();
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(settings));
  } catch (error) {
    console.warn('LUMIQ: could not save settings', error);
  }
}
