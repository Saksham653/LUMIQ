import type { Stack } from 'expo-router/stack';
import type { ComponentProps } from 'react';

import { useTheme } from '@/hooks/use-theme';

type ScreenOptions = Exclude<NonNullable<ComponentProps<typeof Stack.Screen>['options']>, (...args: never[]) => unknown>;

// Shared header style for the stack inside each tab: a large title on iOS,
// a plain title bar on Android, both on the LUMIQ paper colour. The title's
// font comes from the navigation theme in the root layout, so every stack
// has the same one. The back arrow and header buttons are the blue as text,
// which stays readable in dark.
export function useStackOptions(): ScreenOptions {
  const colors = useTheme();
  return {
    headerLargeTitleEnabled: true,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerStyle: { backgroundColor: colors.background },
    headerLargeStyle: { backgroundColor: colors.background },
    headerTitleStyle: { color: colors.text },
    headerLargeTitleStyle: { color: colors.text },
    headerTintColor: colors.primaryText,
    contentStyle: { backgroundColor: colors.background },
  };
}
