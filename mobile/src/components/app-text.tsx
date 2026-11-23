import { Text, type TextProps } from 'react-native';

import { FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = keyof typeof FontSize;
type Tone = 'default' | 'secondary' | 'primary' | 'accent' | 'success';

const WEIGHT: Record<Variant, '400' | '600' | '700' | '800'> = {
  display: '800',
  title: '800',
  heading: '700',
  body: '400',
  label: '600',
  small: '400',
};

// Text in the LUMIQ type scale. Line height is generous (1.45x) because Hindi
// letters need room above and below the line. Phone font-size settings are
// respected, capped at 1.6x so screens stay usable.
// Centred text should stretch to its container (alignSelf: 'stretch') rather
// than shrink to its measured width: Android measures bold Hindi narrower than
// it draws it, so a shrink-wrapped heading can lose its last word.
export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const colors = useTheme();
  const color = {
    default: colors.text,
    secondary: colors.textSecondary,
    primary: colors.primary,
    accent: colors.accent,
    success: colors.success,
  }[tone];
  const fontSize = FontSize[variant];
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[{ color, fontSize, fontWeight: WEIGHT[variant], lineHeight: Math.round(fontSize * 1.45) }, style]}
    />
  );
}
