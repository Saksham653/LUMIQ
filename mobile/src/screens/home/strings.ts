import { defineStrings } from '@/i18n/local';

// Home's own words. Everything else on Home still comes from the shared
// dictionary through useT(). English and Hindi are complete; the other
// languages show the English line until they are translated.
export const HOME_STRINGS = defineStrings({
  en: {
    // The spoken name of the "A अ" control.
    changeLanguage: 'Change language',
    playStory: 'Play the story',
    askAbout: 'Ask about this',
    story: 'Story',
    // The headline of a file that has nothing to add up.
    noNumbers: 'No number columns in this file',
  },
  hi: {
    changeLanguage: 'भाषा बदलें',
    playStory: 'कहानी चलाएं',
    askAbout: 'इसके बारे में पूछें',
    story: 'कहानी',
    noNumbers: 'इस फ़ाइल में संख्या वाला कोई कॉलम नहीं है',
  },
});

export type HomeStringKey = keyof typeof HOME_STRINGS.en;
