import { defineStrings } from '@/i18n/local';

// File check's own words. Everything else still comes from the shared
// dictionary through useT() (the check names, the lines that say what was
// found, the fix tips, the column words). English and Hindi are complete;
// the other languages show the English line until they are translated.
export const CHECK_STRINGS = defineStrings({
  en: {
    noFileTitle: 'Choose a file to check',
    working: 'Checking your file',
    failedTitle: 'This file could not be checked',
    // The ring, to a screen reader.
    scoreSpoken: 'File check: {score} out of 100. {grade}.',
    noRowsTitle: 'Nothing to check yet',
    worthFixing: 'Worth fixing first',
    points: '−{points} points',
    allClearTitle: 'Nothing to fix',
    allClearBody: 'All four checks are clear.',
    allClearSomeBody: 'Every check that could run is clear.',
    // What each thing worth fixing is.
    fixEmpty: 'Empty cells in {column}',
    fixRepeats: 'Repeated rows',
    fixMixed: 'Numbers and words mixed in {column}',
    fixUnusual: 'Unusual values in {column}',
    // Why it matters.
    whyEmpty: '{empty} of {rows} cells are empty. Totals and averages skip empty cells.',
    whyRepeats: '{repeats} of {rows} rows repeat an earlier row, so they may be counted twice.',
    whyMixed: '{numericish} of {total} values look like numbers and the rest like words, so this column is not added up.',
    whyUnusualOne: 'One value is far from the usual {typical}, so it can pull the total or the average a long way.',
    whyUnusualMany: '{count} values are far from the usual {typical}, so they can pull the total or the average a long way.',
    // The result of each check, beside it.
    toFix: 'To fix',
    notChecked: 'Not checked',
    noNumbersToCheck: 'This file has no number columns, so there were no values to compare.',
  },
  hi: {
    noFileTitle: 'जाँचने के लिए कोई फ़ाइल चुनें',
    working: 'आपकी फ़ाइल जाँची जा रही है',
    failedTitle: 'यह फ़ाइल जाँची नहीं जा सकी',
    scoreSpoken: 'फ़ाइल जाँच: 100 में से {score}। {grade}।',
    noRowsTitle: 'अभी जाँचने को कुछ नहीं है',
    worthFixing: 'पहले इन्हें ठीक करें',
    points: '−{points} अंक',
    allClearTitle: 'ठीक करने को कुछ नहीं',
    allClearBody: 'चारों जाँच ठीक हैं।',
    allClearSomeBody: 'जो जाँच हो सकीं, वे सब ठीक हैं।',
    fixEmpty: '{column} में खाली खाने',
    fixRepeats: 'दोहराई गई पंक्तियाँ',
    fixMixed: '{column} में संख्याएँ और शब्द मिले हुए हैं',
    fixUnusual: '{column} में असामान्य संख्याएँ',
    whyEmpty: '{rows} में से {empty} खाने खाली हैं। कुल और औसत में खाली खाने छोड़ दिए जाते हैं।',
    whyRepeats: '{rows} में से {repeats} पंक्तियाँ पहले की किसी पंक्ति जैसी हैं, इसलिए वे दो बार गिनी जा सकती हैं।',
    whyMixed: '{total} में से {numericish} मान संख्या जैसे हैं और बाकी शब्द, इसलिए यह कॉलम जोड़ा नहीं जाता।',
    whyUnusualOne: 'एक संख्या आम संख्या {typical} से बहुत दूर है, इसलिए यह कुल या औसत को बहुत बदल सकती है।',
    whyUnusualMany: '{count} संख्याएँ आम संख्या {typical} से बहुत दूर हैं, इसलिए ये कुल या औसत को बहुत बदल सकती हैं।',
    toFix: 'सुधारें',
    notChecked: 'जाँच नहीं हुई',
    noNumbersToCheck: 'इस फ़ाइल में संख्या वाला कोई कॉलम नहीं है, इसलिए तुलना करने को कोई संख्या नहीं थी।',
  },
});

export type CheckStringKey = keyof typeof CHECK_STRINGS.en;
