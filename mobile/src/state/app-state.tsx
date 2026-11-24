import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { isLanguage, translate, type Language, type StringKey } from '@/i18n';
import { makeNumbers, type Numbers } from '@/utils/format';
import {
  loadSettings,
  saveSettings,
  type DefaultCurrency,
  type NumberStyleChoice,
  type StoredSettings,
} from '@/utils/settings-file';

type AppState = {
  language: Language;
  // Saves the language at once (before any restart for Hebrew).
  setLanguage: (language: Language) => void;
  numberStyle: NumberStyleChoice;
  setNumberStyle: (style: NumberStyleChoice) => void;
  defaultCurrency: DefaultCurrency | null;
  setDefaultCurrency: (currency: DefaultCurrency | null) => void;
  onboarded: boolean;
  completeOnboarding: () => void;
  activeDatasetId: string | null;
  setActiveDatasetId: (id: string | null) => void;
};

const AppStateContext = createContext<AppState | null>(null);

// Everyone starts in English, whatever the phone's own language; the
// language is chosen under More > Language and remembered. The layout
// direction is checked at launch by the root layout (fixDirectionAtLaunch).
function initialSettings(): StoredSettings {
  const settings = loadSettings();
  const language = isLanguage(settings.language) ? settings.language : 'en';
  return { ...settings, language };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(initialSettings);

  const update = useCallback((patch: Partial<StoredSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      language: isLanguage(settings.language) ? settings.language : 'en',
      setLanguage: (language) => {
        const next = { ...settings, language };
        saveSettings(next);
        setSettings(next);
      },
      numberStyle: settings.numberStyle ?? 'auto',
      setNumberStyle: (numberStyle) => update({ numberStyle }),
      defaultCurrency: settings.defaultCurrency ?? null,
      setDefaultCurrency: (defaultCurrency) => update({ defaultCurrency }),
      onboarded: settings.onboarded === true,
      completeOnboarding: () => update({ onboarded: true }),
      activeDatasetId: settings.activeDatasetId ?? null,
      setActiveDatasetId: (id) => update({ activeDatasetId: id ?? undefined }),
    }),
    [settings, update],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) throw new Error('useAppState must be used inside AppStateProvider');
  return state;
}

// Number formatting for the chosen language, number style and default
// currency (see @/utils/format).
export function useNumbers(): Numbers {
  const { language, numberStyle, defaultCurrency } = useAppState();
  return useMemo(() => makeNumbers(language, numberStyle, defaultCurrency), [language, numberStyle, defaultCurrency]);
}

// t('home.title') in the current language.
export function useT() {
  const { language } = useAppState();
  return useCallback(
    (key: StringKey, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );
}
