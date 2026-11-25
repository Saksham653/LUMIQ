import { defineStrings } from '@/i18n/local';

// The names and descriptions of the phone's own sample files. The web app's
// three keep theirs in the shared dictionary (sample.sales.name and so on).
// English and Hindi are complete; other languages show the English line.
export const SAMPLE_STRINGS = defineStrings({
  en: {
    'shop.name': 'Shop sales',
    'shop.desc': 'Two months of sales at a small shop',
    'fees.name': 'School fees',
    'fees.desc': 'Who paid each month and who still owes',
  },
  hi: {
    'shop.name': 'दुकान की बिक्री',
    'shop.desc': 'एक छोटी दुकान की दो महीने की बिक्री',
    'fees.name': 'स्कूल की फ़ीस',
    'fees.desc': 'हर महीने किसने फ़ीस भरी और किसकी बाकी है',
  },
});

export type SampleStringKey = keyof typeof SAMPLE_STRINGS.en;
