import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { languageInfo, type StringKey } from '@/i18n';
import { defineStrings, useLocalT } from '@/i18n/local';
import { PillChoice } from '@/screens/more/parts';
import { useAppState, useT } from '@/state/app-state';
import { setAiConsent, useAiConsent } from '@/state/consent';
import { useDatasets } from '@/state/datasets';
import { THEME_MODES, rhythm, setThemeMode, space, useTheme, useThemeMode, type ThemeMode } from '@/theme';
import type { IconName } from '@/ui/icon-set';
import { List, ListRow } from '@/ui/list';
import { Notice } from '@/ui/notice';
import { Section } from '@/ui/section';
import { Txt } from '@/ui/text';

// The words of this screen that the shared dictionary does not have yet.
// English and Hindi; the other languages fall back to English.
const STRINGS = defineStrings({
  en: {
    groupFile: 'This file',
    groupLook: 'Look',
    lookTitle: 'Light or dark',
    lookSystem: 'Follows your phone',
    lookLight: 'Always light',
    lookDark: 'Always dark',
    lookPickPhone: 'Phone',
    lookPickLight: 'Light',
    lookPickDark: 'Dark',
    groupLanguage: 'Language and numbers',
    groupAi: 'AI and privacy',
    aiYesTitle: 'Ask may send your questions to the AI',
    aiNoTitle: 'Ask may not send your questions to the AI',
    aiUnsetTitle: 'Ask may not send your questions yet',
    aiYesNote: 'You allowed this. You can change it here at any time.',
    aiNoNote: 'You did not allow this. Nothing is sent, and Ask asks you again before it sends anything.',
    aiUnsetNote: 'You have not chosen yet. Nothing is sent until you allow it.',
    aiAllowed: 'Allowed',
    aiNotAllowed: 'Not allowed',
    aiChoice: 'May Ask send your questions to the AI?',
    groupData: 'Your data',
    eraseTitle: 'Erase everything',
    eraseNote: 'Removes your files from LUMIQ on this phone and resets your choices. This cannot be undone.',
    eraseAskTitle: 'Erase everything?',
    eraseAskBody:
      'This removes your files from LUMIQ on this phone and resets your choices: the look, numbers and currency, and whether Ask may send questions. Your language stays. Your original files are not touched. This cannot be undone.',
    eraseConfirm: 'Erase everything',
    eraseDone: 'Done. Your files were removed from LUMIQ on this phone and your choices were reset.',
    eraseFailed: 'Not everything could be erased. Please try again.',
    groupAbout: 'About',
  },
  hi: {
    groupFile: 'यह फ़ाइल',
    groupLook: 'रंग-रूप',
    lookTitle: 'लाइट या डार्क',
    lookSystem: 'आपके फ़ोन जैसा रहेगा',
    lookLight: 'हमेशा लाइट',
    lookDark: 'हमेशा डार्क',
    lookPickPhone: 'फ़ोन',
    lookPickLight: 'लाइट',
    lookPickDark: 'डार्क',
    groupLanguage: 'भाषा और संख्याएँ',
    groupAi: 'AI और निजता',
    aiYesTitle: '"पूछें" आपके सवाल AI को भेज सकता है',
    aiNoTitle: '"पूछें" आपके सवाल AI को नहीं भेज सकता',
    aiUnsetTitle: '"पूछें" अभी आपके सवाल नहीं भेज सकता',
    aiYesNote: 'आपने इसकी अनुमति दी है। इसे यहाँ कभी भी बदल सकते हैं।',
    aiNoNote: 'आपने इसकी अनुमति नहीं दी है। कुछ भी नहीं भेजा जाता, और कुछ भी भेजने से पहले "पूछें" आपसे फिर पूछेगा।',
    aiUnsetNote: 'आपने अभी चुना नहीं है। जब तक आप अनुमति नहीं देते, कुछ भी नहीं भेजा जाएगा।',
    aiAllowed: 'अनुमति है',
    aiNotAllowed: 'अनुमति नहीं',
    aiChoice: 'क्या "पूछें" आपके सवाल AI को भेज सकता है?',
    groupData: 'आपका डेटा',
    eraseTitle: 'सब कुछ मिटाएं',
    eraseNote: 'इस फ़ोन पर LUMIQ से आपकी फ़ाइलें हट जाएंगी और आपकी पसंद पहले जैसी हो जाएगी। इसे वापस नहीं लाया जा सकता।',
    eraseAskTitle: 'सब कुछ मिटाएं?',
    eraseAskBody:
      'इस फ़ोन पर LUMIQ से आपकी फ़ाइलें हट जाएंगी और आपकी पसंद पहले जैसी हो जाएगी: रंग-रूप, संख्याएँ और मुद्रा, और "पूछें" सवाल भेज सकता है या नहीं। आपकी भाषा वही रहेगी। आपकी असली फ़ाइलों पर कोई असर नहीं होगा। इसे वापस नहीं लाया जा सकता।',
    eraseConfirm: 'सब कुछ मिटाएं',
    eraseDone: 'हो गया। इस फ़ोन पर LUMIQ से आपकी फ़ाइलें हटा दी गईं और आपकी पसंद पहले जैसी कर दी गई।',
    eraseFailed: 'सब कुछ नहीं मिट पाया। कृपया फिर से कोशिश करें।',
    groupAbout: 'ऐप के बारे में',
  },
});

const TOOLS: { icon: IconName; titleKey: StringKey; descKey: StringKey; href: Href }[] = [
  { icon: 'what-if', titleKey: 'more.whatIf', descKey: 'more.whatIfDesc', href: '/what-if' },
  { icon: 'file-check', titleKey: 'more.fileCheck', descKey: 'more.fileCheckDesc', href: '/file-check' },
  { icon: 'report', titleKey: 'more.report', descKey: 'more.reportDesc', href: '/report' },
];

