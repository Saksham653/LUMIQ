import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import {
  border,
  radius,
  sizes,
  space,
  spring,
  useIsRTL,
  useReducedMotion,
  useTheme,
  type TypeVariant,
} from '@/theme';
import { select } from '@/ui/haptics';
import { Press } from '@/ui/press';
import { Txt } from '@/ui/text';

export type SegmentedSize = 'sm' | 'md' | 'lg';
// radiogroup  it picks a value (a setting): each segment is a radio that is
//             checked or not.
// tablist     it switches what is shown under it: each segment is a tab that
//             is selected or not.
export type SegmentedRole = 'radiogroup' | 'tablist';

export type SegmentedOption<T extends string = string> = {
  value: T;
  // The words on the segment, already in the app's language. A word or two:
  // a segment is as wide as its words need, and longer words wrap.
  label: string;
  // What a screen reader says, when the label is a short form ("1W").
  accessibilityLabel?: string;
  // This one choice cannot be made now: faint ink, and it takes no press.
  disabled?: boolean;
};

export type SegmentedProps<T extends string = string> = {
  // Two to four choices, in reading order.
  options: readonly SegmentedOption<T>[];
  // The chosen value. A segmented control always has one.
  value: T;
  // Called on release when another segment is chosen. Pressing the chosen one
  // changes nothing and calls nothing.
  onChange: (value: T) => void;
  // What it is to a screen reader. Default radiogroup.
  role?: SegmentedRole;
  // sm is drawn 44 high in small type, for four choices or a narrow place, and
  // still takes a 48 touch. md is 48. lg is 52, to stand beside a field or a
  // main button. Default md. Every size grows with its text.
  size?: SegmentedSize;
  // Switches the whole control off: plain paper and faint ink. The chosen
  // segment keeps a ring of faint ink, so it is still told by form.
  disabled?: boolean;
  // What is being chosen ("Theme"), in the app's language.
  accessibilityLabel?: string;
  testID?: string;
  // Layout only. Merged last. It takes the width its parent gives it: the
  // full width in a column, where the segments share what their words leave
  // over; in a row it is as wide as its words, and never wider than the row.
  style?: StyleProp<ViewStyle>;
};

// What a size is made of.
type Shape = { minHeight: number; pad: number; text: TypeVariant };
// 44 belongs to this component: it matches the small button, and Press pads
// the target back to 48.
const SMALL_HEIGHT = 44;
const SHAPE: Record<SegmentedSize, Shape> = {
  sm: { minHeight: SMALL_HEIGHT, pad: space.md, text: 'small' },
  // The board's control: 48 high, 16 at the two ends, label type.
  md: { minHeight: sizes.target, pad: space.lg, text: 'label' },
  lg: { minHeight: sizes.control, pad: space.xl, text: 'label' },
};
// The least a segment is wide, from the brand board (its .seg control, and the
// 68 of the language control in brand spec section 6). The small size, and
// four segments together, go down to the 48 of a target, so that four still
// fit inside a narrow card.
const SEGMENT_MIN_WIDTH = 68;
const MOST_AT_FULL_WIDTH = 3;

const UNMEASURED: readonly number[] = [];

