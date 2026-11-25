import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type CSSAnimationProperties,
} from 'react-native-reanimated';

import {
  border,
  duration,
  radius,
  sizes,
  space,
  spring,
  transition,
  useIsRTL,
  useReducedMotion,
  useTheme,
} from '@/theme';
import { select } from '@/ui/haptics';
import { Press, type PressProps } from '@/ui/press';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

export type SwitchSize = 'sm' | 'md' | 'lg';

// Everything Press takes passes through (onLongPress, hitSlop, testID, the
// accessibility props), except onPress: a switch has one action, onChange.
export type SwitchProps = Omit<PressProps, 'children' | 'style' | 'weight' | 'feedback' | 'haptic' | 'onPress'> & {
  // Whether it is on. The switch never changes by itself: hand the new state
  // back in here.
  checked: boolean;
  // Called on release with the state the switch should move to.
  onChange: (checked: boolean) => void;
  // The words beside the switch, already in the app's language. With words,
  // the whole row is the switch: it can be pressed anywhere along it and a
  // screen reader reads the words as its name. `label` wins over `children`.
  // Without words it is the bare switch and needs accessibilityLabel.
  label?: string;
  // How the row is set, when there are words. sm puts them in small type; lg
  // is 56 high, to stand in a list of rows. The switch itself is drawn at one
  // size. Default md.
  size?: SwitchSize;
  // The change is being saved. The thumb shows the working mark, the switch
  // keeps its size and its place, it cannot be pressed again, and a screen
  // reader hears that it is busy.
  busy?: boolean;
  // Cannot be used: plain paper and faint ink, never a faded blue.
  disabled?: boolean;
  // Layout only (flex, alignSelf, a padding). Merged last.
  style?: StyleProp<ViewStyle>;
  // The words, in place of `label`: <Switch checked={on} onChange={setOn}>{t('more.haptics')}</Switch>
  // Anything that is not plain words (a title over a line of detail) is laid
  // out as given, at the start of the row.
  children?: ReactNode;
};

// --- The drawing -----------------------------------------------------------------

// The switch is drawn in this file alone. The brand spec draws no switch, so
// it is cut from the same cloth as the 22 radio of section 6: a pill with a
// 1.5 inkFaint edge while it is off, filled with the action blue once it is
// on.
const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
// The thumb when on, and the smaller size it rests at when off: on is told by
// place, by fill and by size together, never by colour alone.
const THUMB = 24;
const THUMB_OFF = 20;
const THUMB_INSET = (TRACK_HEIGHT - THUMB) / 2;
// How far the thumb travels from off to on.
const TRAVEL = TRACK_WIDTH - THUMB - THUMB_INSET * 2;
const OFF_SCALE = THUMB_OFF / THUMB;

// --- The working mark --------------------------------------------------------------

// The library's working mark (the three dots of a busy button, WorkingDots in
// button.tsx), drawn small enough to sit inside the thumb and on the same
// beat: one dot starts a quick step after the one before it, and a whole
// round takes three sweeps. Opacity only: nothing moves. The sizes are this
// mark's own geometry, like the coordinates of an icon.
const DOT = 4;
const DOT_GAP = 2;
// How faint a dot is while it waits its turn.
const DOT_REST = 0.32;
const DOT_TURN = duration.quick;
const DOT_ROUND = duration.sweep * 3;
const DOT_ORDER = [0, 1, 2] as const;
const DOT_PULSE = {
  '0%': { opacity: DOT_REST },
  '25%': { opacity: 1 },
  '50%': { opacity: DOT_REST },
  '100%': { opacity: DOT_REST },
};
// Built once: one loop for each dot, each a turn later than the one before.
const DOT_LOOPS: readonly CSSAnimationProperties<ViewStyle>[] = DOT_ORDER.map(
  (turn): CSSAnimationProperties<ViewStyle> => ({
    animationName: DOT_PULSE,
    animationDuration: DOT_ROUND,
    animationDelay: DOT_TURN * turn,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  }),
);

// True when the words are nothing but words: a string, a number, or a list of
// them. Then they are set as the row's label. Anything else is laid out as it
// comes.
function isPlainText(node: ReactNode): boolean {
  if (typeof node === 'string' || typeof node === 'number') return true;
  if (!Array.isArray(node)) return false;
  return (node as readonly unknown[]).every(
    (part) =>
      part === null ||
      part === undefined ||
      typeof part === 'boolean' ||
      typeof part === 'string' ||
      typeof part === 'number',
  );
}

