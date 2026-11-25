import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type FocusEvent,
  type KeyDownEvent,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  MAX_FONT_SCALE,
  border,
  cascadeMax,
  duration,
  figureFont,
  radius,
  sizes,
  space,
  spring,
  stagger,
  typeScale,
  useIsRTL,
  useReducedMotion,
  useTheme,
  keepLeftToRight,
} from '@/theme';
import {
  UNKNOWN,
  axisCells,
  bandCenter,
  bandIndexAt,
  bandLayout,
  bandStart,
  cascadeDelay,
  clamp,
  estimateTextWidth,
  extent,
  figureRuns,
  isKnown,
  labelEvery,
  linearScale,
  maxIndex,
  pointIndexAt,
  withZero,
} from '@/ui/charts/scale';
import { select } from '@/ui/haptics';
import { Icon } from '@/ui/icon';
import { Press } from '@/ui/press';
import { Skeleton, SkeletonChart, SkeletonText } from '@/ui/skeleton';
import { HStack } from '@/ui/stack';
import { Txt, type TxtAlign, type TxtTone } from '@/ui/text';

// The chart layer. Six charts drawn from plain arrays: BarChart (this file),
// HBarChart, LineChart, Sparkline, Distribution and Ring.
//
// What they all hold to:
// - The numbers are the app's. A chart is given values and a `format`
//   function; it never rounds, sums or words a number itself.
// - Nothing misleading. Bars start at zero. An unknown value is a gap or a
//   dash, never a zero. With fewer than two values there is no chart, only an
//   honest line of words (`emptyLabel`).
// - Colour says one thing: resting marks are `chartRest`, the one mark being
//   pointed at is `chartPeak` and always carries its value in words as well.
//   The yellow never appears in a chart.
// - A chart speaks: one summary for the whole picture and one label for each
//   mark, both in the app's words. A plot is one adjustable element to a
//   screen reader (brand spec, section 6): its name is the summary, its value
//   is the mark being read, and a swipe up or down moves one mark.
// - The time axis never flips. A plot runs left to right in every language.

// ---------------------------------------------------------------------------
// Parts every chart in this folder is built from. They live here, in the first
// file of the group, so the other charts can import them without a circle.
// The barrel (index.ts) exports the charts, not these.
// ---------------------------------------------------------------------------

// The height of a plot (brand spec, section 6, "Charts"). md is the plot on
// the brand board.
export const PLOT_HEIGHT = { sm: 64, md: 88, lg: 132 } as const;
export type ChartSize = keyof typeof PLOT_HEIGHT;

// The paper a chart is drawn on. A chart must know it for the two places
// where it paints paper over a mark: behind the label of a dashed line, and
// round a dot on a line. A card is `surface`.
export type ChartPaper = 'surface' | 'ground' | 'surfaceSunk';

// Bar tops (brand spec, section 6): radius 4. It belongs to charts alone.
export const BAR_CORNER = 4;
// The dashed line of a figure worked out from the others (an average, a
// median) or of a value that is not real yet (a projection): 5 on, 4 off, as
// on the board.
export const RULE_DASH: readonly number[] = [5, 4];
// A value that is not zero always shows at least this much of a mark, so a
// small value is never read as none.
export const MARK_MIN = border.strong;
// A column narrower than this is too thin to aim at, so the read-out also
// carries a previous and a next button (brand spec, section 6: narrower than
// 24, which is half the 48 target).
export const NARROW_COLUMN = sizes.target / 2;
// Marks closer together than this are not steps a hand can feel one by one:
// a drag across them stays quiet, where a tap or a single step still ticks.
export const TICK_MIN = space.md;

// A browser reads a name aloud only from something that has a role; a phone
// reads it from any accessible view and would add "image" to every row.
export const MARK_ROLE = Platform.OS === 'web' ? ('img' as const) : undefined;
const WEB = Platform.OS === 'web';
// Android measures Hindi narrower than it draws it, so words that size
// themselves can lose their end. Txt mends that for plain words (`snug`); a
// value built from runs gets the same trailing space here.
const SNUG_TAIL = Platform.OS === 'android' ? ' ' : null;
// A finger must travel this far sideways before a touch becomes a scrub, and
// a touch that travels this far up or down first belongs to the page.
const SCRUB_START = space.sm;
const SCRUB_LEAVE = space.md;
// A finger that rests this long means to read, not to scroll: the mark under
// it is read without waiting for it to lift.
const SCRUB_HOLD = duration.quick;

// What a screen reader can do to a plot: move to the next mark, or back.
const STEP_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

// The width of a plot, read from its own layout: a chart is always as wide as
// its parent lays it out and never asks for a number.
export function usePlotWidth(): { width: number; onLayout: NonNullable<ViewProps['onLayout']> } {
  const [width, setWidth] = useState(0);
  const onLayout: NonNullable<ViewProps['onLayout']> = (event) => {
    const next = event.nativeEvent.layout.width;
    setWidth((now) => (Math.abs(now - next) < 0.5 ? now : next));
  };
  return { width, onLayout };
}

