import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { border, duration, radius, sizes, space, transition, useReducedMotion, useTheme, type Space } from '@/theme';
import { select } from '@/ui/haptics';
import { Press, type PressProps } from '@/ui/press';
import { Txt } from '@/ui/text';

// Room at the two ends of a chip (brand spec, section 6). It is not a step of
// the spacing scale, so it lives here.
const CHIP_PADDING = 18;
// Room above and below the chips of a scrolling group for the keyboard focus
// ring (3 wide, 3 away), which the scroller would otherwise cut off.
const RING_ROOM = border.focus * 2;

// What a group tells the chips inside it.
type Group = {
  isSelected: (value: string) => boolean;
  toggle: (value: string) => void;
  disabled: boolean;
};
const GroupContext = createContext<Group | null>(null);

// Everything Press takes passes through (onPress, onLongPress, hitSlop,
// testID, the accessibility props).
export type ChipProps = Omit<PressProps, 'children' | 'style' | 'weight' | 'feedback' | 'haptic'> & {
  // The words, already in the app's language. `label` wins over `children`.
  label?: string;
  // Chosen or not, for a chip that stands by itself and is switched with
  // onPress. Leave it out for a chip that only does something (a suggested
  // question): then it has no chosen state at all. Inside a ChipGroup the
  // group decides and this is not read.
  selected?: boolean;
  // A number beside the words ("Orders 12"), written in the app's own number
  // style by the caller.
  count?: string | number;
  // Which choice this chip is, inside a ChipGroup.
  value?: string;
  // Cannot be used: plain paper and faint ink.
  disabled?: boolean;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
  // The words, in place of `label`: <Chip value="orders">{t('column.orders')}</Chip>
  children?: ReactNode;
};

// One choice, as a pill:
//   <Chip selected={on} onPress={() => setOn(!on)} label={t('filter.thisYear')} />
//   <Chip onPress={() => ask(question)}>{question}</Chip>
//   <Chip value="orders" count={numbers.format(12)}>{t('column.orders')}</Chip>   (inside a ChipGroup)
//
// Chosen is filled with the action blue and labelled in white; not chosen is
// paper with a faint-ink edge and a soft-ink label: a different form, not
// only a different colour. The fill eases between the two. A choice that
// changes gives one selection tap in the hand. 48 high, and it grows with its
// text.
export function Chip({
  label,
  selected,
  count,
  value,
  disabled = false,
  accessibilityLabel,
  onPress,
  style,
  children,
  ...rest
}: ChipProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const group = useContext(GroupContext);

  const chosen = group !== null && value !== undefined ? group.isSelected(value) : selected === true;
  // A chip that only does something has no chosen state to tell.
  const selectable = (group !== null && value !== undefined) || selected !== undefined;
  const off = disabled || (group !== null && value !== undefined && group.disabled);

  // Disabled is plain paper. A chosen chip that cannot be used keeps a ring of
  // faint ink, so chosen is still told by form.
  const fill = off ? colors.disabledFill : chosen ? colors.action : colors.surface;
  const edge = off ? (chosen ? colors.disabledInk : colors.disabledFill) : chosen ? colors.action : colors.inkFaint;
  const ink = off ? colors.disabledInk : chosen ? colors.onAction : colors.inkSoft;
  const countInk = off ? colors.disabledInk : chosen ? colors.onAction : colors.inkFaint;

  // Words and number are two pieces of text; said together they need a pause.
  const words = label ?? (typeof children === 'string' ? children : undefined);
  const spoken = accessibilityLabel ?? (words !== undefined && count !== undefined ? `${words}, ${count}` : undefined);

  const press: NonNullable<PressProps['onPress']> = (event) => {
    if (group !== null && value !== undefined) {
      // The group fires the haptic, and only when the choice changes.
      group.toggle(value);
    } else if (selected !== undefined) {
      // In the same frame as the change of colour the caller makes now.
      select();
    }
    onPress?.(event);
  };

  return (
    <Press
      {...rest}
      weight="sm"
      disabled={off}
      onPress={press}
      accessibilityLabel={spoken}
      aria-selected={selectable ? chosen : undefined}
      style={[styles.chip, style]}>
      <Animated.View
        style={[
          styles.body,
          { backgroundColor: fill, borderColor: edge },
          transition(['backgroundColor', 'borderColor'], duration.quick, 'standard', reduced),
        ]}>
        <Txt variant="label" color={ink} snug selectable={false} style={styles.words}>
          {label ?? children}
        </Txt>
        {count === undefined ? null : (
          <Txt variant="label" weight="500" color={countInk} snug selectable={false}>
            {count}
          </Txt>
        )}
      </Animated.View>
    </Press>
  );
}

