import { Platform, type TextStyle } from 'react-native';

import type { Language } from '@/i18n';

// LUMIQ type. Three families with strict jobs (brand spec, section 5):
//   text        Anek Latin        all Latin text and headings
//   devanagari  Anek Devanagari   any string that contains Devanagari
//   figures     Outfit            digits only
// Normal width only. Each weight is its own named font: a custom font never
// takes `fontWeight`. Hebrew, Japanese and Chinese use the phone's own font
// with `fontWeight`.
//
// Sizes are in dp. Nothing is set below 14. Sentence case everywhere: never
// upper-case or letter-space text that can be Devanagari.

export type FontWeight = '400' | '500' | '600' | '700';
export type FigureWeight = '500' | '600';
export type FontRole = 'text' | 'devanagari' | 'figures';

type FontTable = {
  text: Record<FontWeight, string | undefined>;
  devanagari: Record<FontWeight, string | undefined>;
  figures: Record<FigureWeight, string | undefined>;
};

// The names the font files are registered under with expo-font (tokens.json,
// type.families).
export const FONT_FILES = {
  text: {
    '400': 'AnekLatin_400Regular',
    '500': 'AnekLatin_500Medium',
    '600': 'AnekLatin_600SemiBold',
    '700': 'AnekLatin_700Bold',
  },
  devanagari: {
    '400': 'AnekDevanagari_400Regular',
    '500': 'AnekDevanagari_500Medium',
    '600': 'AnekDevanagari_600SemiBold',
    '700': 'AnekDevanagari_700Bold',
  },
  figures: {
    '500': 'Outfit_500Medium',
    '600': 'Outfit_600SemiBold',
  },
} as const satisfies FontTable;

// The one switch for the brand fonts on a phone. It is on: fonts.ts loads the
// ten files and the root layout holds the start screen for them. If it is
// ever turned off, every entry of FONT is undefined on a phone and the
// phone's own font shows, so every layout must hold with that too. Turn it
// off only together with the loading in fonts.ts.
const PHONE_FONTS_BUNDLED = true as boolean;

const SYSTEM_FONT: FontTable = {
  text: { '400': undefined, '500': undefined, '600': undefined, '700': undefined },
  devanagari: { '400': undefined, '500': undefined, '600': undefined, '700': undefined },
  figures: { '500': undefined, '600': undefined },
};

// In the browser preview the families are real: fonts.web.ts loads them from
// one stylesheet. One CSS family holds every weight, and the browser falls
// back along the list letter by letter ("System" becomes the system list).
const WEB_TEXT = '"Anek Latin", "Anek Devanagari", System';
const WEB_DEVANAGARI = '"Anek Devanagari", "Anek Latin", System';
const WEB_FIGURES = 'Outfit, "Anek Latin", System';

const WEB_FONT: FontTable = {
  text: { '400': WEB_TEXT, '500': WEB_TEXT, '600': WEB_TEXT, '700': WEB_TEXT },
  devanagari: { '400': WEB_DEVANAGARI, '500': WEB_DEVANAGARI, '600': WEB_DEVANAGARI, '700': WEB_DEVANAGARI },
  figures: { '500': WEB_FIGURES, '600': WEB_FIGURES },
};

function fontTable(): FontTable {
  if (Platform.OS === 'web') return WEB_FONT;
  return PHONE_FONTS_BUNDLED ? FONT_FILES : SYSTEM_FONT;
}

// The font family for each role and weight, or undefined for "the phone's own
// font at this weight". This table is the single place fonts are switched on.
export const FONT: FontTable = fontTable();

export type FontStyle = Pick<TextStyle, 'fontFamily' | 'fontWeight'>;

// The style that picks a family and weight. The only correct way to set a
// font: on a phone a bundled font is chosen by name alone (adding fontWeight
// makes Android fake a bolder cut), the phone's own font is chosen by weight,
// and in the browser one family needs both.
export function fontStyle(role: 'text' | 'devanagari', weight: FontWeight): FontStyle;
export function fontStyle(role: 'figures', weight: FigureWeight): FontStyle;
export function fontStyle(role: FontRole, weight: FontWeight | FigureWeight): FontStyle {
  const families = FONT[role] as Partial<Record<FontWeight | FigureWeight, string | undefined>>;
  const family = families[weight];
  if (family === undefined) return { fontWeight: weight };
  if (Platform.OS === 'web') return { fontFamily: family, fontWeight: weight };
  return { fontFamily: family };
}

// --- Which script a string is in -------------------------------------------

