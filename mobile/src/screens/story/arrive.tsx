import { useEffect, type ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { duration, fade, rise, spring, useReducedMotion } from '@/theme';

// How a story card arrives (brand spec, section 7): it fades in and rises 12
// on the settle spring. Transform and opacity only. With reduced motion it
// only fades: nothing moves.
//
// It plays once, when it is put on screen. The story gives each card its own
// key, so every card arrives; it starts unseen, so a new card never flashes
// at full strength first.
export function Arrive({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0);
  const offset = useSharedValue(reduced ? 0 : rise);

  useEffect(() => {
    opacity.set(withTiming(1, fade(duration.exit)));
    offset.set(withSpring(0, spring('settle', reduced)));
  }, [opacity, offset, reduced]);

  const entrance = useAnimatedStyle<ViewStyle>(() => {
    return { opacity: opacity.get(), transform: [{ translateY: offset.get() }] };
  });

  return <Animated.View style={entrance}>{children}</Animated.View>;
}
