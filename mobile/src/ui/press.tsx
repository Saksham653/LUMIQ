import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import {
  border,
  duration,
  fade,
  pressScale,
  sizes,
  spring,
  timing,
  useReducedMotion,
  useTheme,
  type PressWeight,
} from '@/theme';
import { select, tap } from '@/ui/haptics';

export type { PressWeight };
// scale: the thing shrinks a little under the finger (buttons, chips, cards).
// highlight: a full-width row tints with surfacePressed and does not scale (a
//   scaling row reads as the whole screen squeezing).
// none: no feedback from Press; the component draws its own.
export type PressFeedback = 'scale' | 'highlight' | 'none';
export type PressHaptic = 'none' | 'tap' | 'select';
export type PressState = { pressed: boolean };

// Everything Pressable takes passes through (onPress, onLongPress, disabled,
// hitSlop, pressRetentionOffset, the accessibility props, testID), except the
// Android ripple: the same feedback is drawn on every platform.
export type PressProps = Omit<PressableProps, 'style' | 'children' | 'android_ripple' | 'testOnly_pressed'> & {
  // How much it shrinks: sm for icon buttons and chips, md for buttons, lg
  // for cards and rows. Large surfaces move less.
  weight?: PressWeight;
  feedback?: PressFeedback;
  // Fired once, at contact: tap for the main button of a screen, select for a
  // choice that changes.
  haptic?: PressHaptic;
  // Layout and look of the pressable surface. Press owns its transform and
  // opacity: put your own on a view inside.
  style?: StyleProp<ViewStyle>;
  children?: ReactNode | ((state: PressState) => ReactNode);
};

// With reduced motion the scale is dropped and the surface dims by this much
// while it is held instead. Local to Press: nothing else in the app dims this
// way, so it is not a token.
const HELD_OPACITY = 0.72;

const NO_REACH = { x: 0, y: 0 };

type AnimatedViewStyle = StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;

// Pressable with a style that can hold an animated style. The cast only
// swaps the type of `style`; every other prop is Pressable's own.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable) as unknown as ComponentType<
  Omit<PressableProps, 'style'> & { style?: AnimatedViewStyle }
>;

// The corners of the pressable, so the highlight inside it has the same ones.
const CORNER_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'borderCurve',
] as const;
type Corners = Partial<Record<(typeof CORNER_KEYS)[number], unknown>>;

function collectCorners(style: StyleProp<ViewStyle>, into: Corners): void {
  if (!style) return;
  if (Array.isArray(style)) {
    for (const item of style) collectCorners(item as StyleProp<ViewStyle>, into);
    return;
  }
  const flat = style as ViewStyle;
  for (const key of CORNER_KEYS) {
    const value = flat[key];
    if (value !== undefined) into[key] = value;
  }
}

type Slop = PressableProps['hitSlop'];
type Sides = { top?: number; bottom?: number; left?: number; right?: number };

// The caller's hitSlop, grown so the target is never under 48 by 48.
function reachOf(slop: Slop, reach: { x: number; y: number }): Slop {
  const own: Sides = typeof slop === 'number' ? { top: slop, bottom: slop, left: slop, right: slop } : (slop ?? {});
  const top = Math.max(own.top ?? 0, reach.y);
  const bottom = Math.max(own.bottom ?? 0, reach.y);
  const left = Math.max(own.left ?? 0, reach.x);
  const right = Math.max(own.right ?? 0, reach.x);
  return top === 0 && bottom === 0 && left === 0 && right === 0 ? undefined : { top, bottom, left, right };
}

// A focus that came from a keyboard, not from a finger or a mouse. On a phone
// only a keyboard or a switch can focus a view; in the browser a click
// focuses too, so the browser is asked.
function isKeyboardFocus(event: unknown): boolean {
  if (Platform.OS !== 'web') return true;
  const target = (event as { nativeEvent?: { target?: { matches?: (selector: string) => boolean } } }).nativeEvent?.target;
  try {
    return target?.matches?.(':focus-visible') ?? true;
  } catch {
    return true;
  }
}

