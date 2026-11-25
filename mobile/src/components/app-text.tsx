import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppState } from '@/state/app-state';
import { lineHeightFor, textFont, typeScale, type FontWeight } from '@/theme';

type Variant = keyof typeof FontSize;
type Tone = 'default' | 'secondary' | 'tertiary' | 'primary' | 'accent' | 'success';

// The words, when the children are nothing but words: a string, a number, or
// a list of them. Anything else (another text, an icon) gives undefined.
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

// The brand fonts come in four weights, each its own file. A weight asked for
// in a style ('700', 'bold', 800) is answered with the nearest of them.
function brandWeight(asked: TextStyle['fontWeight'], fallback: FontWeight): FontWeight {
  if (asked === undefined) return fallback;
  if (asked === 'bold') return '700';
  if (asked === 'normal') return '400';
  const value = Number(asked);
  if (!Number.isFinite(value)) return fallback;
  if (value >= 650) return '700';
  if (value >= 550) return '600';
  if (value >= 450) return '500';
  return '400';
}

// Text in the LUMIQ type scale, set in the brand faces. The font is picked by
// what the string holds, the way Txt in '@/ui' does it: Anek Devanagari for a
// string with Devanagari in it (or any text while the app is in Hindi and the
// words are not known), the phone's own font for Hebrew, Japanese and
// Chinese, Anek Latin for everything else. The line height follows the
// script too: taller for Hindi, Hebrew, Japanese and Chinese, so no letter is
// clipped above or below. Phone font-size settings are respected, capped at
// 1.6× so screens stay usable.
// A `fontWeight` in `style` still works: it picks the font file of that
// weight (a bundled font must never be given a weight of its own, or Android
// fakes a bolder cut).
// Centred text should stretch to its container (alignSelf: 'stretch') rather
// than shrink to its measured width: Android measures Hindi narrower than it
// draws it, so a shrink-wrapped heading can lose its last word.
// `snug` is for labels that must size themselves to their text (a badge, a
// count beside a title): on Android it adds a trailing no-break space, so the
// measured width covers the drawn letters.
export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  snug,
  children,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone; snug?: boolean }) {
  const colors = useTheme();
  const { language } = useAppState();
  const color = {
    default: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    // The blue as text, not the fill blue: in dark the fill is too dim to read.
    primary: colors.primaryText,
    accent: colors.accent,
    success: colors.success,
  }[tone];
  const fontSize = FontSize[variant];
  const step = typeScale[variant];
  const text = plainText(children);
  // The sizes here are the old ones, a little off the new scale, so the new
  // scale's line for this script is taken in proportion and rounded up.
  const lineHeight = Math.ceil((lineHeightFor(variant, language, text) * fontSize) / step.size);

  // Read only to see whether the caller asked for a weight or a family.
  const asked = StyleSheet.flatten(style) as unknown as TextStyle | null | undefined;
  const weight = brandWeight(asked?.fontWeight, step.weight);
  // A style that names its own family (monospace) keeps it, with its weight.
  // Otherwise the brand face goes last, so it wins over a weight in `style`:
  // on a phone it is a family alone, and the weight is cleared.
  const picked = asked?.fontFamily === undefined ? textFont(weight, language, text) : null;
  const font: TextStyle | null = picked ? { fontFamily: picked.fontFamily, fontWeight: picked.fontWeight } : null;

  const padded = snug && Platform.OS === 'android' && typeof children === 'string' ? `${children} ` : children;
  return (
    <Text maxFontSizeMultiplier={1.6} {...rest} style={[{ color, fontSize, fontWeight: weight, lineHeight }, style, font]}>
      {padded}
    </Text>
  );
}
