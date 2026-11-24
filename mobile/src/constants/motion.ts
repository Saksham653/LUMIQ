import { cubicBezier, Easing, ReduceMotion } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

// The Motion curves in the two forms Reanimated takes: cubicBezier(...) for
// CSS transitions and keyframe animations, Easing.bezier(...) for withTiming.
export const CSS_EASE_OUT = cubicBezier(...Motion.easeOut);
export const CSS_EASE_IN_OUT = cubicBezier(...Motion.easeInOut);
export const EASE_OUT = Easing.bezier(...Motion.easeOut);
export const EASE_IN_OUT = Easing.bezier(...Motion.easeInOut);

// withTiming config that follows the phone's reduce-motion setting.
export const timing = (duration: number, easing = EASE_OUT) => ({ duration, easing, reduceMotion: ReduceMotion.System });