type ChipGroupShared = {
  // Let the chips flow onto more lines instead of scrolling sideways.
  wrap?: boolean;
  // Room kept before the first chip and after the last one. For a group laid
  // across the full width of the screen: with inset="lg" its first chip lines
  // up with the rest of the screen and the others scroll out under the edge.
  inset?: Space;
  // Switches every chip of the group off.
  disabled?: boolean;
  // What is being chosen ("Column to show"), in the app's language.
  accessibilityLabel?: string;
  // Layout only. Merged last. In a row, give the group its width (flex: 1).
  style?: StyleProp<ViewStyle>;
  // The chips, each with its `value`.
  children?: ReactNode;
};

// One choice at a time. `T` is the set of values, when it is narrower than
// any string: ChipGroup<'lakh' | 'million'>.
export type ChipGroupSingleProps<T extends string = string> = ChipGroupShared & {
  multiple?: false;
  // The chosen value, or null while nothing is chosen.
  value: T | null;
  // Called when another chip is chosen. Pressing the chosen one again changes
  // nothing and calls nothing.
  onChange: (value: T) => void;
};

// Several choices at once.
export type ChipGroupMultipleProps<T extends string = string> = ChipGroupShared & {
  multiple: true;
  // Every chosen value, in the order they were chosen.
  value: readonly T[];
  // Called with the new list when a chip is switched on or off.
  onChange: (value: T[]) => void;
};

export type ChipGroupProps<T extends string = string> = ChipGroupSingleProps<T> | ChipGroupMultipleProps<T>;

// A row of chips to choose from, every choice in view rather than hidden in
// a menu:
//   <ChipGroup value={column} onChange={setColumn} accessibilityLabel={t('insights.column')}>
//     <Chip value="revenue">{t('column.revenue')}</Chip>
//     <Chip value="orders">{t('column.orders')}</Chip>
//   </ChipGroup>
//   <ChipGroup multiple wrap value={months} onChange={setMonths}> ... </ChipGroup>
//
// It scrolls sideways when the chips do not fit, and wraps with `wrap`. The
// row starts from the reading edge, so in Hebrew it starts on the right. In
// the scrolling row a chip can be pressed while the keyboard is up. Choosing
// gives one selection tap in the hand, and only when the choice changes.
//
// (Two signatures, one for each kind of choice, so the type of `value` and
// of `onChange` is worked out from the kind that was asked for.)
export function ChipGroup<T extends string = string>(props: ChipGroupSingleProps<T>): ReactElement;
export function ChipGroup<T extends string = string>(props: ChipGroupMultipleProps<T>): ReactElement;
export function ChipGroup(props: ChipGroupProps): ReactElement {
  const { wrap = false, inset, disabled = false, accessibilityLabel, style, children } = props;

  const isSelected = (candidate: string): boolean =>
    props.multiple === true ? props.value.includes(candidate) : props.value === candidate;

  const toggle = (candidate: string): void => {
    if (props.multiple === true) {
      const kept = props.value.filter((one) => one !== candidate);
      select();
      props.onChange(kept.length === props.value.length ? [...kept, candidate] : kept);
      return;
    }
    // Already chosen: nothing changes, so nothing is felt and nothing is called.
    if (props.value === candidate) return;
    select();
    props.onChange(candidate);
  };

  const edge = inset === undefined ? 0 : space[inset];
  const chips = <GroupContext.Provider value={{ isSelected, toggle, disabled }}>{children}</GroupContext.Provider>;

  if (wrap) {
    return (
      <View
        role="group"
        accessibilityLabel={accessibilityLabel}
        style={[styles.wrapped, { paddingHorizontal: edge }, style]}>
        {chips}
      </View>
    );
  }

  return (
    <View role="group" accessibilityLabel={accessibilityLabel} style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        alwaysBounceHorizontal={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroller}
        contentContainerStyle={[styles.scrolled, { paddingHorizontal: edge }]}>
        {chips}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // The pressable takes the pill's corners, so the focus ring follows them.
  // A long chip never outgrows its parent: its words wrap first.
  chip: { maxWidth: '100%', borderRadius: radius.pill },
  // The painted pill. Its colours are added at render and ease between chosen
  // and not chosen. No fixed height: it grows with its text.
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: sizes.target,
    paddingHorizontal: CHIP_PADDING,
    paddingVertical: space.xs,
    borderWidth: border.control,
    borderRadius: radius.pill,
  },
  words: { flexShrink: 1 },
  wrapped: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  // Not an outer margin: the scroller reaches past the group's own box by the
  // room its content pads back in, so the group keeps the height of its chips
  // and a focus ring is still drawn whole.
  scroller: { marginVertical: -RING_ROOM },
  scrolled: { alignItems: 'center', gap: space.sm, paddingVertical: RING_ROOM },
});
