import type { Stack } from 'expo-router/stack';
import type { ComponentProps } from 'react';

import { useTheme } from '@/hooks/use-theme';

type ScreenOptions = Exclude<NonNullable<ComponentProps<typeof Stack.Screen>['options']>, (...args: never[]) => unknown>;

// Shared header style for the stack inside each tab: a large title on iOS,
// a plain title bar on Android, both on the LUMIQ background colour.
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
    headerTintColor: colors.primary,
    contentStyle: { backgroundColor: colors.background },
  };
}
