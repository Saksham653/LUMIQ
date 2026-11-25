import { defineStrings } from '@/i18n/local';

// Insights' own words. Everything the screen said before (the figure names,
// their lines of proof, the chart titles, "What LUMIQ noticed") still comes
// from the shared dictionary through useT(). English and Hindi are complete;
// the other languages show the English line until they are translated.
export const INSIGHTS_STRINGS = defineStrings({
  en: {
    // Said once to a screen reader while the numbers are being worked out.
    working: 'Working out the numbers',
    // No file is open: the invitation. Its button is the shared "Go to Home".
    emptyTitle: 'Open a file to see what it says',
    emptyBody: 'Pick one of your files or a sample on Home. Its totals, a chart and what stands out will show here.',
    // The text button beside the chart's title, and the spoken hint of a row
    // of "What LUMIQ noticed".
    askAbout: 'Ask about this',
    opensAsk: 'Opens Ask',

    // The line of proof under "Highest".
    highestOf: 'Biggest of {n} values',
    highestOfIn: 'Biggest of {n} values, in {label}',

    // The main chart.
    chartHint: 'Touch a bar to read it.',
    // What the chart says to a screen reader, in parts: the title and the
    // count, then the highest and the lowest when one bar is that alone,
    // then the average.
    summaryBars: '{title}, {count} bars.',
    summaryHighest: 'Highest: {label}, {value}.',
    summaryLowest: 'Lowest: {label}, {value}.',
    summaryAverage: 'Average: {value}.',
    theHighest: '{value}, the highest',
    averageLine: 'Average {value}',
    previousBar: 'Previous bar',
    nextBar: 'Next bar',

    // The forecast card. It is never called checked: it is a guess.
    forecastTitle: 'What may come next',
    forecastNote: 'A guess from the trend so far, not a checked number.',
    forecastBand: 'The shaded band shows how far off it could be.',
    forecastTried:
      'Before guessing, LUMIQ hid the last {n} {units} and predicted them from the rest: it was off by {error} on average.',
    forecastTooFew: 'A forecast needs at least {need} {units}. This file has {have}, so LUMIQ will not guess yet.',
    forecastIrregular:
      'LUMIQ hid the last {n} {units} and tried to predict them, but it was off by {error} on average. That is too far off to trust, so it will not guess.',
    forecastBelowZero: 'The trend would fall below zero, which {metric} never does, so LUMIQ will not guess.',
    forecastNoTrend: 'LUMIQ could not find a steady trend in these numbers, so it will not guess.',
    forecastSummary:
      '{metric} for the last {count} {units}, then {steps} projected. Next: {next}, could be {low} to {high}. A guess, not a checked number.',
    forecastHint: 'Touch the line to read any point.',
    projected: 'projected',
    projectedDetail: '{value}, projected, could be {low} to {high}',
    previousPoint: 'Previous point',
    nextPoint: 'Next point',
    // The names of the projected points on the time axis: "+1 month".
    ahead: '+{n} {unit}',
    aheadBare: '+{n}',

    // Time units, one and many.
    monthOne: 'month',
    monthMany: 'months',
    quarterOne: 'quarter',
    quarterMany: 'quarters',
    weekOne: 'week',
    weekMany: 'weeks',
    dateOne: 'date',
    dateMany: 'dates',
  },
  hi: {
    working: 'संख्याएँ निकाली जा रही हैं',
    emptyTitle: 'फ़ाइल खोलें और देखें कि वह क्या कहती है',
    emptyBody: 'होम पर अपनी कोई फ़ाइल या सैंपल फ़ाइल चुनें। उसका कुल, चार्ट और खास बातें यहाँ दिखेंगी।',
    askAbout: 'इसके बारे में पूछें',
    opensAsk: 'पूछें खुलेगा',

    highestOf: '{n} संख्याओं में सबसे बड़ी',
    highestOfIn: '{n} संख्याओं में सबसे बड़ी, {label} में',

    chartHint: 'पढ़ने के लिए किसी बार को छुएं।',
    summaryBars: '{title}, {count} बार।',
    summaryHighest: 'सबसे ज़्यादा: {label}, {value}।',
    summaryLowest: 'सबसे कम: {label}, {value}।',
    summaryAverage: 'औसत: {value}।',
    theHighest: '{value}, सबसे ज़्यादा',
    averageLine: 'औसत {value}',
    previousBar: 'पिछला बार',
    nextBar: 'अगला बार',

    forecastTitle: 'आगे क्या हो सकता है',
    forecastNote: 'अब तक के रुझान से लगाया गया अंदाज़ा, जाँची हुई संख्या नहीं।',
    forecastBand: 'हल्की पट्टी दिखाती है कि अंदाज़ा कितना ऊपर-नीचे हो सकता है।',
    forecastTried:
      'अंदाज़ा लगाने से पहले LUMIQ ने आखिरी {n} {units} छिपाकर बाकी से उनका अंदाज़ा लगाया: औसतन {error} का फ़र्क रहा।',
    forecastTooFew: 'अंदाज़े के लिए कम से कम {need} {units} चाहिए। इस फ़ाइल में {have} हैं, इसलिए LUMIQ अभी अंदाज़ा नहीं लगाएगा।',
    forecastIrregular:
      'LUMIQ ने आखिरी {n} {units} छिपाकर उनका अंदाज़ा लगाया, पर औसतन {error} का फ़र्क रहा। इतने फ़र्क पर भरोसा नहीं किया जा सकता, इसलिए यह अंदाज़ा नहीं लगाएगा।',
    forecastBelowZero:
      'यह रुझान शून्य से नीचे चला जाएगा, जबकि {metric} कभी शून्य से नीचे नहीं जाता, इसलिए LUMIQ अंदाज़ा नहीं लगाएगा।',
    forecastNoTrend: 'इन संख्याओं में LUMIQ को कोई साफ़ रुझान नहीं मिला, इसलिए यह अंदाज़ा नहीं लगाएगा।',
    forecastSummary:
      '{metric}, आखिरी {count} {units}, और उसके बाद के {steps} का अंदाज़ा। अगला: {next}, {low} से {high} के बीच हो सकता है। यह अंदाज़ा है, जाँची हुई संख्या नहीं।',
    forecastHint: 'कोई भी बिंदु पढ़ने के लिए लाइन को छुएं।',
    projected: 'अनुमानित',
    projectedDetail: '{value}, अनुमानित, {low} से {high} के बीच हो सकता है',
    previousPoint: 'पिछला बिंदु',
    nextPoint: 'अगला बिंदु',
    ahead: '+{n} {unit}',
    aheadBare: '+{n}',

    monthOne: 'महीना',
    monthMany: 'महीने',
    quarterOne: 'तिमाही',
    quarterMany: 'तिमाहियाँ',
    weekOne: 'हफ़्ता',
    weekMany: 'हफ़्ते',
    dateOne: 'तारीख',
    dateMany: 'तारीखें',
  },
});

export type InsightsStringKey = keyof typeof INSIGHTS_STRINGS.en;