export type Reading = {
  // The mark that was last read, or null until the chart has been read.
  picked: number | null;
  // The same on the UI thread, -1 for none. A finger writes it there, and the
  // ring or the cursor follows it in the same frame.
  active: SharedValue<number>;
  // A finger read a mark. `tick` is whether the hand feels it.
  choose: (index: number, tick: boolean) => void;
  // A key, a screen reader or a step button moves to a mark.
  go: (index: number, tick?: boolean) => void;
};

// Which mark of a chart is being read. One selection tap in the hand for each
// new mark, at the moment the read-out changes; `onSelect` hears of it once
// per mark, never once a frame.
export function useReading(count: number, onSelect?: (index: number) => void): Reading {
  const [chosen, setChosen] = useState<number | null>(null);
  const active = useSharedValue(-1);
  // A mark that is no longer there is no longer read.
  const picked = chosen !== null && chosen < count ? chosen : null;

  useEffect(() => {
    if (picked === null) active.set(-1);
  }, [picked, active]);

  const choose = (index: number, tick: boolean) => {
    if (tick) select();
    setChosen(index);
    onSelect?.(index);
  };
  const go = (index: number, tick = true) => {
    if (count <= 0) return;
    const next = clamp(Math.round(index), 0, count - 1);
    if (next === picked) return;
    active.set(next);
    choose(next, tick);
  };
  return { picked, active, choose, go };
}

// A focus that came from a keyboard, not from a finger or a mouse. On a phone
// only a keyboard or a switch can focus a view; in the browser a click
// focuses too, so the browser is asked. (The same test Press makes.)
function isKeyboardFocus(event: FocusEvent): boolean {
  if (!WEB) return true;
  const target = (event as unknown as { nativeEvent?: { target?: { matches?: (selector: string) => boolean } } })
    .nativeEvent?.target;
  try {
    return target?.matches?.(':focus-visible') ?? true;
  } catch {
    return true;
  }
}

export type ScrubConfig = {
  // How an x becomes a mark. `band`: every mark owns a slot `step` wide,
  // counted from the plot's left edge. `point`: the nearest of points `step`
  // apart, the first at `inset`.
  step: number;
  inset?: number;
  snap: 'band' | 'point';
  // The mark under the finger, -1 for none. It is written on the UI thread;
  // the chart reads it there to draw its ring or its cursor in the same frame.
  active: SharedValue<number>;
  // Called on the React side once for every change of mark, never per frame.
  // `moving` is true when a drag crossed onto the mark, false when a finger
  // landed on it.
  onPick: (index: number, moving: boolean) => void;
};

type ScrubSurfaceProps = ScrubConfig & { count: number; children?: ReactNode };

// The plot as one touch surface (brand spec, section 6): a finger anywhere in
// a mark's column reads that mark. A tap reads the mark under it; so does a
// finger that rests; a drag sideways reads every mark it crosses; a drag up
// or down is left to the page, so a chart never traps a scroll. The x is
// turned into a mark on the UI thread, and React hears about it only when the
// mark changes.
//
// It must sit under a GestureHandlerRootView. A chart that is not interactive
// does not mount it at all.
function ScrubSurface({ count, step, inset = 0, snap, active, onPick, children }: ScrubSurfaceProps) {
  const bands = snap === 'band';

  const read = (x: number, moving: boolean) => {
    'worklet';
    const index = bands ? bandIndexAt(x, step, count) : pointIndexAt(x, inset, step, count);
    if (index < 0 || index === active.get()) return;
    active.set(index);
    scheduleOnRN(onPick, index, moving);
  };

  // A drag that starts sideways.
  const drag = usePanGesture({
    activeOffsetX: [-SCRUB_START, SCRUB_START],
    failOffsetY: [-SCRUB_LEAVE, SCRUB_LEAVE],
    onActivate: (event) => {
      'worklet';
      read(event.x, false);
    },
    onUpdate: (event) => {
      'worklet';
      read(event.x, true);
    },
  });
  // A finger that rests: it reads at once, and may then drag any way it likes.
  const hold = usePanGesture({
    activateAfterLongPress: SCRUB_HOLD,
    onActivate: (event) => {
      'worklet';
      read(event.x, false);
    },
    onUpdate: (event) => {
      'worklet';
      read(event.x, true);
    },
  });
  const tap = useTapGesture({
    onActivate: (event) => {
      'worklet';
      read(event.x, false);
    },
  });
  // Whichever is sure first ends the others.
  const gesture = useCompetingGestures(drag, hold, tap);

  return (
    <GestureDetector gesture={gesture} touchAction="pan-y" userSelect="none">
      {children}
    </GestureDetector>
  );
}

export type PlotSurfaceProps = {
  // What the whole chart says.
  summary: string;
  // How many marks there are.
  count: number;
  // The mark being read, -1 for none yet, and what it says.
  current: number;
  spoken?: string;
  // A key or a screen reader moved to another mark.
  onStep: (index: number) => void;
  height: number;
  // Given when a finger can read the plot. Left out, the plot takes no touch.
  scrub?: ScrubConfig;
  onLayout?: ViewProps['onLayout'];
  children?: ReactNode;
};

