// The LUMIQ component library, one entry point:
//   import { Press, Txt, Icon, VStack, HStack, haptics, useUIStrings } from '@/ui';
//
// Only what exists is exported. Each component group adds its own line below
// when its files land, keeping the list in the order of the contract
// (brand/ui-contract.md); the gallery builder completes it. Inside src/ui,
// import a component from its own file ('@/ui/press'), not from this barrel,
// so two components never import each other in a circle.

// Foundation.
export * from './press';
export * from './text';
export * from './icon';
export * from './icon-set';
export * from './stack';
export * from './strings';
// The four haptic signals, as one name: haptics.select(), haptics.tap(),
// haptics.success(), haptics.error(), haptics.setHapticsEnabled().
export * as haptics from './haptics';
