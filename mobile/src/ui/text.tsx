import { createContext, useContext, type ReactNode } from 'react';
import { Platform, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useAppState } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  letterSpacingFor,
  lineHeightFor,
  textFont,
  typeScale,
  useTheme,
  type FontWeight,
  type Palette,
  type TypeVariant,
} from '@/theme';

export type TxtVariant = TypeVariant;
export type TxtTone = 'ink' | 'soft' | 'faint' | 'action' | 'good' | 'warn' | 'bad' | 'onAction' | 'inherit';
export type TxtAlign = 'start' | 'center' | 'end';

export type TxtProps = Omit<TextProps, 'style' | 'children'> & {
  // The step of the type scale. Default body; inside another Txt, the step of
  // that Txt.
  variant?: TxtVariant;
  // The ink. Default ink; inside another Txt, inherit. `action` is the blue as
  // text (actionText), `onAction` is text on a filled button.
  tone?: TxtTone;
  // A palette colour for a role the tones do not cover (onActionSoft,
  // disabledInk, onLight). Wins over tone.
  color?: string;
  // 500 or 600 for emphasis inside a sentence. Default: the weight of the
  // variant.
  weight?: FontWeight;
  // Follows the reading direction: start is the right-hand side in Hebrew.
  // Centred text must be given its width by its parent (stretch it, or flex
  // it); never let it shrink to its words.
  align?: TxtAlign;
  // For a label that sizes itself to its own words (inside a button, a chip, a
  // tag, a tab, a count beside a title). Android measures Hindi narrower than
  // it draws it, so such a label can lose its last word; this adds one
  // trailing space there so the measured width covers the letters.
  snug?: boolean;
  // Layout only (flex, alignSelf, a margin). Merged last.
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
};

const TONE: Record<Exclude<TxtTone, 'inherit'>, keyof Palette> = {
  ink: 'ink',
  soft: 'inkSoft',
  faint: 'inkFaint',
  action: 'actionText',
  good: 'good',
  warn: 'warn',
  bad: 'bad',
  onAction: 'onAction',
};

// What a Txt tells the Txt inside it: its step of the scale and its weight.
type Outer = { variant: TxtVariant; weight: FontWeight };
const OuterTxt = createContext<Outer | null>(null);

// The words, when the children are nothing but words: a string, a number, or
// a list of them. Anything else (another Txt, an icon) gives undefined.
function plainText(children: ReactNode): string | undefined {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!Array.isArray(children)) return undefined;
  let text = '';
  for (const child of children as readonly unknown[]) {
    if (typeof child === 'string') text += child;
    else if (typeof child === 'number') text += String(child);
    else if (child !== null && child !== undefined && typeof child !== 'boolean') return undefined;
  }
  return text;
}

// Text in the LUMIQ type scale:
//   <Txt variant="title">{t('home.title')}</Txt>
//   <Txt tone="soft" numberOfLines={2}>{fileName}</Txt>
//   <Txt>Total is <Txt weight="600">4.68 M</Txt> this year.</Txt>
//
// It picks the font by what the string holds (Devanagari, Latin, or the
// phone's own font for Hebrew, Japanese and Chinese) and the line height by
// what the text can be: taller for Hindi, Hebrew, Japanese and Chinese, so no
// letter is cut above or below. It follows the phone's text size up to 1.6
// times. It never upper-cases, and it only tightens a Latin display or title
// line.
//
// A Txt inside a Txt is a run of the same sentence: it keeps the outer size,
// line and colour unless told otherwise.
//
// Needs AppStateProvider above it (it reads the app language).
export function Txt({
  variant,
  tone,
  color,
  weight,
  align,
  snug = false,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  style,
  children,
  ...rest
}: TxtProps) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const outer = useContext(OuterTxt);

  const nested = outer !== null;
  const kind = variant ?? outer?.variant ?? 'body';
  const step = typeScale[kind];
  const heavy = weight ?? (variant === undefined && outer !== null ? outer.weight : step.weight);
  const text = plainText(children);

  const chosenTone = tone ?? (nested ? 'inherit' : 'ink');
  const ink = color ?? (chosenTone === 'inherit' ? undefined : colors[TONE[chosenTone]]);

  // A run inside a sentence only changes what it was asked to change; a Txt
  // by itself, or one given its own variant, sets the whole line. A run still
  // raises the line when its own words need more room than the sentence's
  // language gave it (a Hindi name inside an English sentence).
  const setsLine = !nested || variant !== undefined;
  const line = lineHeightFor(kind, language, text);
  const raisesLine = line > lineHeightFor(kind, language);
  const base: TextStyle = {
    ...textFont(heavy, language, text),
    color: ink,
    fontSize: setsLine ? step.size : undefined,
    lineHeight: setsLine || raisesLine ? line : undefined,
    letterSpacing: setsLine ? letterSpacingFor(kind, text) : undefined,
    textAlign: nested ? undefined : (align ?? 'start'),
  };

  // Plain words cannot hold another Txt, so they need no context around them.
  const content =
    text === undefined ? (
      <OuterTxt.Provider value={{ variant: kind, weight: heavy }}>{children}</OuterTxt.Provider>
    ) : snug && !nested && Platform.OS === 'android' ? (
      `${text} `
    ) : (
      children
    );

  return (
    <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={[base, style]}>
      {content}
    </Text>
  );
}