// A character class from pairs of code points, so no escaped or right-to-left
// characters sit in this file.
function scriptPattern(...ranges: [from: number, to: number][]): RegExp {
  const body = ranges.map(([from, to]) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`).join('');
  return new RegExp(`[${body}]`);
}

const DEVANAGARI = scriptPattern([0x0900, 0x097f]);

// Scripts that need a taller line and that the brand fonts do not cover.
const TALL_SCRIPT = scriptPattern(
  [0x0590, 0x05ff], // Hebrew
  [0x3040, 0x30ff], // Japanese hiragana and katakana
  [0x3400, 0x4dbf], // Chinese and Japanese characters, extension A
  [0x4e00, 0x9fff], // Chinese and Japanese characters
  [0xf900, 0xfaff], // compatibility forms of the same
  [0xff66, 0xff9f], // half-width katakana
);

export function hasDevanagari(text: string): boolean {
  return DEVANAGARI.test(text);
}

// The font for a piece of running text. React Native has no fallback between
// bundled fonts, so the family is picked per string: Devanagari if the string
// holds any Devanagari letter, the phone's own font for Hebrew, Japanese and
// Chinese, the Latin text face for everything else. Pass `text` whenever the
// string is known; without it the app language decides.
export function textFont(weight: FontWeight, language: Language, text?: string): FontStyle {
  if (text !== undefined) {
    if (DEVANAGARI.test(text)) return fontStyle('devanagari', weight);
    if (TALL_SCRIPT.test(text)) return { fontWeight: weight };
    return fontStyle('text', weight);
  }
  if (language === 'hi') return fontStyle('devanagari', weight);
  if (language === 'he' || language === 'ja' || language === 'zh') return { fontWeight: weight };
  return fontStyle('text', weight);
}

// The font for digits: Outfit 600 with figures of equal width that sit on the
// line. 500 only for small figures in tables. Digits only: the currency sign
// and the unit are set in the text face (see numeralUnit).
export function figureFont(weight: FigureWeight = '600'): Pick<TextStyle, 'fontFamily' | 'fontWeight' | 'fontVariant'> {
  return { ...fontStyle('figures', weight), fontVariant: ['tabular-nums', 'lining-nums'] };
}

// --- The scale ---------------------------------------------------------------

export type TypeVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'small';

type TypeStep = { size: number; line: number; lineDeva: number; weight: FontWeight };

// The Devanagari lines are the locked ones (tokens.json, type.scale, after
// the brand review): never under 1.6 times the size. Anek Devanagari is a
// tall font (its own line is 1.7 times the size, and its top marks reach
// 0.96 of the size above the baseline), so on a shorter line the phone cuts
// the top of the letters.
export const typeScale = {
  // The opening line of a screen with no other content: welcome, empty states.
  display: { size: 32, line: 38, lineDeva: 52, weight: '700' },
  // Screen titles.
  title: { size: 26, line: 32, lineDeva: 42, weight: '700' },
  // Card titles, section headings, the headline finding.
  heading: { size: 20, line: 26, lineDeva: 32, weight: '600' },
  // Running text. 500 or 600 for emphasis inside a sentence.
  body: { size: 17, line: 25, lineDeva: 28, weight: '400' },
  // Buttons, chips, row titles, field text.
  label: { size: 16, line: 22, lineDeva: 26, weight: '600' },
  // Captions, meta, tab labels (500, and 600 when chosen).
  small: { size: 14, line: 20, lineDeva: 23, weight: '400' },
} as const satisfies Record<TypeVariant, TypeStep>;

// Nothing is set below this.
export const MIN_FONT_SIZE = 14;

// Text follows the phone's text size up to this many times. Layouts grow with
// it: no fixed heights around text.
export const MAX_FONT_SCALE = 1.6;
// Tab bar labels stop earlier so four of them still fit.
export const TAB_LABEL_MAX_FONT_SCALE = 1.3;

// Japanese and Chinese need a line of at least this many times the size,
// rounded up. Hebrew takes the same so its points are never cut.
const TALL_SCRIPT_LINE = 1.5;

// The line height for a variant. It follows what the text can be, not the
// font: the Devanagari line when the app is in Hindi or the string holds
// Devanagari, at least 1.5 times the size for Hebrew, Japanese and Chinese,
// the Latin line otherwise. Pass `text` whenever the string is known, so a
// Hindi file name inside an English screen is not clipped.
export function lineHeightFor(variant: TypeVariant, language: Language, text?: string): number {
  const step = typeScale[variant];
  let line: number = step.line;
  if (language === 'hi' || (text !== undefined && DEVANAGARI.test(text))) {
    line = Math.max(line, step.lineDeva);
  }
  if (language === 'he' || language === 'ja' || language === 'zh' || (text !== undefined && TALL_SCRIPT.test(text))) {
    line = Math.max(line, Math.ceil(step.size * TALL_SCRIPT_LINE));
  }
  return line;
}

// Letter spacing is 0, except display and title in Latin at minus 1 percent of
// the size. Only a string known to hold no Devanagari, Hebrew, Japanese or
// Chinese is tightened; anything else, or anything unknown, stays at 0.
const TIGHT = -0.01;

export function letterSpacingFor(variant: TypeVariant, text?: string): number {
  if (variant !== 'display' && variant !== 'title') return 0;
  if (text === undefined || DEVANAGARI.test(text) || TALL_SCRIPT.test(text)) return 0;
  return typeScale[variant].size * TIGHT;
}

// Answer text is body on a taller line so the bands under checked numbers on
// neighbouring lines never touch. This is the only place body text takes a
// taller line (brand spec, section 11).
export const ANSWER_LINE = { latin: 28, devanagari: 30 } as const;

// --- Numerals ----------------------------------------------------------------

// Big numbers, set in the figures face. A numeral that no longer fits its
// space steps down the ladder (hero, large, medium); it is never squeezed or
// cut. `inline` sits inside a sentence and takes the line of the text round
// it.
export const numeralSize = { hero: 56, large: 40, medium: 28, inline: 17 } as const;
export const numeralLine = { hero: 60, large: 44, medium: 32 } as const;
export type NumeralSize = keyof typeof numeralSize;

// The currency sign and the unit beside a numeral are always in the text
// face, never in the figures face (it has no rupee sign): weight 500, soft
// ink, half the size of the digits and never under 14, on the same baseline,
// 0.14 of the digit size away. Inside a sentence the unit is the size of the
// sentence and weight 600.
export const numeralUnit = {
  scale: 0.5,
  minSize: MIN_FONT_SIZE,
  gap: 0.14,
  weight: '500',
  inlineWeight: '600',
} as const satisfies { scale: number; minSize: number; gap: number; weight: FontWeight; inlineWeight: FontWeight };
