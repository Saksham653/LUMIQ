import {
  cubicBezier,
  Easing,
  ReduceMotion,
  type CSSTransitionProperties,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

// LUMIQ motion (brand spec, sections 7 and 8). Every value is copied from
// tokens.json; no component types a duration, a curve or a spring.
//
// The rules:
// - Things arrive on a spring and leave on a curve. A leaving thing uses the
//   exit curve and never settles.
// - Nothing moves unless a finger caused it or the phone has just checked
//   something.
// - Only the sun may bounce (the `pop` spring: the stamp and the launch).
// - Animate transform and opacity only, on the UI thread, and always start
//   from the value on screen so a move can be interrupted.
// - Every animation has a reduced-motion form: jump to the end state, keep
//   colour and opacity changes, drop movement, keep haptics and words.

export { useReducedMotion } from 'react-native-reanimated';

// --- Springs -----------------------------------------------------------------

// stiffness / damping / mass, the form withSpring takes.
export const springs = {
  // Rows, tiles and pills arriving; the tab pill moving. No overshoot.
  settle: { stiffness: 280, damping: 34, mass: 1 },
  // The release after a press. About 5 percent past, once.
  press: { stiffness: 420, damping: 28, mass: 1 },
  // A sheet coming up from its measured height; snap back after a drag. No
  // overshoot.
  sheet: { stiffness: 220, damping: 30, mass: 1 },
  // The sun only: the stamp and the launch. The one clear bounce.
  pop: { stiffness: 380, damping: 18, mass: 0.9 },
  // Digit columns. No overshoot.
  roll: { stiffness: 170, damping: 27, mass: 1 },
} as const;
export type SpringName = keyof typeof springs;

function springConfigs(reduceMotion: ReduceMotion): Record<SpringName, WithSpringConfig> {
  return {
    settle: { ...springs.settle, reduceMotion },
    press: { ...springs.press, reduceMotion },
    sheet: { ...springs.sheet, reduceMotion },
    pop: { ...springs.pop, reduceMotion },
    roll: { ...springs.roll, reduceMotion },
  };
}
const SPRING_BY_SETTING = springConfigs(ReduceMotion.System);
const SPRING_STILL = springConfigs(ReduceMotion.Always);

// The withSpring config for a named spring:
//   x.set(withSpring(0, spring('sheet', reduced)))
// The phone's reduce-motion setting is always honoured: with it on, the value
// jumps to its end. Pass `reduced` (from useReducedMotion, or a prop that
// asks for stillness) to force the jump. To hand a finger's speed over, spread
// it in: { ...spring('sheet', reduced), velocity }. The same object comes back
// for the same arguments.
export function spring(name: SpringName, reduced = false): WithSpringConfig {
  return (reduced ? SPRING_STILL : SPRING_BY_SETTING)[name];
}

// --- Curves and times ----------------------------------------------------------

const CURVE_POINTS = {
  // Anything leaving. It speeds up and never settles.
  exit: [0.5, 0, 1, 1],
  // The highlight crossing a number.
  sweep: [0.2, 0.8, 0.2, 1],
  // Small changes of colour or opacity; finger down.
  standard: [0.2, 0, 0, 1],
} as const;
export type CurveName = keyof typeof CURVE_POINTS;

// The curves in the two forms Reanimated takes.
// `curve` is for CSS-style transitions and keyframes (transitionTimingFunction,
// animationTimingFunction).
export const curve = {
  exit: cubicBezier(...CURVE_POINTS.exit),
  sweep: cubicBezier(...CURVE_POINTS.sweep),
  standard: cubicBezier(...CURVE_POINTS.standard),
} as const;
// `easing` is for withTiming and for layout animation builders (.easing()).
export const easing = {
  exit: Easing.bezier(...CURVE_POINTS.exit),
  sweep: Easing.bezier(...CURVE_POINTS.sweep),
  standard: Easing.bezier(...CURVE_POINTS.standard),
} as const;

// Milliseconds.
export const duration = {
  // Finger down, to the press scale.
  pressIn: 80,
  // Small changes of colour or opacity.
  quick: 160,
  // Anything leaving: a sheet going down, a toast, a row removed.
  exit: 200,
  // The highlight crossing a number.
  sweep: 320,
  // The launch moment on first open, and on every open after it.
  launch: 1600,
  launchShort: 500,
} as const;
export type DurationName = keyof typeof duration;

// Rows arriving: each rises `rise` dp and fades in, `stagger` ms after the one
// above. Once per screen, on first arrival only, never on scroll, and at most
// `cascadeMax` beats: later rows arrive with the last beat.
export const stagger = 50;
export const rise = 12;
export const cascadeMax = 6;

// How far a pressed thing shrinks. Bigger things shrink less: sm for icon
// buttons and chips, md for buttons, lg for cards and rows.
export const pressScale = { sm: 0.94, md: 0.96, lg: 0.98 } as const;
export type PressWeight = keyof typeof pressScale;

// Between digit columns of a rolling number, the last digit first.
export const digitBeat = 60;

const timingCache = new Map<string, WithTimingConfig>();

function timingConfig(ms: number, curveName: CurveName, reduceMotion: ReduceMotion): WithTimingConfig {
  const key = `${ms}/${curveName}/${reduceMotion}`;
  let config = timingCache.get(key);
  if (config === undefined) {
    config = { duration: ms, easing: easing[curveName], reduceMotion };
    timingCache.set(key, config);
  }
  return config;
}

// The withTiming config for something that moves:
//   y.set(withTiming(height, timing(duration.exit, 'exit', reduced)))
// The phone's reduce-motion setting is always honoured: with it on, the value
// jumps to its end. Pass `reduced` to force the jump. The same object comes
// back for the same arguments.
export function timing(ms: number, curveName: CurveName = 'standard', reduced = false): WithTimingConfig {
  return timingConfig(ms, curveName, reduced ? ReduceMotion.Always : ReduceMotion.System);
}

// The withTiming config for a change of colour or opacity. These stay when
// the phone asks for less motion (they explain a change without moving
// anything), so this one always animates:
//   opacity.set(withTiming(1, fade()))
export function fade(ms: number = duration.quick, curveName: CurveName = 'standard'): WithTimingConfig {
  return timingConfig(ms, curveName, ReduceMotion.Never);
}

// What a CSS-style transition may animate. Transform and opacity are free;
// the colours repaint without a new layout. `width` only on an absolutely
// positioned view with no children (a tab pill, a bar's fill).
export type TransitionProperty = 'transform' | 'opacity' | 'backgroundColor' | 'borderColor' | 'width';

// The style of a CSS-style transition, for a change between two states driven
// by React state (chosen or not, open or closed):
//   <Animated.View style={[styles.dot, { opacity: on ? 1 : 0 }, transition(['opacity'])]} />
// With `reduced`, movement is dropped and the rest is kept: transform and
// width jump to their end while colour and opacity still ease.
export function transition(
  properties: readonly TransitionProperty[],
  ms: number = duration.quick,
  curveName: CurveName = 'standard',
  reduced = false,
): CSSTransitionProperties {
  const kept = reduced ? properties.filter((property) => property !== 'transform' && property !== 'width') : [...properties];
  return {
    transitionProperty: kept.length > 0 ? kept : 'none',
    transitionDuration: ms,
    transitionTimingFunction: curve[curveName],
  };
}

// --- Moments with a script -----------------------------------------------------

// The checked signature (brand spec, section 7). Checked numbers light one
// after another in reading order; the stamp lands on `pop` after the last
// sweep ends; its tick starts a little later and draws.
export const checkedTimeline = {
  // From one number's sweep starting to the next one's.
  between: duration.sweep - digitBeat,
  // From the last sweep ending to the stamp landing.
  stampDelay: duration.exit,
  // From the stamp landing to its tick starting.
  tickDelay: duration.quick,
  // The tick drawing.
  tickDraw: duration.exit,
} as const;

// A sheet is dragged away past this much travel (dp), or by a fast flick;
// otherwise it returns on the `sheet` spring.
export const sheetDismissTravel = 110;

// The launch moment (brand spec, section 7, "Launch"). Times in ms from the
// first frame; these live here and nowhere else. The start screen the phone
// shows is the ground with the tile and the still L, no sun, centred, and the
// app's first frame is the same picture. No sound and no haptic at launch.
// With reduced motion there is no animation: Home appears with the sun on.
export const launchTimeline = {
  // First open: the whole sequence.
  first: duration.launch,
  // Every later open: only the sun coming on (the last part).
  later: duration.launchShort,
  // The name rises `rise` under the tile, letter by letter, one `stagger`
  // apart, on `settle`.
  name: { from: 0, to: 500 },
  // The highlight (`lightSoft`, the letters over it in `onLight`) crosses the
  // name on `sweep`. A clipped layer moved with translate, never a width.
  sweepIn: { from: 500, to: 820 },
  // The highlight leaves on `exit`.
  sweepOut: { from: 900, to: 1100 },
  // The sun rises from the corner of the L and settles on `pop`.
  sun: { from: 1100, to: 1600, offset: 6, scale: 0.2 },
  // One ring of light opens inside the tile, `delay` after the sun starts.
  ring: { delay: 120, scaleFrom: 1, scaleTo: 2.6, fade: 320 },
  // The launch layer leaves on `exit`; Home's cascade starts when it has gone.
  leave: duration.exit,
} as const;

// Everything above under one name, for code that reads better as
// motion.duration.quick.
export const motion = {
  springs,
  curve,
  easing,
  duration,
  stagger,
  rise,
  cascadeMax,
  pressScale,
  digitBeat,
  checked: checkedTimeline,
  sheetDismissTravel,
  launch: launchTimeline,
} as const;