// The one press primitive. Everything that can be tapped is built on it,
// never on a bare Pressable or Touchable:
//   <Press onPress={open} accessibilityLabel={label} style={styles.button}>
//     <Txt variant="label" tone="onAction" snug>{label}</Txt>
//   </Press>
//
// Feedback starts at contact and the action fires on release. Finger down is
// an 80 ms move to the press scale; release is the press spring. Both run on
// the UI thread. With reduced motion nothing scales: the surface dims while
// held. A disabled Press does not move, and says so to a screen reader.
//
// It is a button to a screen reader unless told otherwise, it keeps a target
// of at least 48 by 48 however small it is drawn, and it shows the focus ring
// when a keyboard lands on it.
export function Press({
  weight = 'md',
  feedback = 'scale',
  haptic = 'none',
  disabled = false,
  hitSlop,
  accessibilityRole,
  onPressIn,
  onPressOut,
  onLayout,
  onFocus,
  onBlur,
  style,
  children,
  ...rest
}: PressProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  // 0 at rest, 1 under a finger.
  const held = useSharedValue(0);
  // How far the 48 by 48 target reaches past the drawing, each way.
  const [reach, setReach] = useState(NO_REACH);
  const [focused, setFocused] = useState(false);

  const moves = feedback === 'scale' && !reduced;
  const dims = feedback === 'scale' && reduced;
  const tints = feedback === 'highlight';
  const smallest = pressScale[weight];

  const surface = useAnimatedStyle<ViewStyle>(() => {
    const progress = held.get();
    if (moves) return { transform: [{ scale: 1 + (smallest - 1) * progress }] };
    if (dims) return { opacity: 1 + (HELD_OPACITY - 1) * Math.min(Math.max(progress, 0), 1) };
    return {};
  });
  const tint = useAnimatedStyle<ViewStyle>(() => {
    return { opacity: tints ? Math.min(Math.max(held.get(), 0), 1) : 0 };
  });

  useEffect(() => {
    // A control that is switched off while a finger is on it lets go.
    if (disabled) held.set(0);
  }, [disabled, held]);

  const pressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    if (haptic === 'tap') tap();
    else if (haptic === 'select') select();
    if (feedback !== 'none') {
      held.set(withTiming(1, moves ? timing(duration.pressIn) : fade(duration.pressIn)));
    }
    onPressIn?.(event);
  };

  const pressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    if (feedback !== 'none') {
      held.set(moves ? withSpring(0, spring('press')) : withTiming(0, fade()));
    }
    onPressOut?.(event);
  };

  const layout: NonNullable<PressableProps['onLayout']> = (event) => {
    const { width, height } = event.nativeEvent.layout;
    const x = Math.max(0, Math.ceil((sizes.target - width) / 2));
    const y = Math.max(0, Math.ceil((sizes.target - height) / 2));
    setReach((now) => (now.x === x && now.y === y ? now : { x, y }));
    onLayout?.(event);
  };

  const focus: NonNullable<PressableProps['onFocus']> = (event) => {
    if (isKeyboardFocus(event)) setFocused(true);
    onFocus?.(event);
  };

  const blur: NonNullable<PressableProps['onBlur']> = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  // The keyboard focus ring: 3 wide, 3 away from the control.
  const ring: ViewStyle | null =
    focused && !disabled
      ? {
          outlineColor: colors.focusRing,
          outlineStyle: 'solid',
          outlineWidth: border.focus,
          outlineOffset: border.focus,
        }
      : null;

  let highlight: ReactNode = null;
  if (tints) {
    const corners: Corners = {};
    collectCorners(style, corners);
    highlight = (
      <Animated.View style={[styles.highlight, corners as ViewStyle, { backgroundColor: colors.surfacePressed }, tint]} />
    );
  }

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      hitSlop={reachOf(hitSlop, reach)}
      accessibilityRole={accessibilityRole ?? (rest.role === undefined ? 'button' : undefined)}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onLayout={layout}
      onFocus={focus}
      onBlur={blur}
      style={[style, ring, surface]}>
      {typeof children === 'function' ? (
        (state: PressState) => (
          <>
            {highlight}
            {children(state)}
          </>
        )
      ) : (
        <>
          {highlight}
          {children}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Fills the pressable, under its children, and never takes a touch.
  highlight: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
});
