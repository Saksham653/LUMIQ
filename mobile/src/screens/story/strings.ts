import { defineStrings } from '@/i18n/local';

// The Story's own words, in English and in simple everyday Hindi. The other
// languages fall back to English until a native speaker has written them.
//
// The card sentences (cover, big, moved, standout, health, next) are read
// back by the number check, so they follow three rules:
// - no digits in the words themselves: every number comes in through a
//   {placeholder};
// - a number is never followed straight away by a name from the file (a
//   column called "K" or "M" would be read as its unit);
// - two placeholders never stand side by side with only a space between.
// `moved.monthYear` is the one exception: it makes a period's name ("March
// 2025"), and the whole name is treated as a name from the file.
export const STORY_STRINGS = defineStrings({
  en: {
    'screen.title': 'The story of your file',

    'unit.rows': '{n} rows',
    'unit.rowOne': '{n} row',
    'unit.cols': '{n} columns',
    'unit.colOne': '{n} column',
    'unit.rowsOver': '{n} rows',
    'unit.rowOneOver': '{n} row',
    'unit.days': '{n} days',
    'unit.dayOne': '{n} day',

    'month.1': 'January',
    'month.2': 'February',
    'month.3': 'March',
    'month.4': 'April',
    'month.5': 'May',
    'month.6': 'June',
    'month.7': 'July',
    'month.8': 'August',
    'month.9': 'September',
    'month.10': 'October',
    'month.11': 'November',
    'month.12': 'December',

    'name.group': 'Group {letter}',

    'cover.size': 'This file has {rows} and {cols}.',
    'cover.period': 'It covers {first} to {last}.',

    'big.title': 'The big number',
    'big.sum': 'Total {column} is {value}.',
    'big.avg': 'Average {column} is {value}.',
    'big.named': '{column} is {value}.',
    'big.howSum': 'Sum of {column} over {rows}.',
    'big.howSumSome': 'Sum of {column} over the {rows} that have a number.',
    'big.howAvg': 'Average of {column} over {rows}.',
    'big.howAvgSome': 'Average of {column} over the {rows} that have a number.',

    'moved.title': 'What moved',
    'moved.up': '{metric} went up {change} in {latest}: {to}, against {from} in {previous}.',
    'moved.down': '{metric} went down {change} in {latest}: {to}, against {from} in {previous}.',
    'moved.upSoFar': '{metric} is up {change} so far in {latest}: {to}, against {from} in {previous}.',
    'moved.downSoFar': '{metric} is down {change} so far in {latest}: {to}, against {from} in {previous}.',
    'moved.flat': '{metric} in {latest} is {to}, about the same as {from} in {previous}.',
    'moved.flatSoFar': '{metric} in {latest} so far is {to}, about the same as {from} in {previous}.',
    'moved.days': '{latest} has {latestDays} with data, {previous} has {previousDays}.',
    'moved.monthYear': '{month} {year}',

    'standout.title': 'What stands out',
    'standout.period': '{high} had the highest {metric}, {highValue}. {low} had the lowest, {lowValue}.',
    'standout.top':
      '{group} has {share} of all {metric} ({total}), the biggest share among the {groups} groups in {groupColumn}.',
    'standout.trendUp': '{metric} went up {change}, from {from} in {fromLabel} to {to} in {toLabel}.',
    'standout.trendDown': '{metric} went down {change}, from {from} in {fromLabel} to {to} in {toLabel}.',
    'standout.unusualHigh': '{value} in {column} is unusually high. Most values are around {typical}.',
    'standout.unusualLow': '{value} in {column} is unusually low. Most values are around {typical}.',
    'standout.highest': 'The highest {metric} is {value}, in {label}.',
    'standout.highestPlain': 'The highest {metric} is {value}.',

    'health.title': 'File health',
    'health.score': 'This file scores {score} out of {max} in the file check.',
    'health.clean': 'Nothing needs fixing.',
    'health.empty': 'Most worth fixing: empty cells in {column}, {empty} of {rows}.',
    'health.repeats': 'Most worth fixing: rows that repeat an earlier row, {repeats} of {rows}.',
    'health.mixed':
      'Most worth fixing: {column} mixes numbers and words. {numericish} of {total} values look like numbers.',
    'health.unusual':
      'Most worth checking: {count} values in {column} are far from the rest. Most values are around {typical}.',
    'health.unusualOne':
      'Most worth checking: {count} value in {column} is far from the rest. Most values are around {typical}.',

    'next.title': 'What next',
    'next.sentence': 'Ask a question about this file in your own words, or see more of what LUMIQ worked out.',

    'ui.progress': 'Card {n} of {total}',
    'ui.close': 'Close the story',
    'ui.back': 'Back',
    'ui.next': 'Next',
    'ui.backLabel': 'Previous card',
    'ui.nextLabel': 'Next card',
    'ui.tapHint': 'Tap one side of the card for the next card, the other side to go back',
    'ui.share': 'Share',
    'ui.shareLabel': 'Share this card as a picture',
    'ui.checkedOne': '{n} number on this card checked on your phone',
    'ui.checkedMany': '{n} numbers on this card checked on your phone',
    'ui.madeWith': 'Made with LUMIQ on my phone. No AI was used for this card.',
    'ui.ask': 'Ask about this file',
    'ui.insights': 'See insights',
    'ui.shareFailed': 'Sharing could not be opened on this phone.',
    'ui.empty': 'There is nothing to tell about this file yet.',

    'share.title': 'Share this card',
    'share.exact': 'This is the picture that will be shared.',
    'share.picture': 'The picture to share. {title}. {sentence} {stamp}',
    'share.hideNames': 'Hide names',
    'share.hideNamesHint': 'In the picture only: names from your file become Group A, Group B, and the file name is left out.',
    'share.send': 'Share',
    'share.kicker': 'The story of my file',
    'share.stampOne': '{n} number checked on this phone. No AI.',
    'share.stampMany': '{n} numbers checked on this phone. No AI.',
  },
  hi: {
    'screen.title': 'आपकी फ़ाइल की कहानी',

    'unit.rows': '{n} पंक्तियाँ',
    'unit.rowOne': '{n} पंक्ति',
    'unit.cols': '{n} कॉलम',
    'unit.colOne': '{n} कॉलम',
    'unit.rowsOver': '{n} पंक्तियों',
    'unit.rowOneOver': '{n} पंक्ति',
    'unit.days': '{n} दिन',
    'unit.dayOne': '{n} दिन',

    'month.1': 'जनवरी',
    'month.2': 'फ़रवरी',
    'month.3': 'मार्च',
    'month.4': 'अप्रैल',
    'month.5': 'मई',
    'month.6': 'जून',
    'month.7': 'जुलाई',
    'month.8': 'अगस्त',
    'month.9': 'सितंबर',
    'month.10': 'अक्टूबर',
    'month.11': 'नवंबर',
    'month.12': 'दिसंबर',

    'name.group': 'समूह {letter}',

    'cover.size': 'इस फ़ाइल में {rows} और {cols} हैं।',
    'cover.period': 'इसमें {first} से {last} तक का डेटा है।',

    'big.title': 'बड़ी संख्या',
    'big.sum': 'कुल {column}: {value}।',
    'big.avg': 'औसत {column}: {value}।',
    'big.named': '{column}: {value}।',
    'big.howSum': '{rows} में {column} का जोड़।',
    'big.howSumSome': 'जिन {rows} में संख्या है, उनमें {column} का जोड़।',
    'big.howAvg': '{rows} में {column} का औसत।',
    'big.howAvgSome': 'जिन {rows} में संख्या है, उनमें {column} का औसत।',

    'moved.title': 'क्या बदला',
    'moved.up': '{metric} में {change} की बढ़त: {previous} में {from} था, {latest} में {to} है।',
    'moved.down': '{metric} में {change} की गिरावट: {previous} में {from} था, {latest} में {to} है।',
    'moved.upSoFar': '{metric} में अब तक {change} की बढ़त: {previous} में {from} था, {latest} में अब तक {to} है।',
    'moved.downSoFar': '{metric} में अब तक {change} की गिरावट: {previous} में {from} था, {latest} में अब तक {to} है।',
    'moved.flat': '{metric} लगभग बराबर रहा: {previous} में {from} था, {latest} में {to} है।',
    'moved.flatSoFar': '{metric} अब तक लगभग बराबर है: {previous} में {from} था, {latest} में अब तक {to} है।',
    'moved.days': '{latest} में {latestDays} का डेटा है, {previous} में {previousDays} का।',
    'moved.monthYear': '{month} {year}',

    'standout.title': 'सबसे खास बात',
    'standout.period': 'सबसे ज़्यादा {metric}: {high} में {highValue}। सबसे कम: {low} में {lowValue}।',
    'standout.top':
      'कुल {metric} का {share} ({total}) {group} का है। यह {groupColumn} के {groups} समूहों में सबसे बड़ा हिस्सा है।',
    'standout.trendUp': '{metric} में {change} की बढ़त: {fromLabel} में {from} से {toLabel} में {to} तक।',
    'standout.trendDown': '{metric} में {change} की गिरावट: {fromLabel} में {from} से {toLabel} में {to} तक।',
    'standout.unusualHigh': '{column} में {value} आम से काफ़ी ज़्यादा है। ज़्यादातर संख्याएँ {typical} के आसपास हैं।',
    'standout.unusualLow': '{column} में {value} आम से काफ़ी कम है। ज़्यादातर संख्याएँ {typical} के आसपास हैं।',
    'standout.highest': 'सबसे ज़्यादा {metric}: {value}, {label} में।',
    'standout.highestPlain': 'सबसे ज़्यादा {metric}: {value}।',

    'health.title': 'फ़ाइल की सेहत',
    'health.score': 'फ़ाइल चेक में इस फ़ाइल को {max} में से {score} अंक मिले।',
    'health.clean': 'कुछ भी ठीक करने की ज़रूरत नहीं है।',
    'health.empty': 'सबसे पहले यह ठीक करें: {column} में खाली खाने, {rows} में से {empty}।',
    'health.repeats': 'सबसे पहले यह ठीक करें: दोहराई गई पंक्तियाँ, {rows} में से {repeats}।',
    'health.mixed':
      'सबसे पहले यह ठीक करें: {column} में संख्याएँ और शब्द मिले हुए हैं। {total} में से {numericish} मान संख्या जैसे हैं।',
    'health.unusual':
      'सबसे पहले यह देखें: {column} में {count} संख्याएँ बाकी से बहुत अलग हैं। ज़्यादातर संख्याएँ {typical} के आसपास हैं।',
    'health.unusualOne':
      'सबसे पहले यह देखें: {column} में {count} संख्या बाकी से बहुत अलग है। ज़्यादातर संख्याएँ {typical} के आसपास हैं।',

    'next.title': 'अब आगे',
    'next.sentence': 'इस फ़ाइल के बारे में अपने शब्दों में सवाल पूछें, या LUMIQ का बाकी हिसाब देखें।',

    'ui.progress': 'कार्ड {total} में से {n}',
    'ui.close': 'कहानी बंद करें',
    'ui.back': 'पीछे',
    'ui.next': 'आगे',
    'ui.backLabel': 'पिछला कार्ड',
    'ui.nextLabel': 'अगला कार्ड',
    'ui.tapHint': 'अगले कार्ड के लिए कार्ड के एक तरफ़ टैप करें, पीछे जाने के लिए दूसरी तरफ़',
    'ui.share': 'शेयर करें',
    'ui.shareLabel': 'यह कार्ड तस्वीर के रूप में शेयर करें',
    'ui.checkedOne': 'इस कार्ड की {n} संख्या आपके फ़ोन पर चेक की गई',
    'ui.checkedMany': 'इस कार्ड की {n} संख्याएँ आपके फ़ोन पर चेक की गईं',
    'ui.madeWith': 'LUMIQ से मेरे फ़ोन पर बनाया गया। इस कार्ड के लिए AI का इस्तेमाल नहीं हुआ।',
    'ui.ask': 'इस फ़ाइल के बारे में पूछें',
    'ui.insights': 'सारांश देखें',
    'ui.shareFailed': 'इस फ़ोन पर शेयर नहीं खुल सका।',
    'ui.empty': 'इस फ़ाइल के बारे में अभी बताने को कुछ नहीं है।',

    'share.title': 'यह कार्ड शेयर करें',
    'share.exact': 'यही तस्वीर शेयर होगी।',
    'share.picture': 'शेयर होने वाली तस्वीर। {title}। {sentence} {stamp}',
    'share.hideNames': 'नाम छिपाएँ',
    'share.hideNamesHint': 'सिर्फ़ तस्वीर में: फ़ाइल के नाम समूह A, समूह B बन जाएँगे, और फ़ाइल का नाम नहीं दिखेगा।',
    'share.send': 'शेयर करें',
    'share.kicker': 'मेरी फ़ाइल की कहानी',
    'share.stampOne': 'इस फ़ोन पर {n} संख्या चेक की गई। AI नहीं।',
    'share.stampMany': 'इस फ़ोन पर {n} संख्याएँ चेक की गईं। AI नहीं।',
  },
});

export type StoryKey = keyof (typeof STORY_STRINGS)['en'];