// The track and its thumb. Off: a sunk well with a faint-ink edge and a
// faint-ink thumb. On: the action blue with a white thumb. Disabled: plain
// paper and faint ink for both, and only the thumb's place and size still say
// which it is.
function SwitchMark({ checked, disabled, working }: { checked: boolean; disabled: boolean; working: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const rtl = useIsRTL();
  // 0 is off and 1 is on. The thumb reads its place and its size from this on
  // the UI thread, so a second press mid-way turns it round from where it is.
  const on = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    // A finger asked for this, so it settles on a spring (the settle spring
    // does not overshoot). With reduced motion the thumb is simply there.
    on.set(withSpring(checked ? 1 : 0, spring('settle', reduced)));
  }, [checked, on, reduced]);

  // On is the far end in reading order: the right in English, the left in
  // Hebrew.
  const side = rtl ? -1 : 1;
  const thumbMotion = useAnimatedStyle<ViewStyle>(() => {
    const at = on.get();
    return { transform: [{ translateX: TRAVEL * side * at }, { scale: OFF_SCALE + (1 - OFF_SCALE) * at }] };
  });

  const well = disabled ? colors.disabledFill : checked ? colors.action : colors.surfaceSunk;
  const edge = disabled ? colors.disabledInk : checked ? colors.action : colors.inkFaint;
  const thumb = disabled ? colors.disabledInk : checked ? colors.onAction : colors.inkFaint;
  // The colours ease between off and on, and keep easing when the phone asks
  // for less motion: a colour explains the change without moving anything.
  const wellEase = transition(['backgroundColor', 'borderColor'], duration.quick, 'standard', reduced);
  const thumbEase = transition(['backgroundColor'], duration.quick, 'standard', reduced);

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.well, { backgroundColor: well, borderColor: edge }, wellEase]} />
      {/* The mover carries the place and the size; the disc inside it carries the colour. */}
      <Animated.View style={[styles.thumb, thumbMotion]}>
        <Animated.View style={[styles.disc, { backgroundColor: thumb }, thumbEase]}>
          {working ? (
            <View style={styles.dots}>
              {DOT_ORDER.map((turn) => (
                <Animated.View
                  key={turn}
                  style={[
                    styles.dot,
                    // In the colour of the well, so the dots read as cut out of the thumb.
                    { backgroundColor: well },
                    // With reduced motion the loop stops and the three dots stand still.
                    reduced ? null : styles.dotWaiting,
                    reduced ? null : DOT_LOOPS[turn],
                  ]}
                />
              ))}
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// --- The switch ------------------------------------------------------------------

// A switch, for something that is on or off the moment it is pressed:
//   <Switch checked={haptics} onChange={setHaptics}>{t('more.haptics')}</Switch>
//   <Switch checked={on} onChange={setOn} busy={saving} label={t('more.useAI')} />
//   <Switch checked={on} onChange={setOn} accessibilityLabel={t('more.haptics')} />
//
// It answers at contact and changes on release (Press). The thumb crosses on
// the settle spring while the fill eases to the action blue, with one
// selection tap in the hand. In right-to-left languages on is at the left.
// With reduced motion the thumb is in place at once and only the colour
// eases. To a screen reader it is a switch that is on or off, and busy while
// it works.
export function Switch({
  checked,
  onChange,
  label,
  size = 'md',
  busy = false,
  disabled = false,
  accessibilityHint,
  style,
  children,
  ...rest
}: SwitchProps) {
  const { colors } = useTheme();
  const strings = useUIStrings();

  // Disabled wins: a switch that cannot be used is not shown as working.
  const working = busy && !disabled;
  const words: ReactNode = label ?? children;
  const hasWords = words !== undefined && words !== null && typeof words !== 'boolean';

  const toggle = () => {
    // One selection tap, in the same frame as the thumb setting off.
    select();
    onChange(!checked);
  };

  return (
    <Press
      {...rest}
      accessibilityRole="switch"
      aria-checked={checked}
      aria-busy={working}
      // A working switch says so; otherwise the caller's own hint.
      accessibilityHint={working ? strings.loading : accessibilityHint}
      disabled={disabled || busy}
      // A full-width row tints under the finger; the bare switch shrinks a little.
      weight={hasWords ? 'lg' : 'sm'}
      feedback={hasWords ? 'highlight' : 'scale'}
      onPress={toggle}
      style={[hasWords ? styles.row : styles.bare, hasWords && size === 'lg' && styles.rowTall, style]}>
      {!hasWords ? null : isPlainText(words) ? (
        <Txt
          variant={size === 'sm' ? 'small' : 'label'}
          weight="600"
          color={disabled ? colors.disabledInk : undefined}
          selectable={false}
          style={styles.words}>
          {words}
        </Txt>
      ) : (
        <View style={styles.words}>{words}</View>
      )}
      <SwitchMark checked={checked} disabled={disabled} working={working} />
    </Press>
  );
}

const styles = StyleSheet.create({
  // The bare switch: as wide as its drawing and a full 48 high, so the target
  // is real and does not lean on hitSlop. The corners are for the focus ring.
  bare: {
    width: TRACK_WIDTH,
    minHeight: sizes.target,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
  },
  // The row: words at the start, the switch at the end (it mirrors by itself
  // in right-to-left languages). The shape of an option row on the brand
  // board. No fixed height: it grows with its words.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: sizes.target,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.control,
  },
  rowTall: { minHeight: sizes.row },
  // Takes the room that is left, so long words wrap inside it.
  words: { flex: 1 },
  // Holds a drawing, never text, so it may have a fixed size.
  track: { width: TRACK_WIDTH, height: TRACK_HEIGHT },
  // The fill and its edge are a layer of their own, so the thumb is placed
  // from the track's outer edge on every platform.
  well: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, borderWidth: border.control },
  thumb: { position: 'absolute', top: THUMB_INSET, insetInlineStart: THUMB_INSET, width: THUMB, height: THUMB },
  disc: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: DOT_GAP },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
  dotWaiting: { opacity: DOT_REST },
});
