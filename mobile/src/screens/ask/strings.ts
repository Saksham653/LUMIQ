import { defineStrings } from '@/i18n/local';

// The Ask screen's own new words (the count under an answer and the
// permission card). Everything older still comes from the shared dictionary
// through useT(). English and Hindi are complete; the other languages fall
// back to English.
export const ASK_STRINGS = defineStrings({
  en: {
    // The count under an answer. A second string for an answer with one
    // number, because the placeholders cannot change a word.
    countMany: '{checked} of {total} numbers checked on your phone',
    countOne: '{checked} of {total} number checked on your phone',
    // Said by a screen reader after each number in an answer.
    spokenChecked: 'checked',
    spokenUnmatched: 'could not be matched',
    // The permission card, shown before the first question is sent.
    consentTitle: 'Before your first question',
    consentSentLabel: 'What is sent',
    consentSent:
      'The question you type, the names of your columns with a short summary of each (its type and a few common values), and the calculated totals the answer is written from.',
    consentWhoLabel: 'Who receives it',
    consentWho: "LUMIQ's server and the AI service it uses.",
    consentNeverLabel: 'What never leaves your phone',
    consentNever: 'Your file and its rows.',
    consentNotNow: 'Not now',
    consentAllow: 'Allow',
  },
  hi: {
    countMany: '{total} में से {checked} संख्याएँ आपके फ़ोन पर जाँची गईं',
    countOne: '{total} में से {checked} संख्या आपके फ़ोन पर जाँची गई',
    spokenChecked: 'जाँचा गया',
    spokenUnmatched: 'मेल नहीं खा सका',
    consentTitle: 'आपके पहले सवाल से पहले',
    consentSentLabel: 'क्या भेजा जाता है',
    consentSent:
      'आपका लिखा सवाल, आपके कॉलम के नाम और हर कॉलम का छोटा सारांश (वह किस तरह का है और उसकी कुछ आम वैल्यू), और हिसाब से निकले वे टोटल जिनसे जवाब लिखा जाता है।',
    consentWhoLabel: 'यह किसे मिलता है',
    consentWho: 'LUMIQ का सर्वर और वह AI सर्विस जिसका वह इस्तेमाल करता है।',
    consentNeverLabel: 'क्या कभी आपके फ़ोन से बाहर नहीं जाता',
    consentNever: 'आपकी फ़ाइल और उसकी पंक्तियाँ।',
    consentNotNow: 'अभी नहीं',
    consentAllow: 'अनुमति दें',
  },
});