// The plot of a chart. It never mirrors: inside it the inline start is the
// left edge in every language.
//
// To a screen reader it is one adjustable element (brand spec, section 6):
// its name is the chart's summary and its value is the mark being read
// ("October, 448 thousand"). A swipe up or down moves one mark. With a
// keyboard the arrow keys do the same, and Home and End go to the two ends.
export function PlotSurface({
  summary,
  count,
  current,
  spoken,
  onStep,
  height,
  scrub,
  onLayout,
  children,
}: PlotSurfaceProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const step = (to: number) => {
    if (count > 0) onStep(clamp(to, 0, count - 1));
  };
  // With nothing read yet, forward starts at the first mark and back at the
  // last.
  const next = current < 0 ? 0 : current + 1;
  const previous = current < 0 ? count - 1 : current - 1;

  const act = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'increment') step(next);
    else if (name === 'decrement') step(previous);
  };

  const key = (event: KeyDownEvent) => {
    const name = event.nativeEvent.key;
    let to: number;
    // The plot never mirrors, so the right arrow is the next mark in every
    // language.
    if (name === 'ArrowRight' || name === 'ArrowUp') to = next;
    else if (name === 'ArrowLeft' || name === 'ArrowDown') to = previous;
    else if (name === 'Home') to = 0;
    else if (name === 'End') to = count - 1;
    else return;
    // The page must not scroll under a key the chart has taken.
    event.preventDefault();
    step(to);
  };

  const focus = (event: FocusEvent) => {
    if (isKeyboardFocus(event)) setFocused(true);
  };
  const blur = () => {
    setFocused(false);
  };

  // The keyboard focus ring: 3 wide, 3 away from the plot.
  const ring: ViewStyle | null = focused
    ? {
        outlineColor: colors.focusRing,
        outlineStyle: 'solid',
        outlineWidth: border.focus,
        outlineOffset: border.focus,
      }
    : null;

  const surface = (
    <View
      // Never flattened away: the gesture measures its x from this view.
      collapsable={false}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={summary}
      aria-valuetext={spoken}
      // A browser's slider needs the bare numbers too. A phone is given the
      // words alone, so it never reads a mark out as a percentage.
      aria-valuemin={WEB ? 0 : undefined}
      aria-valuemax={WEB ? Math.max(0, count - 1) : undefined}
      aria-valuenow={WEB && current >= 0 ? current : undefined}
      accessibilityActions={STEP_ACTIONS}
      onAccessibilityAction={act}
      tabIndex={0}
      onKeyDown={key}
      onFocus={focus}
      onBlur={blur}
      onLayout={onLayout}
      style={[styles.plot, scrub !== undefined && styles.live, { height }, ring]}>
      {children}
    </View>
  );

  if (scrub === undefined) return surface;
  return (
    <ScrubSurface count={count} {...scrub}>
      {surface}
    </ScrubSurface>
  );
}

// What a chart with no plot says to a screen reader (the ranked rows of
// HBarChart). It lies under the rows and fills the chart, so it is met first
// and never stands in a finger's way.
export function ChartSummary({ label }: { label: string }) {
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.summary} />;
}

