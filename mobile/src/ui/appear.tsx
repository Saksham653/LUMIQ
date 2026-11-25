import { useEffect, useRef, type ReactNode } from 'react';
import { type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { cascadeMax, fade, rise, spring, stagger, useReducedMotion } from '@/theme';

// The fade is done before the rise is: the row is in full ink for the last
// few points of its travel, so it never settles while still see-through. The
// board's own number for rows arriving (brand spec, section 7).
const FADE_LEAD = 1.6;

// What cannot be seen yet takes no touch.
const HELD: ViewStyle = { pointerEvents: 'none' };

export type AppearProps = Omit<ViewProps, 'style' | 'children'> & {
  // The row's place in the cascade: 0 arrives first, each next one a beat
  // (50 ms) later. From the sixth beat on, rows arrive together.
  index?: number;
  // Holds the entrance back: the content stays unseen, and arrives once this
  // turns false. For rows that are on screen under something else (Home under
  // the launch moment): the cascade starts when the cover has gone.
  wait?: boolean;
  // Layout only (flex, alignSelf, a width). Appear owns the opacity and the
  // transform of its own view: put yours on a view inside.
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// The entrance of a row, a tile or a card (brand spec, section 7): it fades in
// and rises 12 on the settle spring.
//   {rows.map((row, index) => (
//     <Appear key={row.id} index={index}><Row {...row} /></Appear>
//   ))}
//
// It plays once for each time it is put on screen, never again on a later
// render and never on scroll: do not use it for the rows of a recycling list.
// With reduced motion nothing moves and nothing waits for its beat: every row
// is in its place and fades in together.
//
// A shared value drives it, not an `entering` layout animation, for three
// reasons: the browser preview cannot play a spring through `entering` (it
// would rise 25 on a fixed curve), an entrance must be able to wait, and with
// reduced motion `entering` skips the fade as well.
export function Appear({ index = 0, wait = false, style, children, ...rest }: AppearProps) {
  const reduced = useReducedMotion();
  // 0 before it arrives, 1 in place.
  const arrived = useSharedValue(0);
  const played = useRef(false);

  // At most `cascadeMax` beats: later rows arrive with the last one.
  const place = Number.isFinite(index) ? Math.floor(index) : 0;
  const beat = Math.min(Math.max(place, 0), cascadeMax - 1);

  useEffect(() => {
    if (wait || played.current) return;
    played.current = true;
    arrived.set(reduced ? withTiming(1, fade()) : withDelay(beat * stagger, withSpring(1, spring('settle'))));
  }, [wait, reduced, beat, arrived]);

  const entrance = useAnimatedStyle<ViewStyle>(() => {
    const progress = arrived.get();
    if (reduced) return { opacity: Math.min(Math.max(progress, 0), 1) };
    return {
      opacity: Math.min(Math.max(progress * FADE_LEAD, 0), 1),
      transform: [{ translateY: (1 - progress) * rise }],
    };
  });

  return (
    <Animated.View
      {...rest}
      // What cannot be seen yet is not read out either.
      aria-hidden={wait ? true : rest['aria-hidden']}
      style={[style, wait ? HELD : null, entrance]}>
      {children}
    </Animated.View>
  );
}
