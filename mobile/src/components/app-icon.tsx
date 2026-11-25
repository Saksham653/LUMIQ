import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof SymbolView>['name'];

// A system icon: an SF Symbol on iOS and a Material Symbol on Android, e.g.
// <AppIcon name={{ ios: 'lock.fill', android: 'lock' }} color={...} />.
// The browser preview draws the Android symbol, so both look the same.
export function AppIcon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  const resolved = typeof name === 'object' ? { ...name, web: name.web ?? name.android } : name;
  return <SymbolView name={resolved} size={size} tintColor={color} />;
}
