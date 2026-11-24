import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

// Simple line illustrations for empty and first-run states, drawn in the
// theme's quiet greys with one brand accent, so they follow light and dark.

// A spreadsheet page with a small lock: "your file stays on your phone".
export function FileLockIllustration({ size = 72 }: { size?: number }) {
  const colors = useTheme();
  const line = colors.textTertiary;
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x="14" y="8" width="38" height="50" rx="6" fill={colors.surfaceVariant} stroke={line} strokeWidth="2" />
      <Line x1="14" y1="22" x2="52" y2="22" stroke={line} strokeWidth="2" />
      <Line x1="14" y1="34" x2="52" y2="34" stroke={line} strokeWidth="1.5" opacity="0.7" />
      <Line x1="14" y1="46" x2="52" y2="46" stroke={line} strokeWidth="1.5" opacity="0.7" />
      <Line x1="28" y1="22" x2="28" y2="58" stroke={line} strokeWidth="1.5" opacity="0.7" />
      <Circle cx="50" cy="50" r="13" fill={colors.card} />
      <Rect x="43" y="48" width="14" height="11" rx="3" fill={colors.primary} />
      <Path d="M46 48v-3a4 4 0 0 1 8 0v3" stroke={colors.primary} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// A magnifying glass over a page: "pick a file first".
export function FindFileIllustration({ size = 72 }: { size?: number }) {
  const colors = useTheme();
  const line = colors.textTertiary;
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x="12" y="8" width="36" height="48" rx="6" fill={colors.surfaceVariant} stroke={line} strokeWidth="2" />
      <Line x1="20" y1="20" x2="40" y2="20" stroke={line} strokeWidth="2" strokeLinecap="round" />
      <Line x1="20" y1="29" x2="36" y2="29" stroke={line} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <Line x1="20" y1="38" x2="32" y2="38" stroke={line} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <Circle cx="46" cy="44" r="11" fill={colors.card} stroke={colors.primary} strokeWidth="3" />
      <Line x1="54" y1="52" x2="62" y2="60" stroke={colors.primary} strokeWidth="3.5" strokeLinecap="round" />
    </Svg>
  );
}
