import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { border, duration, radius, sizes, space, timing, transition, useReducedMotion, useTheme } from '@/theme';
import { select } from '@/ui/haptics';
import { Icon } from '@/ui/icon';
import { Press, type PressProps } from '@/ui/press';
import { Txt } from '@/ui/text';

export type CheckboxSize = 'sm' | 'md' | 'lg';

// Everything Press takes passes through (onLongPress, hitSlop, testID, the
// accessibility props), except onPress: a checkbox has one action, onChange.
export type CheckboxProps = Omit<PressProps, 'children' | 'style' | 'weight' | 'feedback' | 'haptic' | 'onPress'> & {
  // Whether it is ticked. The box never changes by itself: hand the new state
  // back in here.
  checked: boolean;
  // Called on release with the state the box should move to.
  onChange: (checked: boolean) => void;
  // Some, but not all, of what this box stands for is ticked (the "all
  // columns" box over a list). Drawn as a dash and spoken as mixed. Pressing
  // it ticks everything: onChange(true).
  indeterminate?: boolean;
  // The words beside the box, already in the app's language. With words, the
  // whole row is the checkbox. `label` wins over `children`. Without words it
  // is the bare box and needs accessibilityLabel.
  label?: string;
  // How the row is set, when there are words. sm puts them in small type; lg
  // is 56 high, to stand in a list of rows. The box itself is always 22.
  // Default md: at least 48 high.
  size?: CheckboxSize;
  // Cannot be used: plain paper and faint ink. A ticked box keeps its tick,
  // so it is still told by form.
  disabled?: boolean;
  // What is wrong and what to do next ("This is not ticked yet. Tick it to go
  // on."), in the app's language. It is shown under the row with the error
  // icon, and the edge of the box turns to the failure red: never colour
  // alone.
  error?: string;
  // Layout only (flex, alignSelf). Merged last.
  style?: StyleProp<ViewStyle>;
  // The words, in place of `label`: <Checkbox checked={on} onChange={setOn}>{t('report.withChart')}</Checkbox>
  // Anything that is not plain words is laid out as given, after the box.
  children?: ReactNode;
};

// --- The drawing -----------------------------------------------------------------

// The box is 22, the size of the radio in brand spec section 6, so a column
// of either lines up. A 1.5 inkFaint edge; ticked, it is filled with the
// action blue.
const BOX = 22;
// Its corners. Not a token: this radius belongs to this one component, like
// the 6 of the band under a checked number (brand spec, section 6). Any
// rounder and the box would read as a radio.
const BOX_RADIUS = 6;
const VIEW_BOX = `0 0 ${BOX} ${BOX}`;
// The marks are drawn like the icon family (brand spec, section 10): a 2
// line with round ends and round joins.
const LINE = border.strong;

// The tick is the brand's own: the tick of the checked stamp (brand spec,
// section 6: l3.5 3.5 7.3-7.8, 15.6 long), moved to the middle of the 22 box.
const TICK = 'M5.6 11.4l3.5 3.5 7.3-7.8';
// The dash of "some, not all": 9 long.
const DASH = 'M6.5 11h9';

// How a mark draws itself in. Its stroke is one dash a little longer than the
// path, followed by a gap longer still, and the dash is slid along the path:
// at 0 it covers the whole mark, and slid its own length and half a line
// more it is clear of the path altogether, round end included.
const TICK_DASH = 16;
const DASH_DASH = 9.5;
// Written as the SVG attribute: the dash, then the gap.
const TICK_DASHES = `${TICK_DASH} ${TICK_DASH + LINE}`;
const DASH_DASHES = `${DASH_DASH} ${DASH_DASH + LINE}`;
const TICK_HIDDEN = TICK_DASH + LINE / 2;
const DASH_HIDDEN = DASH_DASH + LINE / 2;

// The drawing never speaks: the checkbox around it does. The browser takes
// aria-hidden; a phone's SVG view needs the two older props.
const SILENT =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Mark = 'off' | 'on' | 'mixed';