// The words for each look: the pill, and the line that says what it does.
const LOOK_PICK = { system: 'lookPickPhone', light: 'lookPickLight', dark: 'lookPickDark' } as const;
const LOOK_NOTE = { system: 'lookSystem', light: 'lookLight', dark: 'lookDark' } as const;

// The words for each answer to "may Ask send questions". Not chosen yet is
// treated as not allowed yet.
const AI_TITLE = { yes: 'aiYesTitle', no: 'aiNoTitle', unset: 'aiUnsetTitle' } as const;
const AI_NOTE = { yes: 'aiYesNote', no: 'aiNoNote', unset: 'aiUnsetNote' } as const;

// More: a calm settings screen. The tools for the open file, the look, the
// language and the numbers, what Ask may send (with the privacy promise in
// plain words), erasing everything, and the version.
export function More() {
  const { colors } = useTheme();
  const t = useT();
  const lt = useLocalT(STRINGS);
  const { language, numberStyle, setNumberStyle, setDefaultCurrency } = useAppState();
  const { removeAllFiles } = useDatasets();
  const mode = useThemeMode();
  const consent = useAiConsent();

  // After an erase, the screen says it is done (or that something could not
  // be erased) until the next choice.
  const [erased, setErased] = useState(false);
  const [eraseFailed, setEraseFailed] = useState(false);

  // A new choice after an erase takes the "done" line away: it is about what
  // was erased, not about what is chosen now.
  const forgetErase = () => {
    setErased(false);
  };

  const eraseEverything = () => {
    setEraseFailed(false);
    setNumberStyle('auto');
    setDefaultCurrency(null);
    setThemeMode('system');
    setAiConsent('unset');
    try {
      removeAllFiles();
      setErased(true);
    } catch {
      setEraseFailed(true);
    }
  };

  const askErase = () => {
    Alert.alert(lt('eraseAskTitle'), lt('eraseAskBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: lt('eraseConfirm'), style: 'destructive', onPress: eraseEverything },
    ]);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={styles.content}>
      <Section size="sm" title={lt('groupFile')}>
        <List>
          {TOOLS.map((tool) => (
            <ListRow
              key={tool.titleKey}
              icon={tool.icon}
              title={t(tool.titleKey)}
              subtitle={t(tool.descKey)}
              chevron
              accessibilityLabel={`${t(tool.titleKey)}. ${t(tool.descKey)}`}
              onPress={() => router.push(tool.href)}
            />
          ))}
        </List>
      </Section>

      <Section size="sm" title={lt('groupLook')}>
        <List>
          <ListRow icon="theme" title={lt('lookTitle')} subtitle={lt(LOOK_NOTE[mode])} style={styles.tall}>
            <View style={styles.control}>
              <PillChoice<ThemeMode>
                options={THEME_MODES.map((option) => ({ value: option, label: lt(LOOK_PICK[option]) }))}
                value={mode}
                onChange={(next) => {
                  forgetErase();
                  setThemeMode(next);
                }}
                accessibilityLabel={lt('groupLook')}
              />
            </View>
          </ListRow>
        </List>
      </Section>

      <Section size="sm" title={lt('groupLanguage')}>
        <List>
          <ListRow
            icon="language"
            title={t('more.language')}
            trailing={languageInfo(language).native}
            chevron
            accessibilityLabel={`${t('more.language')}: ${languageInfo(language).native}`}
            onPress={() => router.push('/language')}
          />
          <ListRow
            icon="numbers"
            title={t('more.numbers')}
            subtitle={numberStyle === 'auto' ? t('numbers.auto') : undefined}
            chevron
            onPress={() => router.push('/numbers')}
          />
        </List>
      </Section>

      <Section size="sm" title={lt('groupAi')}>
        <List>
          <ListRow icon="ask" title={lt(AI_TITLE[consent])} subtitle={lt(AI_NOTE[consent])} style={styles.tall}>
            <View style={styles.control}>
              <PillChoice<'yes' | 'no'>
                options={[
                  { value: 'yes', label: lt('aiAllowed') },
                  { value: 'no', label: lt('aiNotAllowed') },
                ]}
                value={consent === 'unset' ? null : consent}
                onChange={(next) => {
                  forgetErase();
                  setAiConsent(next);
                }}
                accessibilityLabel={lt('aiChoice')}
              />
            </View>
          </ListRow>
        </List>
        <Notice icon="lock">
          <Txt>{t('more.privacyText')}</Txt>
        </Notice>
      </Section>

      <Section size="sm" title={lt('groupData')}>
        <List>
          <ListRow
            icon="delete"
            variant="destructive"
            title={lt('eraseTitle')}
            subtitle={lt('eraseNote')}
            onPress={askErase}
          />
        </List>
        {erased ? <Notice tone="good" live title={lt('eraseDone')} /> : null}
        {eraseFailed ? <Notice tone="bad" live title={lt('eraseFailed')} /> : null}
      </Section>

      <Section size="sm" title={lt('groupAbout')}>
        <List>
          <ListRow
            icon="info"
            title={Constants.expoConfig?.name ?? 'LUMIQ'}
            subtitle={t('more.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          />
        </List>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: rhythm.screenEdge, gap: rhythm.sectionGap, paddingBottom: space.huge },
  // A row with a control under its words: the icon stays beside the title
  // instead of sinking to the middle of a tall row.
  tall: { alignItems: 'flex-start', paddingVertical: space.sm },
  // The room between a row's words and the control under them.
  control: { paddingTop: space.sm },
});