// The honest line shown in place of a chart that cannot be drawn. Without
// words there is nothing at all, never a blank box.
export function ChartEmpty({ label, style }: { label: string | undefined; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  if (label === undefined || label === '') return null;
  return (
    <HStack gap="sm" align="start" style={style}>
      <Icon name="info" size={sizes.iconSmall} color={colors.inkSoft} />
      <Txt variant="small" tone="soft" style={styles.grow}>
        {label}
      </Txt>
    </HStack>
  );
}

export type ChartValueProps = {
  // A number the app has already formatted: "712 K", "₹4.68M", "7.12 लाख".
  text: string;
  variant?: 'label' | 'small';
  tone?: TxtTone;
  // 600 for the value being pointed at; otherwise 500, the weight of small
  // figures in a table.
  strong?: boolean;
  align?: TxtAlign;
  // How many lines it may take before it is cut. Default 1.
  lines?: number;
  // Layout only.
  style?: StyleProp<TextStyle>;
};

// A formatted number on a chart: its digits in the figures face, its currency
// sign and unit in the text face (brand spec, section 5), on one line.
export function ChartValue({
  text,
  variant = 'small',
  tone = 'ink',
  strong = false,
  align,
  lines = 1,
  style,
}: ChartValueProps) {
  const digits = figureFont(strong ? '600' : '500');
  return (
    <Txt variant={variant} tone={tone} weight={strong ? '600' : '500'} align={align} numberOfLines={lines} style={style}>
      {figureRuns(text).map((run, at) =>
        run.figures ? (
          // Txt cannot reach the figures face, so the digits are a bare Text
          // inside it: they keep its size, line and colour.
          <Text key={at} style={digits}>
            {run.text}
          </Text>
        ) : (
          run.text
        ),
      )}
      {SNUG_TAIL}
    </Txt>
  );
}

// A label pinned over (or under) one point of the plot: centred on the point,
// and kept inside the plot where the point is near an edge, so it is never
// cut. `at` is the point's place across the plot, 0 at the left edge and 1 at
// the right. The label lays itself out at the left edge and is moved into
// place by a transform once both widths are known.
export function PinnedLabel({ at, children }: { at: number; children: ReactNode }) {
  const [room, setRoom] = useState(0);
  const [own, setOwn] = useState(0);
  const onRoom: NonNullable<ViewProps['onLayout']> = (event) => {
    const next = event.nativeEvent.layout.width;
    setRoom((now) => (Math.abs(now - next) < 0.5 ? now : next));
  };
  const onOwn: NonNullable<ViewProps['onLayout']> = (event) => {
    const next = event.nativeEvent.layout.width;
    setOwn((now) => (Math.abs(now - next) < 0.5 ? now : next));
  };
  const placed = room > 0 && own > 0;
  const shift = placed ? clamp(clamp(at, 0, 1) * room - own / 2, 0, Math.max(0, room - own)) : 0;
  return (
    <View aria-hidden onLayout={onRoom} style={styles.pin}>
      {/* Unseen for the one frame before it has been measured, so it never shows in the wrong place. */}
      <View onLayout={onOwn} style={[styles.pinned, { opacity: placed ? 1 : 0, transform: [{ translateX: shift }] }]}>
        {children}
      </View>
    </View>
  );
}

// A 2 dashed line, across or down.
export function DashedRule({ length, color, vertical = false }: { length: number; color: string; vertical?: boolean }) {
  const middle = border.strong / 2;
  return (
    <Svg width={vertical ? border.strong : length} height={vertical ? length : border.strong}>
      <Line
        x1={vertical ? middle : 0}
        y1={vertical ? 0 : middle}
        x2={vertical ? middle : length}
        y2={vertical ? length : middle}
        stroke={color}
        strokeWidth={border.strong}
        strokeDasharray={RULE_DASH}
      />
    </Svg>
  );
}

export type AverageRuleProps = {
  // Where the line runs, measured from the top of the plot.
  y: number;
  // The plot it crosses.
  width: number;
  height: number;
  // The app's words for it, with the value: "Average 390 K".
  label?: string;
  paper: ChartPaper;
};

// The average (brand spec, section 6): a 2 dashed `inkFaint` line across the
// plot, with its label on a patch of paper just above it at the left, so the
// words stay readable where they cross a mark. Near the top of the plot the
// label goes under the line instead.
export function AverageRule({ y, width, height, label, paper }: AverageRuleProps) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  // Room for one line of small text, in the tallest script, at the phone's
  // text size.
  const room = typeScale.small.lineDeva * Math.min(fontScale, MAX_FONT_SCALE) + space.xs;
  const above = y >= room;
  return (
    <>
      <View style={[styles.rule, { top: y - border.strong / 2 }]}>
        <DashedRule length={width} color={colors.inkFaint} />
      </View>
      {label !== undefined && label !== '' ? (
        <View
          style={[
            styles.ruleLabel,
            { backgroundColor: colors[paper] },
            above ? { bottom: height - y + space.xs } : { top: y + space.xs },
          ]}>
          <Txt variant="small" tone="soft" snug numberOfLines={1}>
            {label}
          </Txt>
        </View>
      ) : null}
    </>
  );
}

export type AxisEndsProps = {
  // What the first mark is and what the last one is.
  first: string;
  last: string;
  // Their values, already formatted, written under the names.
  firstValue?: string;
  lastValue?: string;
  // The names themselves are numbers (the two edges of a histogram).
  figures?: boolean;
};

// The two ends of an axis.
export function AxisEnds({ first, last, firstValue, lastValue, figures = false }: AxisEndsProps) {
  return (
    <View aria-hidden style={styles.ends}>
      <View style={styles.grow}>
        {figures ? (
          <ChartValue text={first} tone="soft" lines={2} />
        ) : (
          <Txt variant="small" tone="soft" numberOfLines={2}>
            {first}
          </Txt>
        )}
        {firstValue !== undefined ? <ChartValue text={firstValue} lines={2} /> : null}
      </View>
      <View style={styles.grow}>
        {figures ? (
          <ChartValue text={last} tone="soft" align="end" lines={2} />
        ) : (
          <Txt variant="small" tone="soft" align="end" numberOfLines={2}>
            {last}
          </Txt>
        )}
        {lastValue !== undefined ? <ChartValue text={lastValue} align="end" lines={2} /> : null}
      </View>
    </View>
  );
}

type StepButtonProps = {
  toward: 'previous' | 'next';
  // Its spoken name.
  label: string;
  // Left out when there is no mark that way: the button cannot be used.
  onPress?: () => void;
};

// One of the two buttons that move the read-out one mark. It holds an icon,
// never text, so it may have a fixed size: the 48 target.
function StepButton({ toward, label, onPress }: StepButtonProps) {
  const { colors } = useTheme();
  const rtl = useIsRTL();
  const off = onPress === undefined;
  // The chevron is drawn pointing right and Icon turns it round in
  // right-to-left languages. A plot never mirrors, so "next" must point right
  // in every language: here the turn is made, or undone, by hand.
  const turned = (toward === 'previous') !== rtl;
  return (
    <Press
      weight="sm"
      feedback="highlight"
      // One selection tap at contact; the step itself is silent.
      haptic="select"
      disabled={off}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.stepButton}>
      <View style={turned ? styles.turned : undefined}>
        <Icon name="chevron" color={off ? colors.disabledInk : colors.ink} />
      </View>
    </Press>
  );
}