// The pill. One pill for the whole control: it slides from the segment that
// was chosen to the one that is, and takes that segment's width on the way,
// both on the settle spring and both on the UI thread.
//
// It is drawn in two layers over the segments:
// - the fill, a view with no children, placed from the reading edge. It moves
//   by translate; its width is the one layout value this control animates,
//   which is allowed for exactly this: an absolutely placed view with nothing
//   inside it, so nothing else is laid out again.
// - a second copy of every label in the pill's own ink, seen through a window
//   that is always exactly where the fill is. So the labels stand still and
//   each letter is white exactly where the blue is under it, at every frame of
//   the slide. The window is cut by two clips moved by translate only: one
//   holds its leading edge, the other its trailing edge, and the copy inside
//   is moved back by the same amounts.
function SlidingPill({
  index,
  offset,
  width,
  reach,
  fill,
  edge,
  children,
}: {
  // Which segment is chosen.
  index: number;
  // How far that segment starts from the reading edge of the track.
  offset: number;
  // That segment's width.
  width: number;
  // The width of all the segments together.
  reach: number;
  fill: string;
  // A ring round the pill, for the control that is switched off.
  edge: string | undefined;
  // The labels in the pill's ink, laid out exactly as the segments are.
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const rtl = useIsRTL();
  // Born in the right place and at the right size: nothing slides in when the
  // control first shows.
  const x = useSharedValue(offset);
  const w = useSharedValue(width);
  const last = useRef({ index, offset, width });

  useEffect(() => {
    const from = last.current;
    last.current = { index, offset, width };
    if (from.offset === offset && from.width === width) return;
    if (from.index === index) {
      // The same choice in a new layout (a turned phone, bigger text, another
      // language): be there at once.
      x.set(offset);
      w.set(width);
      return;
    }
    // Another choice: go to it on the settle spring, from wherever the pill
    // is now, so a second press mid-way turns it round. With reduced motion
    // it is simply there.
    const settle = spring('settle', reduced);
    x.set(withSpring(offset, settle));
    w.set(withSpring(width, settle));
  }, [index, offset, width, reduced, x, w]);

  // The track starts at the right in right-to-left languages, so everything
  // travels the other way.
  const side = rtl ? -1 : 1;
  const body = useAnimatedStyle<ViewStyle>(() => ({
    width: w.get(),
    transform: [{ translateX: side * x.get() }],
  }));
  // The first clip starts where the pill starts.
  const lead = useAnimatedStyle<ViewStyle>(() => ({ transform: [{ translateX: side * x.get() }] }));
  // The second clip, inside the first, ends where the pill ends.
  const tail = useAnimatedStyle<ViewStyle>(() => ({ transform: [{ translateX: side * (w.get() - reach) }] }));
  // The labels inside them are moved back to where the segments are.
  const hold = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ translateX: side * (reach - x.get() - w.get()) }],
  }));

  return (
    <>
      <Animated.View
        aria-hidden
        style={[
          styles.fill,
          { backgroundColor: fill },
          edge === undefined ? null : { borderWidth: border.control, borderColor: edge },
          body,
        ]}
      />
      {/* Decoration to a screen reader: the segments underneath speak. */}
      <View aria-hidden collapsable={false} style={styles.stage}>
        <Animated.View style={[styles.clip, { width: reach }, lead]}>
          <Animated.View style={[styles.clip, { width: reach }, tail]}>
            <Animated.View style={[styles.window, { width: reach }, hold]}>{children}</Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    </>
  );
}

