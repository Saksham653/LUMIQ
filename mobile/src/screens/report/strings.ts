import { defineStrings } from '@/i18n/local';

// The Report's own words. Everything else still comes from the shared
// dictionary through useT() (the headings, the footnotes, the share words,
// the footer). English and Hindi are complete; the other languages show the
// English line until they are translated.
export const REPORT_STRINGS = defineStrings({
  en: {
    noFileTitle: 'Choose a file to make a report',
    working: 'Making your report',
    failedTitle: 'The report could not be made for this file',
    kicker: 'LUMIQ report',
    topGroup: 'Top group',
    noTopGroup: 'No one group stands out in this file.',
    dates: 'Dates',
    dateColumn: 'From the {column} column.',
    noDates: 'This file has no column of dates, months, weeks or quarters.',
    // The small ring, to a screen reader.
    scoreSpoken: 'File check: {score} out of 100. {grade}.',
    openCheck: 'Open File check',
    // Under the share button: what the shared text holds.
    shareContains:
      "The text holds the file's name and size, the key numbers, what LUMIQ noticed, the file check score and how each number was worked out. Your file itself is not sent.",
  },
  hi: {
    noFileTitle: 'रिपोर्ट बनाने के लिए कोई फ़ाइल चुनें',
    working: 'आपकी रिपोर्ट बन रही है',
    failedTitle: 'इस फ़ाइल की रिपोर्ट नहीं बन सकी',
    kicker: 'LUMIQ रिपोर्ट',
    topGroup: 'सबसे बड़ा समूह',
    noTopGroup: 'इस फ़ाइल में कोई एक समूह अलग से आगे नहीं दिखता।',
    dates: 'तारीखें',
    dateColumn: '{column} कॉलम से।',
    noDates: 'इस फ़ाइल में तारीख, महीने, हफ़्ते या तिमाही वाला कोई कॉलम नहीं है।',
    scoreSpoken: 'फ़ाइल जाँच: 100 में से {score}। {grade}।',
    openCheck: 'फ़ाइल जाँच खोलें',
    shareContains:
      'टेक्स्ट में फ़ाइल का नाम और आकार, मुख्य संख्याएँ, LUMIQ ने क्या देखा, फ़ाइल जाँच का स्कोर और हर संख्या कैसे निकाली गई, यह सब होता है। आपकी फ़ाइल नहीं भेजी जाती।',
  },
});

export type ReportStringKey = keyof typeof REPORT_STRINGS.en;