// The drawn box. Not ticked: the edge alone. Ticked: the blue fill fades in
// and the tick strokes itself in, from its first point to its last. Some: the
// dash, the same way. Disabled: plain paper with a faint-ink edge, and the
// mark in faint ink.
function BoxMark({ mark, disabled, wrong }: { mark: Mark; disabled: boolean; wrong: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  // How much of each mark is drawn, from 0 to 1. Read on the UI thread.
  const tick = useSharedValue(mark === 'on' ? 1 : 0);
  const dash = useSharedValue(mark === 'mixed' ? 1 : 0);

  useEffect(() => {
    // A mark draws in over one quick step and leaves on the exit curve, each
    // from wherever it is now, so a second press mid-way turns it round. With
    // reduced motion a mark is simply there, or gone.
    const draw = timing(duration.quick, 'standard', reduced);
    const leave = timing(duration.exit, 'exit', reduced);
    tick.set(mark === 'on' ? withTiming(1, draw) : withTiming(0, leave));
    dash.set(mark === 'mixed' ? withTiming(1, draw) : withTiming(0, leave));
  }, [mark, reduced, tick, dash]);

  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: TICK_HIDDEN * (1 - tick.get()) }));
  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: DASH_HIDDEN * (1 - dash.get()) }));

  // Under the fill the edge takes the fill's own blue, so no other colour
  // shows at its rim.
  const edge = disabled ? colors.disabledInk : mark !== 'off' ? colors.action : wrong ? colors.bad : colors.inkFaint;
  const ink = disabled ? colors.disabledInk : colors.onAction;

  return (
    <View style={styles.box}>
      <View
        style={[styles.edge, { borderColor: edge, backgroundColor: disabled ? colors.disabledFill : undefined }]}
      />
      {/* The fill and its mark are one layer that fades over the edge. The fade stays with reduced motion. */}
      <Animated.View
        style={[
          styles.ticked,
          { backgroundColor: disabled ? undefined : colors.action, opacity: mark === 'off' ? 0 : 1 },
          transition(['opacity'], duration.quick, 'standard', reduced),
        ]}>
        <Svg width={BOX} height={BOX} viewBox={VIEW_BOX} fill="none" {...SILENT}>
          <AnimatedPath
            d={TICK}
            stroke={ink}
            strokeWidth={LINE}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={TICK_DASHES}
            animatedProps={tickProps}
          />
          <AnimatedPath
            d={DASH}
            stroke={ink}
            strokeWidth={LINE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={DASH_DASHES}
            animatedProps={dashProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// What is wrong, under the row: the error icon and words, in the failure red.
// It is read out when it appears.
function ErrorLine({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View aria-live="polite" style={styles.error}>
      <Icon name="error" size={sizes.iconSmall} color={colors.bad} />
      <Txt variant="small" tone="bad" style={styles.errorWords}>
        {children}
      </Txt>
    </View>
  );
}

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

// --- The checkbox ------------------------------------------------------------------

// A box to tick, for a yes or no that stands by itself, or for several
// choices that may all be made at once:
//   <Checkbox checked={withChart} onChange={setWithChart}>{t('report.withChart')}</Checkbox>
//   <Checkbox checked={all} indeterminate={some} onChange={pickAll} label={t('report.allColumns')} />
//   <Checkbox checked={agreed} onChange={setAgreed} error={problem} label={t('import.firstRowIsNames')} />
//
// It answers at contact and changes on release (Press). Ticking fills the
// box with the action blue while the tick strokes itself in, with one
// selection tap in the hand; unticking, the fill fades and the tick leaves on
// the exit curve. With reduced motion the tick is there at once and only the
// fill fades. To a screen reader it is a checkbox that is checked, not
// checked, or mixed. The tick never mirrors.
export function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  size = 'md',
  disabled = false,
  error,
  accessibilityHint,
  style,
  children,
  ...rest
}: CheckboxProps) {
  const { colors } = useTheme();

  const mark: Mark = indeterminate ? 'mixed' : checked ? 'on' : 'off';
  const problem = error !== undefined && error !== '' ? error : null;
  const words: ReactNode = label ?? children;
  const hasWords = words !== undefined && words !== null && typeof words !== 'boolean';

  const toggle = () => {
    // One selection tap, in the same frame as the box filling or emptying.
    select();
    // "Some" becomes "all".
    onChange(indeterminate ? true : !checked);
  };

  return (
    <View style={style}>
      <Press
        {...rest}
        accessibilityRole="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        // What is wrong is heard with the box itself, not only seen under it.
        accessibilityHint={problem ?? accessibilityHint}
        disabled={disabled}
        // A full-width row tints under the finger; the bare box shrinks a little.
        weight={hasWords ? 'lg' : 'sm'}
        feedback={hasWords ? 'highlight' : 'scale'}
        onPress={toggle}
        style={[hasWords ? styles.row : styles.bare, hasWords && size === 'lg' && styles.rowTall]}>
        <BoxMark mark={mark} disabled={disabled} wrong={problem !== null} />
        {!hasWords ? null : isPlainText(words) ? (
          <Txt
            variant={size === 'sm' ? 'small' : 'body'}
            weight={size === 'sm' ? '500' : undefined}
            color={disabled ? colors.disabledInk : undefined}
            selectable={false}
            style={styles.words}>
            {words}
          </Txt>
        ) : (
          <View style={styles.words}>{words}</View>
        )}
      </Press>
      {problem === null ? null : <ErrorLine>{problem}</ErrorLine>}
    </View>
  );
}

const styles = StyleSheet.create({
  // The bare box: a full 48 by 48 around the 22 drawing, so the target is
  // real and does not lean on hitSlop. The corners are for the focus ring.
  bare: {
    width: sizes.target,
    minHeight: sizes.target,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
  },
  // The option row of the brand board: the box, 12, the words; 4 above and
  // below and 8 at the ends inside corners of 14, where the pressed tint
  // shows. No fixed height: it grows with its words.
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
  box: { width: BOX, height: BOX },
  edge: { ...StyleSheet.absoluteFill, borderRadius: BOX_RADIUS, borderWidth: border.control },
  ticked: { ...StyleSheet.absoluteFill, borderRadius: BOX_RADIUS },
  // Lined up with the box above it.
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingTop: space.xs,
    paddingHorizontal: space.sm,
  },
  errorWords: { flex: 1 },
});
