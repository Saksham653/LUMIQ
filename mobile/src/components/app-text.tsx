import { Platform, Text, type TextProps } from 'react-native';

import { FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lineHeightFactor } from '@/i18n';
import { useAppState } from '@/state/app-state';

type Variant = keyof typeof FontSize;
type Tone = 'default' | 'secondary' | 'tertiary' | 'primary' | 'accent' | 'success';

const WEIGHT: Record<Variant, '400' | '600' | '700' | '800'> = {
  display: '800',
  title: '800',
  heading: '700',
  body: '400',
  label: '600',
  small: '400',
};

// Text in the LUMIQ type scale. Line height follows the script: Devanagari
// and Hebrew get 1.5×, Japanese and Chinese 1.6×, Latin 1.45×, so no letter
// is clipped above or below. Phone font-size settings are respected, capped
// at 1.6× so screens stay usable.
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
    primary: colors.primary,
    accent: colors.accent,
    success: colors.success,
  }[tone];
  const fontSize = FontSize[variant];
  const padded = snug && Platform.OS === 'android' && typeof children === 'string' ? `${children} ` : children;
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        { color, fontSize, fontWeight: WEIGHT[variant], lineHeight: Math.round(fontSize * lineHeightFactor(language)) },
        style,
      ]}>
      {padded}
    </Text>
  );
}
