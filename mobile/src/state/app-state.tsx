import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { translate, type Language, type StringKey } from '@/i18n';
import { loadSettings, saveSettings, type StoredSettings } from '@/utils/settings-file';

type AppState = {
  language: Language;
  setLanguage: (language: Language) => void;
  onboarded: boolean;
  completeOnboarding: () => void;
  activeDatasetId: string | null;
  setActiveDatasetId: (id: string | null) => void;
};

const AppStateContext = createContext<AppState | null>(null);

// Hindi phones start in Hindi; everyone else starts in English. The choice
// can be changed on the Welcome screen and under More.
function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'hi' ? 'hi' : 'en';
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(loadSettings);

  const update = useCallback((patch: Partial<StoredSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      language: settings.language ?? deviceLanguage(),
      setLanguage: (language) => update({ language }),
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

// t('home.title') in the current language.
export function useT() {
  const { language } = useAppState();
  return useCallback(
    (key: StringKey, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );
}
