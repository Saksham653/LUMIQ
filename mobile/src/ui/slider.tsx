import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type FocusEvent,
  type KeyDownEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  GestureDetector,
  PointerType,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { clamp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { border, duration, fade, radius, sizes, space, spring, useIsRTL, useReducedMotion, useTheme } from '@/theme';
import { select } from '@/ui/haptics';

export type SliderProps = {
  // The number. The caller holds it.
  value: number;
  // Called while the thumb is dragged, once for each step it crosses (never
  // once a frame), and for a press on the track, an arrow key or a screen
  // reader's step.
  onValueChange?: (value: number) => void;
  // Called once when the finger lets go, with the number it was left on. The
  // place for work that should not run at every step.
  onValueCommit?: (value: number) => void;
  // The two ends of the track. Default 0 and 100.
  min?: number;
  max?: number;
  // Detents: the number moves in steps of this size, counted from `min`, and
  // each one crossed gives one selection tap in the hand. Left out, the thumb
  // moves freely and the number moves in hundredths of the range, silently.
  step?: number;
  // Draws a small dot on the track at each detent. For a few detents, far
  // apart (a score from 1 to 5); with many they would only be noise. Needs
  // `step`.
  marks?: boolean;
  // Cannot be used: faint ink, no touch.
  disabled?: boolean;
  // What the slider sets, in the app's language ("Change in sales"). A slider
  // has no words of its own, so this is not optional.
  accessibilityLabel: string;
  // The number as a person reads it ("+15%"), written by the app in its own
  // number style. A screen reader says it in place of the bare number.
  valueText?: string;
  testID?: string;
  // Layout only (flex, alignSelf, a width). Merged last.
  style?: StyleProp<ViewStyle>;
};

// The drawing. The brand spec gives the track its colour and the selection
// tap (sections 3 and 9) and no sizes, so these belong to this component.
// The thumb is drawn 28; a finger gets the whole control, 48 high and as wide
// as the track.
const THUMB = 28;
// The dot in the thumb: the dot of the chosen radio (brand spec, section 6).
const DOT = 8;
const TRACK = space.sm;
// A detent's mark on the track: half as high as the track.
const MARK = space.xs;
// The soft ring round the thumb while it is held.
const HALO = 44;
// A touch this close to the middle of the thumb has hold of it.
const GRAB = sizes.target / 2;
// How far a finger moves sideways before it is dragging, and how far up or
// down before it is scrolling the page instead. Distances a finger travels,
// not spacing, so they are not on the spacing scale.
const DRAG_SLOP = 8;
const SCROLL_SLOP = 12;
// Without detents the number moves in hundredths of the range.
const SMOOTH_STEPS = 100;
// A leap is a tenth of the track: Page Up and Page Down, and one step of a
// screen reader on a slider that has no detents.
const LEAP = 10;

// In a browser the gesture library turns Enter and Space on a focused view
// into a press in the middle of it. For a slider that would mean "go to the
// middle", so presses that come from a key are passed over; the arrow keys
// are the keyboard's way to move it.
const FROM_A_KEY: number = PointerType.KEY;

const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

// The detent nearest to a place on the track. `at` runs from 0 at the low end
// to 1 at the high end. Detents sit every `unit` from the low end, and the
// high end is always one of them, also when the range is not a whole number
// of units.
function nearestDetent(at: number, span: number, unit: number, count: number): number {
  'worklet';
  const offset = at * span;
  const index = Math.round(offset / unit);
  if (index >= count) return count;
  if (index === count - 1 && offset > ((count - 1) * unit + span) / 2) return count;
  return Math.max(0, index);
}

// Where a detent sits on the track, 0 to 1.
function placeOf(index: number, span: number, unit: number): number {
  'worklet';
  return Math.min(span, index * unit) / span;
}

// The place on the track, 0 to 1, of a thumb whose middle is `centre` dp from
// the low end of a control `width` dp wide. The thumb stays inside the
// control, so its middle travels the width less one thumb.
function spotOf(centre: number, width: number): number {
  'worklet';
  return clamp((centre - THUMB / 2) / Math.max(1, width - THUMB), 0, 1);
}

// The number at a detent. Steps such as 0.1 leave dust in a number
// (0.1 + 0.2); six decimals is finer than any step a person sets.
function numberAt(index: number, min: number, span: number, unit: number): number {
  return Math.round((min + Math.min(span, index * unit)) * 1e6) / 1e6;
}

// A focus that came from a keyboard, not from a finger or a mouse. On a phone
// only a keyboard or a switch can focus a view; in the browser a click
// focuses too, so the browser is asked. (The same test Press makes.)
function isKeyboardFocus(event: FocusEvent): boolean {
  if (Platform.OS !== 'web') return true;
  const target = (event as unknown as { nativeEvent?: { target?: { matches?: (selector: string) => boolean } } })
    .nativeEvent?.target;
  try {
    return target?.matches?.(':focus-visible') ?? true;
  } catch {
    return true;
  }
}

// A slider: a track, the part of it already chosen in the action blue, and a
// thumb to drag.
//   <Slider value={change} onValueChange={setChange} min={-50} max={50} step={5}
//     accessibilityLabel={t('whatIf.change')} valueText={numbers.signedPercent(change)} />
//
// The thumb follows the finger on the UI thread, one to one; the number
// reaches React only when a step is crossed. Let go and the thumb settles on
// the nearest step. A press on the track sends it there. A drag starts after
// a few dp sideways, so a page can still be scrolled with a finger that lands
// on the slider. A mouse drags and presses it the same way.
//
// It runs from the reading edge: the low end is on the right in Hebrew. With
// a keyboard the arrow keys step it, Page Up and Page Down leap, Home and End
// go to the ends. To a screen reader it is adjustable: swipe up or down to
// step.
//
// It draws no number. Show the value beside it; `valueText` is what is read
// out.
//
// Needs GestureHandlerRootView above it, once, at the root of the app.
export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step,
  marks = false,
  disabled = false,
  accessibilityLabel,
  valueText,
  testID,
  style,
}: SliderProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const side = useIsRTL() ? -1 : 1;

  // The track in numbers: how long it is, how far one step is, how many steps.
  const span = max > min ? max - min : 1;
  const ticks = step !== undefined && step > 0;
  const unit = step !== undefined && step > 0 ? Math.min(step, span) : span / SMOOTH_STEPS;
  const count = Math.max(1, Math.ceil(span / unit - 1e-9));
  // Where the caller's number sits on the track, 0 to 1. A number that is not
  // known rests at the low end.
  const target = Number.isFinite(value) ? Math.min(1, Math.max(0, (value - min) / span)) : 0;

  // Where the thumb is, 0 to 1. A finger, a spring or the caller's number
  // moves it; nothing else reads the number to draw.
  const position = useSharedValue(target);
  // The width of the control, measured.
  const width = useSharedValue(0);
  // A drag: where the thumb's middle was when it began, whether the finger
  // landed on the thumb, the last detent told to React, and whether a finger
  // has hold of the thumb right now.
  const origin = useSharedValue(0);
  const grabbed = useSharedValue(false);
  const detent = useSharedValue(0);
  const dragging = useSharedValue(false);
  // 0 at rest, 1 while the thumb is held.
  const held = useSharedValue(0);

  const [focused, setFocused] = useState(false);
  // Counts the gestures that have ended, so the thumb is put back on the
  // caller's number after each one, also when the caller turned the change
  // down.
  const [settled, setSettled] = useState(0);

  // The caller's side as of the latest render, for calls that arrive from the
  // UI thread between renders.
  const live = useRef({ number: value, min, span, unit, count, ticks, onValueChange, onValueCommit });
  useEffect(() => {
    live.current = { number: value, min, span, unit, count, ticks, onValueChange, onValueCommit };
  });

  const settle = spring('settle', reduced);
  const touchDown = fade(duration.pressIn);
  const letGo = fade();

  // The caller's number moves the thumb, on a spring, unless a finger has it:
  // then the finger wins and the thumb is put right when it lets go. The
  // check is made on the UI thread, where the finger is.
  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      if (!dragging.get()) position.set(withSpring(target, settle));
    });
  }, [target, settled, settle, position, dragging]);

  // A detent was crossed under the finger.
  const cross = (index: number) => {
    const now = live.current;
    if (now.ticks) select();
    now.onValueChange?.(numberAt(index, now.min, now.span, now.unit));
  };

  // The finger let go, or pressed the track.
  const drop = (index: number, pressed: boolean) => {
    const now = live.current;
    const next = numberAt(index, now.min, now.span, now.unit);
    const moved = next !== now.number;
    if (pressed && moved) {
      if (now.ticks) select();
      now.onValueChange?.(next);
    }
    if (moved || !pressed) now.onValueCommit?.(next);
    setSettled((times) => times + 1);
  };

  // A step from the keyboard or a screen reader: straight to a detent.
  const goTo = (index: number) => {
    const now = live.current;
    const next = numberAt(Math.min(now.count, Math.max(0, index)), now.min, now.span, now.unit);
    if (next === now.number) return;
    if (now.ticks) select();
    now.onValueChange?.(next);
    now.onValueCommit?.(next);
  };

  const detentNow = (): number => {
    const now = live.current;
    const at = Number.isFinite(now.number) ? Math.min(1, Math.max(0, (now.number - now.min) / now.span)) : 0;
    return nearestDetent(at, now.span, now.unit, now.count);
  };

  const pan = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-DRAG_SLOP, DRAG_SLOP],
    failOffsetY: [-SCROLL_SLOP, SCROLL_SLOP],
    onBegin: (event) => {
      'worklet';
      if (event.pointerType === FROM_A_KEY) return;
      const wide = width.get();
      const centre = THUMB / 2 + position.get() * Math.max(1, wide - THUMB);
      const touch = side === 1 ? event.x : wide - event.x;
      const onThumb = Math.abs(touch - centre) <= GRAB;
      grabbed.set(onThumb);
      // A finger on the thumb is answered at contact. One that lands on the
      // track may still be scrolling the page, so that waits for the drag.
      if (onThumb) held.set(withTiming(1, touchDown));
    },
    onActivate: (event) => {
      'worklet';
      const wide = width.get();
      const centre = THUMB / 2 + position.get() * Math.max(1, wide - THUMB);
      const touch = side === 1 ? event.x : wide - event.x;
      // Held by the thumb, it moves from where it is. Caught on the track, it
      // comes to the finger.
      const from = grabbed.get() ? centre : touch;
      dragging.set(true);
      held.set(withTiming(1, touchDown));
      detent.set(nearestDetent(position.get(), span, unit, count));
      origin.set(from - side * event.translationX);
      const at = spotOf(from, wide);
      position.set(at);
      const index = nearestDetent(at, span, unit, count);
      if (index !== detent.get()) {
        detent.set(index);
        scheduleOnRN(cross, index);
      }
    },
    onUpdate: (event) => {
      'worklet';
      const at = spotOf(origin.get() + side * event.translationX, width.get());
      position.set(at);
      // React hears of it only when a step is crossed, never once a frame.
      const index = nearestDetent(at, span, unit, count);
      if (index !== detent.get()) {
        detent.set(index);
        scheduleOnRN(cross, index);
      }
    },
    onDeactivate: () => {
      'worklet';
      dragging.set(false);
      const index = detent.get();
      // A slider has no momentum: it settles on the step it was left on.
      position.set(withSpring(placeOf(index, span, unit), settle));
      scheduleOnRN(drop, index, false);
    },
    onFinalize: () => {
      'worklet';
      held.set(withTiming(0, letGo));
    },
  });

  const tap = useTapGesture({
    enabled: !disabled,
    maxDistance: DRAG_SLOP,
    onActivate: (event) => {
      'worklet';
      if (event.pointerType === FROM_A_KEY) return;
      const wide = width.get();
      const index = nearestDetent(spotOf(side === 1 ? event.x : wide - event.x, wide), span, unit, count);
      position.set(withSpring(placeOf(index, span, unit), settle));
      scheduleOnRN(drop, index, true);
    },
  });

  // Whichever is sure first, the drag or the press, ends the other.
  const gesture = useCompetingGestures(pan, tap);

  const thumbStyle = useAnimatedStyle<ViewStyle>(() => {
    const wide = width.get();
    return {
      // Nothing is drawn in the one frame before the control is measured.
      opacity: wide > 0 ? 1 : 0,
      transform: [{ translateX: side * position.get() * Math.max(0, wide - THUMB) }],
    };
  });

  // The fill is as long as the track and is slid along it, clipped by the
  // track's round ends: a transform, never an animated width.
  const fillStyle = useAnimatedStyle<ViewStyle>(() => {
    const wide = width.get();
    const centre = THUMB / 2 + position.get() * Math.max(0, wide - THUMB);
    return {
      opacity: wide > 0 ? 1 : 0,
      transform: [{ translateX: side * (centre - wide) }],
    };
  });

  const haloStyle = useAnimatedStyle<ViewStyle>(() => ({ opacity: held.get() }));

  const measure = (event: LayoutChangeEvent) => {
    width.set(event.nativeEvent.layout.width);
  };

  // A screen reader steps one detent at a time, or a leap where there are none.
  const act = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    const now = live.current;
    const stride = now.ticks ? 1 : Math.max(1, Math.round(now.count / LEAP));
    if (name === 'increment') goTo(detentNow() + stride);
    else if (name === 'decrement') goTo(detentNow() - stride);
  };

  const key = (event: KeyDownEvent) => {
    if (disabled) return;
    const name = event.nativeEvent.key;
    const from = detentNow();
    const leap = Math.max(1, Math.round(live.current.count / LEAP));
    let to: number;
    if (name === 'ArrowUp') to = from + 1;
    else if (name === 'ArrowDown') to = from - 1;
    // Sideways keys follow what is on screen: the right arrow moves the thumb
    // to the right, which is toward the low end in Hebrew.
    else if (name === 'ArrowRight') to = from + side;
    else if (name === 'ArrowLeft') to = from - side;
    else if (name === 'PageUp') to = from + leap;
    else if (name === 'PageDown') to = from - leap;
    else if (name === 'Home') to = 0;
    else if (name === 'End') to = live.current.count;
    else return;
    // The page must not scroll under a key the slider has taken.
    event.preventDefault();
    goTo(to);
  };

  const focus = (event: FocusEvent) => {
    if (isKeyboardFocus(event)) setFocused(true);
  };

  const blur = () => {
    setFocused(false);
  };

  // Disabled is faint ink on the same track, never a faded blue.
  const ink = disabled ? colors.disabledInk : colors.action;
  // The keyboard focus ring: 3 wide, 3 away from the thumb.
  const ring: ViewStyle | null =
    focused && !disabled
      ? {
          outlineColor: colors.focusRing,
          outlineStyle: 'solid',
          outlineWidth: border.focus,
          outlineOffset: border.focus,
        }
      : null;

  // A phone reads a range in whole numbers only. A number with a fraction and
  // no words of its own is handed over as it is written, so it is not cut.
  const whole = Number.isInteger(value) && Number.isInteger(min) && Number.isInteger(max);
  const spoken = valueText ?? (whole || !Number.isFinite(value) ? undefined : String(value));

  // Where the detents sit, 0 to 1, when they are to be drawn.
  const places: number[] = [];
  if (marks && ticks) {
    for (let index = 0; index <= count; index += 1) places.push(placeOf(index, span, unit));
  }
  const markInk = disabled ? colors.disabledInk : colors.inkFaint;

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y" userSelect="none">
      <View
        // Never flattened away: the gesture measures its x from this view.
        collapsable={false}
        testID={testID}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number.isFinite(value) ? value : undefined}
        aria-valuetext={spoken}
        aria-disabled={disabled}
        accessibilityActions={disabled ? undefined : ACTIONS}
        onAccessibilityAction={act}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={key}
        onFocus={focus}
        onBlur={blur}
        onLayout={measure}
        style={[styles.control, !disabled && styles.live, style]}>
        <View style={[styles.track, { backgroundColor: colors.surfaceSunk }]}>
          {places.length > 0 ? (
            <View style={styles.marks}>
              {places.map((place) => (
                <View key={place} style={[styles.markSpot, { insetInlineStart: `${place * 100}%` }]}>
                  <View style={[styles.mark, { backgroundColor: markInk }]} />
                </View>
              ))}
            </View>
          ) : null}
          {/* Over the marks: the ones already passed are under the blue. */}
          <Animated.View style={[styles.fill, { backgroundColor: ink }, fillStyle]} />
        </View>
        <Animated.View style={[styles.carrier, thumbStyle]}>
          <Animated.View style={[styles.halo, { backgroundColor: colors.actionSoft }, haloStyle]} />
          <View style={[styles.thumb, { backgroundColor: ink }, ring]}>
            <View style={[styles.dot, { backgroundColor: disabled ? colors.disabledFill : colors.onAction }]} />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // The whole control takes the finger: 48 high, as wide as it is laid out.
  // It holds no text, so its height need not grow. The browser's own focus
  // outline is switched off (a solid line of no width): the ring is drawn on
  // the thumb.
  control: { minHeight: sizes.target, justifyContent: 'center', outlineStyle: 'solid', outlineWidth: 0 },
  // In the browser a mouse shows that it can be pressed.
  live: { cursor: 'pointer' },
  // The round ends of the track clip the fill.
  track: { height: TRACK, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFill },
  // The stretch of the track the thumb's middle travels: half a thumb in from
  // each end. A mark's place is a share of it, counted from the reading edge.
  marks: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    insetInlineStart: THUMB / 2,
    insetInlineEnd: THUMB / 2,
  },
  // A spot of no width at the detent, with the dot centred on it.
  markSpot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { width: MARK, height: MARK, borderRadius: radius.pill },
  // A thumb-wide column at the low end of the track, slid along it. Never
  // takes a touch: the control does.
  carrier: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    insetInlineStart: 0,
    width: THUMB,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  // Behind the thumb and wider than it, in the middle of the column.
  halo: { position: 'absolute', width: HALO, height: HALO, borderRadius: radius.pill },
  thumb: {
    width: THUMB,
    height: THUMB,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
});