// A few choices side by side, one of them chosen:
//   <Segmented value={mode} onChange={setThemeMode} options={modes} accessibilityLabel={t('more.theme')} />
//   <Segmented role="tablist" value={view} onChange={setView} options={views} />
//
// The chosen segment is filled with the action blue and labelled in white;
// the others are labelled in soft ink on the sunk track: a different form,
// not only a different colour. One pill slides between the segments on the
// settle spring, with one selection tap in the hand when the choice changes.
// Each segment is as wide as its words need (never under 68, or 48 at size sm
// and when there are four), they share whatever width is left over, and they
// are measured as laid out, so the pill always fits the one it is on. Words
// that do not fit wrap, and the track grows. It mirrors in right-to-left
// languages. With reduced motion the pill is in place at once.
export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  role = 'radiogroup',
  size = 'md',
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: SegmentedProps<T>) {
  const { colors } = useTheme();
  // The width of each segment, as laid out.
  const [widths, setWidths] = useState<readonly number[]>(UNMEASURED);

  const shape = SHAPE[size];
  const tabs = role === 'tablist';
  const chosen = options.findIndex((option) => option.value === value);
  const least = size === 'sm' || options.length > MOST_AT_FULL_WIDTH ? sizes.target : SEGMENT_MIN_WIDTH;

  // Where the chosen segment starts and how wide they all are together, by
  // adding up the widths before it. Counted from the reading edge, so the
  // same sums hold in right-to-left languages.
  let offset = 0;
  let reach = 0;
  let measured = true;
  for (let at = 0; at < options.length; at += 1) {
    const width = widths[at] ?? 0;
    if (width <= 0) measured = false;
    if (at < chosen) offset += width;
    reach += width;
  }
  const slides = measured && chosen >= 0;

  const measure = (at: number, width: number) => {
    setWidths((now) => {
      if (now[at] === width) return now;
      const next = now.slice();
      next[at] = width;
      return next;
    });
  };

  // Disabled is plain paper and faint ink. The chosen segment keeps a ring.
  const track = disabled ? colors.disabledFill : colors.surfaceSunk;
  const restInk = disabled ? colors.disabledInk : colors.inkSoft;
  const pillFill = disabled ? colors.disabledFill : colors.action;
  const pillInk = disabled ? colors.disabledInk : colors.onAction;
  const pillEdge = disabled ? colors.disabledInk : undefined;

  return (
    <View
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.track, { backgroundColor: track }, style]}>
      {/* A row of its own, so a padding the caller adds can never push the pill off its segment. */}
      <View style={styles.row}>
        {options.map((option, at) => {
          const selected = at === chosen;
          const off = disabled || option.disabled === true;
          // Until every segment is measured the chosen one paints its own
          // pill, so the very first frame is already right.
          const ownPill = selected && !slides;
          return (
            <Press
              key={option.value}
              accessibilityRole={tabs ? 'tab' : 'radio'}
              accessibilityLabel={option.accessibilityLabel}
              aria-selected={tabs ? selected : undefined}
              aria-checked={tabs ? undefined : selected}
              disabled={off}
              // A segment tints under the finger. Under the chosen one the
              // tint is hidden by the pill: pressing it changes nothing.
              feedback="highlight"
              weight="sm"
              onPress={() => {
                if (selected) return;
                // One selection tap, in the same frame as the pill setting off.
                select();
                onChange(option.value);
              }}
              onLayout={(event) => measure(at, event.nativeEvent.layout.width)}
              style={[
                styles.segment,
                { minHeight: shape.minHeight, minWidth: least, paddingHorizontal: shape.pad },
                ownPill && { backgroundColor: pillFill },
              ]}>
              {ownPill && pillEdge !== undefined ? <View style={[styles.ring, { borderColor: pillEdge }]} /> : null}
              <Txt
                variant={shape.text}
                weight="600"
                align="center"
                color={ownPill ? pillInk : off ? colors.disabledInk : restInk}
                snug
                selectable={false}
                style={styles.label}>
                {option.label}
              </Txt>
            </Press>
          );
        })}
        {slides ? (
          <SlidingPill
            index={chosen}
            offset={offset}
            width={widths[chosen]}
            reach={reach}
            fill={pillFill}
            edge={pillEdge}>
            {options.map((option, at) => (
              <View key={option.value} style={[styles.cell, { width: widths[at], paddingHorizontal: shape.pad }]}>
                <Txt
                  variant={shape.text}
                  weight="600"
                  align="center"
                  color={pillInk}
                  snug
                  selectable={false}
                  style={styles.label}>
                  {option.label}
                </Txt>
              </View>
            ))}
          </SlidingPill>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The sunk track, a full pill. Its colour is added at render. Sized by its
  // words in a row, it still never outgrows the row.
  track: { borderRadius: radius.pill, maxWidth: '100%' },
  row: { flexGrow: 1, flexDirection: 'row', alignItems: 'stretch' },
  // A segment starts from the width of its own words and takes an equal part
  // of what is left over; when there is too little, it gives way and its
  // words wrap. No fixed height: it grows with its words. The corners are the
  // pill's, so the pressed tint and the focus ring follow them.
  segment: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    justifyContent: 'center',
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  // The words are given the segment's whole width, so centring them is safe.
  label: { alignSelf: 'stretch' },
  // The fill: over the segments, from the reading edge, as tall as the track.
  // Its width comes from the pill's animated style. It never takes a touch:
  // the segment underneath does.
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    insetInlineStart: 0,
    borderRadius: radius.pill,
    pointerEvents: 'none',
  },
  // Holds the two clips, so the parts of them that reach past the track are
  // cut off here and never widen anything around the control.
  stage: { ...StyleSheet.absoluteFill, overflow: 'hidden', pointerEvents: 'none' },
  // As wide as all the segments together, with the pill's corners.
  clip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    insetInlineStart: 0,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  // The copy of the labels: a row laid out exactly as the segments are.
  window: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    insetInlineStart: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: { justifyContent: 'center', paddingVertical: space.xs },
  // The ring that still marks the chosen segment of a control that is
  // switched off, before the pill is measured. A layer of its own, so it
  // takes no room from the words.
  ring: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, borderWidth: border.control, pointerEvents: 'none' },
});
