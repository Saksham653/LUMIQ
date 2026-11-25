import { Alert, ScrollView, StyleSheet } from 'react-native';

import { hapticSelection } from '@/components/haptics';
import { LANGUAGES, languageInfo, type Language } from '@/i18n';
import { RadioMark } from '@/screens/more/parts';
import { useAppState, useT } from '@/state/app-state';
import { setAiConsent, useAiConsent } from '@/state/consent';
import { needsRestart, restartForLanguage } from '@/state/layout-direction';
import { rhythm, space, useTheme } from '@/theme';
import { List, ListRow } from '@/ui/list';
import { VStack } from '@/ui/stack';
import { Tag } from '@/ui/tag';
import { Txt } from '@/ui/text';
import { loadSettings, saveSettings } from '@/utils/settings-file';

// More > Language: the eight languages, each in its own script with its
// English name under it. The choice applies at once and is remembered.
// Switching to or from Hebrew (right to left) restarts the app once, after a
// one-line notice.
export function LanguageScreen() {
  const { colors, mode } = useTheme();
  const t = useT();
  const { language, setLanguage } = useAppState();
  const consent = useAiConsent();

  const choose = (code: Language) => {
    if (code === language) return;
    hapticSelection();
    if (!needsRestart(code)) {
      setLanguage(code);
      return;
    }
    // The notice is written in the language being chosen, so it can be read
    // by the person who chose it.
    const info = languageInfo(code);
    Alert.alert('', t('language.restartBody', { language: info.native }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('language.restart'),
        onPress: () => {
          setLanguage(code);
          // setLanguage saves the settings file from the app state's own
          // copy, which can hold an older look and an older answer about AI.
          // The restart would start from those, so both are written back
          // before it.
          saveSettings({ ...loadSettings(), themeMode: mode });
          setAiConsent(consent);
          void restartForLanguage(code);
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={styles.content}>
      <Txt tone="soft" style={styles.inset}>
        {t('language.intro')}
      </Txt>
      <List role="radiogroup" accessibilityLabel={t('language.title')}>
        {LANGUAGES.map((item) => {
          const selected = item.code === language;
          // English is the one language whose two names are the same word.
          const english: string | undefined = item.code === 'en' ? undefined : item.english;
          const spoken = [item.native, english, item.beta ? t('language.beta') : undefined]
            .filter((part) => part !== undefined)
            .join(', ');
          return (
            <ListRow
              key={item.code}
              leading={<RadioMark chosen={selected} />}
              title={item.native}
              subtitle={english}
              trailing={item.beta ? <Tag label={t('language.beta')} /> : undefined}
              role="radio"
              aria-checked={selected}
              accessibilityLabel={spoken}
              onPress={() => choose(item.code)}
            />
          );
        })}
      </List>
      <VStack gap="xs" px="xs">
        <Txt variant="small" tone="soft">
          {t('language.betaNote')}
        </Txt>
        <Txt variant="small" tone="soft">
          {t('language.rtlNote')}
        </Txt>
      </VStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: rhythm.screenEdge, gap: space.lg, paddingBottom: space.huge },
  // Lines the words up with the words inside the card's round corner.
  inset: { paddingHorizontal: space.xs },
});