export type ReadOutSteps = {
  // The spoken names of the two buttons.
  previousLabel: string;
  nextLabel: string;
  // Left out when there is no mark that way.
  onPrevious?: () => void;
  onNext?: () => void;
};

export type ReadOutProps = {
  // The mark being read: its name, and what there is to say about it.
  name?: string;
  detail?: string;
  // How to use the chart, shown until it has been touched.
  hint?: string;
  // The previous and next buttons, for a plot whose columns are too narrow
  // to aim at.
  steps?: ReadOutSteps;
};

// The line of words above a plot that says what the finger is on (brand spec,
// section 6). It never gets shorter once it has been a height: a plot that
// jumped up under a finger would move the very bar being read.
//
// Its words are silent to a screen reader, which hears the same from the plot
// itself.
export function ReadOut({ name, detail, hint, steps }: ReadOutProps) {
  const [floor, setFloor] = useState(0);
  const onLayout: NonNullable<ViewProps['onLayout']> = (event) => {
    const next = event.nativeEvent.layout.height;
    setFloor((now) => (next > now + 0.5 ? next : now));
  };
  const empty = name === undefined && detail === undefined && hint === undefined;
  return (
    <View onLayout={onLayout} style={[styles.readOut, { minHeight: floor }]}>
      <HStack aria-hidden gap="sm" wrap style={styles.grow}>
        {name !== undefined ? (
          // A long name wraps inside the row; it is never cut.
          <Txt variant="small" weight="600" snug style={styles.shrink}>
            {name}
          </Txt>
        ) : null}
        {detail !== undefined ? (
          <Txt variant="small" tone="soft" snug>
            {detail}
          </Txt>
        ) : null}
        {hint !== undefined ? (
          <Txt variant="small" tone="soft" snug>
            {hint}
          </Txt>
        ) : null}
        {/* Nothing to say yet: one empty line holds the room the words will take. */}
        {empty ? <Txt variant="small"> </Txt> : null}
      </HStack>
      {steps !== undefined ? (
        // Like the plot under them, the two never swap sides.
        <View style={styles.steps}>
          <StepButton toward="previous" label={steps.previousLabel} onPress={steps.onPrevious} />
          <StepButton toward="next" label={steps.nextLabel} onPress={steps.onNext} />
        </View>
      ) : null}
    </View>
  );
}

export type GrowBarProps = {
  // The room the bar may fill, in its parent's coordinates: from the zero
  // line to the plot's edge on the bar's side. `start` is measured from the
  // parent's inline start.
  start: number;
  top: number;
  width: number;
  height: number;
  // Which way the bar grows away from the zero line. `forward` is toward the
  // end of a row and `back` toward its start, so they mirror with the layout.
  grows: 'up' | 'down' | 'forward' | 'back';
  // How much of the room it fills, 0 to 1.
  fill: number;
  color: string;
  // The radius of the bar's far end.
  corner: number;
  // How long it waits before it grows, on arrival only (a cascade).
  delay?: number;
  // Whether it grows on arrival. Without it the bar is simply there.
  animate?: boolean;
};

// One bar, drawn from views. The bar is as big as its room and slides out
// from behind the zero line inside a window that clips it: only a transform
// moves, on the UI thread, and the round end keeps its shape at every length
// (a scale would squash it). A new value moves the bar from where it is now.
//
// It arrives on the `settle` spring. With reduced motion it is in place at
// once.
export function GrowBar({
  start,
  top,
  width,
  height,
  grows,
  fill,
  color,
  corner,
  delay = 0,
  animate = true,
}: GrowBarProps) {
  const reduced = useReducedMotion();
  const rtl = useIsRTL();
  // When this bar first asked to grow. The cascade's wait is counted from
  // here, so a second run of the effect cannot make it wait twice or not at
  // all.
  const born = useRef(0);
  const shown = useSharedValue(animate && !reduced ? 0 : fill);

  useEffect(() => {
    if (born.current === 0) born.current = Date.now();
    const wait = animate && !reduced ? delay - (Date.now() - born.current) : 0;
    const settle = withSpring(fill, spring('settle', reduced));
    shown.set(wait > 0 ? withDelay(wait, settle) : settle);
  }, [fill, delay, animate, reduced, shown]);

  const sideways = grows === 'forward' || grows === 'back';
  const length = sideways ? width : height;
  const forward = rtl ? -1 : 1;
  // Unseen, the bar sits wholly behind the zero line. This is the way there.
  const home = grows === 'up' ? 1 : grows === 'down' ? -1 : grows === 'forward' ? -forward : forward;
  const moved = useAnimatedStyle<ViewStyle>(() => {
    const offset = home * (1 - shown.get()) * length;
    return { transform: sideways ? [{ translateX: offset }] : [{ translateY: offset }] };
  });

  const end: ViewStyle =
    grows === 'up'
      ? { borderTopStartRadius: corner, borderTopEndRadius: corner }
      : grows === 'down'
        ? { borderBottomStartRadius: corner, borderBottomEndRadius: corner }
        : grows === 'forward'
          ? { borderTopEndRadius: corner, borderBottomEndRadius: corner }
          : { borderTopStartRadius: corner, borderBottomStartRadius: corner };

  return (
    <View style={[styles.barRoom, { insetInlineStart: start, top, width, height }]}>
      <Animated.View style={[styles.barFill, end, { backgroundColor: color }, moved]} />
    </View>
  );
}

