import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Group, ListRow, Radio, Tag } from '@/components/grouped';
import { hapticSelection } from '@/components/haptics';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LANGUAGES, languageInfo, type Language } from '@/i18n';
import { useAppState, useT } from '@/state/app-state';
import { needsRestart, restartForLanguage } from '@/state/layout-direction';

// More > Language: the eight languages, each in its own script with its
// English name under it. The choice applies at once and is remembered.
// Switching to or from Hebrew (right to left) restarts the app once, after a
// one-line notice.
export function LanguageScreen() {
  const colors = useTheme();
  const t = useT();
  const { language, setLanguage } = useAppState();

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
          void restartForLanguage(code);
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <AppText tone="secondary">{t('language.intro')}</AppText>
      <Group>
        {LANGUAGES.map((item) => {
          const selected = item.code === language;
          return (
            <ListRow
              key={item.code}
              onPress={() => choose(item.code)}
              accessibilityLabel={`${item.native}, ${item.english}${item.beta ? `, ${t('language.beta')}` : ''}`}
              accessibilityState={{ selected }}
              title={
                <View style={styles.titleRow}>
                  <AppText variant="heading" style={styles.native}>
                    {item.native}
                  </AppText>
                  {item.beta ? <Tag label={t('language.beta')} /> : null}
                </View>
              }
              subtitle={item.english}
              trailing={<Radio selected={selected} />}
            />
          );
        })}
      </Group>
      <View style={styles.notes}>
        <AppText variant="small" tone="secondary">
          {t('language.betaNote')}
        </AppText>
        <AppText variant="small" tone="secondary">
          {t('language.rtlNote')}
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.huge },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  native: { fontWeight: '600' },
  notes: { gap: Spacing.xs, paddingHorizontal: Spacing.xs },
});
