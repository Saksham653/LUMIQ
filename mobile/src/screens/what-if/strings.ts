import { defineStrings } from '@/i18n/local';

// What if's own words. Everything else still comes from the shared
// dictionary through useT() (the steps, the change in words, the labels of
// the result). English and Hindi are complete; the other languages show the
// English line until they are translated.
export const WHAT_IF_STRINGS = defineStrings({
  en: {
    noFileTitle: 'Choose a file to try a change',
    working: 'Getting your numbers ready',
    failedTitle: 'The numbers in this file could not be worked out',
    noNumbersTitle: 'No numbers to change',
    // The difference, as one plain sentence.
    sumUp: 'Total {metric} goes from {before} to {after}, {diff} more.',
    sumDown: 'Total {metric} goes from {before} to {after}, {diff} less.',
    sumSame: 'Total {metric} stays at {now}.',
    avgUp: 'Average {metric} goes from {before} to {after}, {diff} more.',
    avgDown: 'Average {metric} goes from {before} to {after}, {diff} less.',
    avgSame: 'Average {metric} stays at {now}.',
    unknown: '{metric} has no values to change, so there is nothing to work out.',
    // The row of quick changes under the slider, to a screen reader.
    presets: 'Quick changes',
  },
  hi: {
    noFileTitle: 'बदलाव आज़माने के लिए कोई फ़ाइल चुनें',
    working: 'आपकी संख्याएँ तैयार की जा रही हैं',
    failedTitle: 'इस फ़ाइल की संख्याओं का हिसाब नहीं हो सका',
    noNumbersTitle: 'बदलने को कोई संख्या नहीं',
    sumUp: 'कुल {metric} {before} से {after} हो जाएगा, यानी {diff} ज़्यादा।',
    sumDown: 'कुल {metric} {before} से {after} हो जाएगा, यानी {diff} कम।',
    sumSame: 'कुल {metric} {now} ही रहेगा।',
    avgUp: 'औसत {metric} {before} से {after} हो जाएगा, यानी {diff} ज़्यादा।',
    avgDown: 'औसत {metric} {before} से {after} हो जाएगा, यानी {diff} कम।',
    avgSame: 'औसत {metric} {now} ही रहेगा।',
    unknown: '{metric} में बदलने के लिए कोई संख्या नहीं है, इसलिए हिसाब करने को कुछ नहीं है।',
    presets: 'झटपट बदलाव',
  },
});

export type WhatIfStringKey = keyof typeof WHAT_IF_STRINGS.en;
