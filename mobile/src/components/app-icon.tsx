import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof SymbolView>['name'];

// A system icon: an SF Symbol on iOS and a Material Symbol on Android, e.g.
// <AppIcon name={{ ios: 'lock.fill', android: 'lock' }} color={...} />.
export function AppIcon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}