// The ring round the bar being read: a 2 line of ink, 2 away from the bar.
const RING_REACH = border.strong * 2;

export type BarRingProps = {
  index: number;
  active: SharedValue<number>;
  // The bar it goes round, in the plot's coordinates.
  start: number;
  top: number;
  width: number;
  height: number;
  corner: number;
  // The bar hangs under the zero line.
  below?: boolean;
  color: string;
};

// The ring that marks the bar being read. Every bar has one and only its
// opacity changes, on the UI thread, so the ring is on the bar in the same
// frame the finger gets there.
export function BarRing({ index, active, start, top, width, height, corner, below = false, color }: BarRingProps) {
  const lit = useAnimatedStyle<ViewStyle>(() => ({ opacity: active.get() === index ? 1 : 0 }));
  const round = corner + RING_REACH;
  return (
    <Animated.View
      style={[
        styles.ring,
        {
          insetInlineStart: start - RING_REACH,
          top: top - RING_REACH,
          width: width + RING_REACH * 2,
          height: height + RING_REACH * 2,
          borderColor: color,
        },
        below
          ? { borderBottomStartRadius: round, borderBottomEndRadius: round }
          : { borderTopStartRadius: round, borderTopEndRadius: round },
        lit,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// BarChart
// ---------------------------------------------------------------------------

export type BarDatum = {
  // The bar's name: a month, a group. Shown under the bar and in the read-out.
  label: string;
  // null is "not known": the bar is left out and a dash stands in its place.
  value: number | null;
};

export type BarChartProps = {
  // The bars, in the order they are drawn, left to right.
  data: readonly BarDatum[];
  // The app's own number formatting, so the chart writes numbers the way the
  // rest of the screen does: (value) => numbers.amount(value).
  format: (value: number) => string;
  // What the whole chart says, spoken once: "Revenue for twelve months.
  // December is the highest at 712 K. The average is 390 K."
  summary: string;
  // What one bar says to a screen reader. Default: its name, then what the
  // read-out says about it.
  markLabel?: (datum: BarDatum, index: number) => string;
  // What the read-out says about a bar, after its name. Default: its
  // formatted value. Use it to add words: "712 K, the highest". It is only
  // asked about a bar whose value is known.
  detail?: (datum: BarDatum & { value: number }, index: number) => string;
  // Shown in the read-out until a bar has been touched: "Touch a bar to read
  // it."
  hint?: string;
  // Shown instead of the chart when fewer than two values are known. Without
  // it nothing is shown at all.
  emptyLabel?: string;
  // The value a dashed line is drawn at, and the words written on it
  // ("Average 390 K"). The value comes from the app: the chart does not work
  // it out.
  average?: number | null;
  averageLabel?: string;
  // The one bar painted in the chart's blue, with its value written above it.
  // Left out: the highest bar, if one bar is the highest alone. null: none.
  peakIndex?: number | null;
  // A shorter name to write under a bar ("J" for "January"). Default: the
  // bar's label. Labels that do not fit are thinned out, never squeezed.
  axisLabel?: (datum: BarDatum, index: number) => string;
  // The spoken names of the previous and next buttons, which join the
  // read-out when the bars are too narrow to aim at ("Previous bar", "Next
  // bar"). Left out, each button is named after the bar it goes to.
  previousLabel?: string;
  nextLabel?: string;
  // The height of the plot: 64, 88 or 132. Default md.
  size?: ChartSize;
  // The paper the chart is drawn on. Default surface (a card).
  paper?: ChartPaper;
  // Whether a finger can read the bars. Default true; it needs a
  // GestureHandlerRootView above it. false draws a still picture with no
  // read-out; a screen reader can still step through its bars.
  interactive?: boolean;
  // Bars grow from the baseline once, on arrival. Default true.
  animate?: boolean;
  // The numbers are on their way: an outline of the chart, the same size.
  loading?: boolean;
  // Called when another bar is read.
  onSelect?: (index: number) => void;
  // What stands for a value that is not known. Default a dash. Pass the
  // app's words ("no value") if it should be spoken as words.
  missing?: string;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// Between bars on the board. Many bars close up; see bandLayout.
const BAR_GAP = 6;
// No bar is drawn wider than a finger's target, however few there are.
const BAR_WIDEST = sizes.target;

type BandAxisProps = {
  labels: readonly string[];
  width: number;
  step: number;
  // The bar whose label is never thinned away and is written in heavy ink.
  strong: number;
};

// The names under the bars. Each is centred under its own bar; when they do
// not all fit, every second or third is shown instead, counted so that the
// peak (or else the last bar) keeps its name.
function BandAxis({ labels, width, step, strong }: BandAxisProps) {
  const { fontScale } = useWindowDimensions();
  const size = typeScale.small.size * Math.min(fontScale, MAX_FONT_SCALE);
  const widths = labels.map((label) => estimateTextWidth(label, size));
  const widest = widths.reduce((most, one) => Math.max(most, one), 0);
  const cells = axisCells(
    labels.length,
    width,
    (index) => (index + 0.5) * step,
    labelEvery(step, widest, space.sm),
    strong >= 0 ? strong : labels.length - 1,
    (index) => widths[index],
  );
  return (
    <View aria-hidden style={styles.axis}>
      {cells.length === 0 ? <Txt variant="small"> </Txt> : null}
      {cells.map((cell) => (
        <View key={cell.index} style={{ width: cell.width, paddingStart: cell.padStart, paddingEnd: cell.padEnd }}>
          <Txt
            variant="small"
            tone={cell.index === strong ? 'ink' : 'soft'}
            weight={cell.index === strong ? '600' : undefined}
            align={cell.align}
            numberOfLines={1}>
            {labels[cell.index]}
          </Txt>
        </View>
      ))}
    </View>
  );
}

// Vertical bars for one series (brand spec, section 6):
//   <BarChart
//     data={chart.bars}
//     format={(value) => numbers.amount(value)}
//     summary={t('insights.chartSummary')}
//     hint={t('insights.chartHint')}
//     average={kpis.average}
//     averageLabel={t('insights.averageLine', { value: numbers.amount(kpis.average) })}
//   />
//
// One series, so one blue: the highest bar is `chartPeak` with its value
// written above it, the others are `chartRest`. The bars grow from the
// baseline one after another, once. The whole plot is one touch surface: tap
// it, rest a finger on it or drag across it, and the read-out above says
// which bar the finger is on, a ring of ink marks that bar, and the hand
// feels one selection tap for each new bar. Each bar answers across the full
// height of the plot, in a column as wide as its share of the plot (48 or
// more for six bars; narrower bars are read by where the finger is, which
// needs no aim). When the columns are narrower than 24 the read-out also
// carries a previous and a next button.
//
// Needs AppStateProvider above it (its text reads the app language) and, when
// interactive, a GestureHandlerRootView.
export function BarChart({
  data,
  format,
  summary,
  markLabel,
  detail,
  hint,
  emptyLabel,
  average,
  averageLabel,
  peakIndex,
  axisLabel,
  previousLabel,
  nextLabel,
  size = 'md',
  paper = 'surface',
  interactive = true,
  animate = true,
  loading = false,
  onSelect,
  missing = UNKNOWN,
  style,
}: BarChartProps) {
  const { colors } = useTheme();
  const { width, onLayout } = usePlotWidth();
  const count = data.length;
  const { picked, active, choose, go } = useReading(count, onSelect);

  const height = PLOT_HEIGHT[size];
  const values = data.map((datum) => datum.value);
  const known = values.filter(isKnown);

  if (loading) {
    return (
      <Skeleton style={[styles.root, style]}>
        {interactive ? <SkeletonText lines={1} variant="small" width="44%" /> : null}
        <SkeletonChart bars={count >= 2 ? Math.min(count, 12) : 6} height={height} />
        <SkeletonText lines={1} variant="small" />
      </Skeleton>
    );
  }
  // One value has nothing to stand beside. Say so in words instead.
  if (known.length < 2) return <ChartEmpty label={emptyLabel} style={style} />;

  // Bars are read by their length, so the scale always holds zero. The
  // average is part of the picture, so the scale holds it too.
  const span = withZero(extent(isKnown(average) ? [...known, average] : known) ?? [0, 0]);
  const y = linearScale(span[0] === span[1] ? [0, 1] : span, [height, 0]);
  const zero = y(0);
  const bands = bandLayout(count, width, BAR_GAP, BAR_WIDEST);
  const corner = Math.min(BAR_CORNER, bands.band / 2);

  const sole = maxIndex(values, true);
  const peak =
    peakIndex === undefined
      ? sole
      : peakIndex !== null && peakIndex >= 0 && peakIndex < count && isKnown(values[peakIndex])
        ? peakIndex
        : -1;

  const describe = (index: number): string => {
    const { label, value } = data[index];
    if (!isKnown(value)) return missing;
    return detail?.({ label, value }, index) ?? format(value);
  };
  const speak = (index: number): string => markLabel?.(data[index], index) ?? `${data[index].label}, ${describe(index)}`;

  // A drag across close-set bars would be a buzz in the hand, so it stays
  // quiet; a finger that lands on a bar is always felt.
  const dense = bands.step < TICK_MIN;
  const pick = (index: number, moving: boolean) => {
    choose(index, !(moving && dense));
  };

  // What is being read: the bar last touched, or the peak until then.
  const at = picked ?? peak;
  const touched = picked !== null;

  // Bars too narrow to aim at: the read-out carries a previous and a next
  // button. Each is named by the app, or else after the bar it goes to.
  const narrow = width > 0 && bands.step < NARROW_COLUMN;
  const before = at < 0 ? count - 1 : at - 1;
  const after = at < 0 ? 0 : at + 1;
  const steps = narrow
    ? {
        previousLabel: previousLabel ?? speak(Math.max(0, before)),
        nextLabel: nextLabel ?? speak(Math.min(count - 1, after)),
        // The button gave its tap at contact, so the step itself is silent.
        onPrevious: before >= 0 ? () => go(before, false) : undefined,
        onNext: after <= count - 1 ? () => go(after, false) : undefined,
      }
    : undefined;

  const marks =
    width > 0 ? (
      <View aria-hidden style={styles.layer}>
        {data.map((datum, index) => {
          const value = datum.value;
          if (!isKnown(value)) {
            // Not known: a short dash on the baseline, never an empty slot
            // that reads as zero.
            const dash = Math.min(bands.band, space.md);
            return (
              <View
                key={index}
                style={[
                  styles.unknown,
                  {
                    insetInlineStart: bandCenter(bands, index) - dash / 2,
                    top: zero - space.sm,
                    width: dash,
                    backgroundColor: colors.chartRest,
                  },
                ]}
              />
            );
          }
          const below = value < 0;
          const room = below ? height - zero : zero;
          const reach = value === 0 ? 0 : Math.max(Math.abs(y(value) - zero), MARK_MIN);
          return (
            <GrowBar
              key={index}
              start={bandStart(bands, index)}
              top={below ? zero : 0}
              width={bands.band}
              height={room}
              grows={below ? 'down' : 'up'}
              fill={room > 0 ? Math.min(1, reach / room) : 0}
              color={index === peak ? colors.chartPeak : colors.chartRest}
              corner={corner}
              delay={cascadeDelay(index, count, stagger, cascadeMax)}
              animate={animate}
            />
          );
        })}
        <View style={[styles.baseline, { top: zero, backgroundColor: colors.line }]} />
        {isKnown(average) ? (
          <AverageRule
            y={y(average)}
            width={width}
            height={height + border.hairline}
            label={averageLabel}
            paper={paper}
          />
        ) : null}
        {data.map((datum, index) => {
          const value = datum.value;
          // A bar with no length (zero, or not known) is ringed where it
          // stands on the baseline.
          const reach = isKnown(value) && value !== 0 ? Math.max(Math.abs(y(value) - zero), MARK_MIN) : space.sm;
          const below = isKnown(value) && value < 0;
          return (
            <BarRing
              key={index}
              index={index}
              active={active}
              start={bandStart(bands, index)}
              top={below ? zero : zero - reach}
              width={bands.band}
              height={reach}
              corner={corner}
              below={below}
              color={colors.ink}
            />
          );
        })}
      </View>
    ) : null;

  return (
    <View style={[styles.root, style]}>
      {interactive ? (
        <ReadOut
          name={at >= 0 ? data[at].label : undefined}
          detail={at >= 0 ? describe(at) : undefined}
          hint={touched ? undefined : hint}
          steps={steps}
        />
      ) : null}
      {peak >= 0 ? (
        <PinnedLabel at={(peak + 0.5) / count}>
          <ChartValue text={format(values[peak] as number)} variant="label" strong />
        </PinnedLabel>
      ) : null}
      <PlotSurface
        summary={summary}
        count={count}
        current={at}
        spoken={at >= 0 ? speak(at) : undefined}
        onStep={go}
        // One hairline taller than its bars: the baseline's own room.
        height={height + border.hairline}
        scrub={interactive ? { step: bands.step, snap: 'band', active, onPick: pick } : undefined}
        onLayout={onLayout}>
        {marks}
      </PlotSurface>
      <BandAxis
        labels={data.map((datum, index) => axisLabel?.(datum, index) ?? datum.label)}
        width={width}
        step={bands.step}
        strong={peak}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The board's chart leaves 2 between its lines; 4 is the nearest step of
  // the spacing scale, and it is the room the reading ring needs above the
  // tallest bar.
  root: { gap: space.xs },
  // A plot never mirrors: the time axis of a chart runs left to right in
  // every language. Inside it, the inline start is the left edge. The
  // browser's own focus outline is switched off (a solid line of no width):
  // the ring is drawn from the tokens.
  plot: { ...keepLeftToRight, outlineStyle: 'solid', outlineWidth: 0 },
  // In the browser a mouse shows that the plot can be pressed.
  live: { cursor: 'pointer' },
  // The drawing. It is silent and never takes a touch.
  layer: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  summary: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  baseline: { position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, height: border.hairline },
  unknown: { position: 'absolute', height: border.strong, borderRadius: border.strong / 2 },
  ring: { position: 'absolute', borderWidth: border.strong },
  // A bar's window: the bar slides inside it and is cut at the zero line.
  barRoom: { position: 'absolute', overflow: 'hidden' },
  barFill: { ...StyleSheet.absoluteFill },
  rule: { position: 'absolute', insetInlineStart: 0 },
  ruleLabel: { position: 'absolute', insetInlineStart: 0, maxWidth: '100%', paddingEnd: space.sm },
  // The label lays itself out at the left edge and is moved from there.
  pin: { flexDirection: 'row', ...keepLeftToRight },
  pinned: { flexShrink: 1 },
  axis: { flexDirection: 'row', ...keepLeftToRight },
  ends: { flexDirection: 'row', gap: space.md, ...keepLeftToRight },
  readOut: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  steps: { flexDirection: 'row', ...keepLeftToRight },
  stepButton: {
    width: sizes.target,
    height: sizes.target,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  // The chevron, turned to point the other way.
  turned: { transform: [{ scaleX: -1 }] },
  // Takes the room that is left, so long words wrap or are cut inside it.
  grow: { flex: 1 },
  shrink: { flexShrink: 1 },
});
