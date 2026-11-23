import { useColorScheme } from 'react-native';

import { Colors, type Palette } from '@/constants/theme';

// The LUMIQ palette for the phone's light or dark mode.
export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}
