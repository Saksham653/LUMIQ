import { Colors, type Palette } from '@/constants/theme';
import { useTheme as useRoshniTheme } from '@/theme';

// The OLD flat palette, for screens that have not been rebuilt yet. Its
// values come from the new theme, for the scheme the new theme is showing, so
// the Light or Dark choice made inside the app reaches every screen. New code
// uses useTheme from '@/theme' instead.
export function useTheme(): Palette {
  return Colors[useRoshniTheme().scheme];
}
