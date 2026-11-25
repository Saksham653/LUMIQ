import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { border, duration, radius, rhythm, space, transition, useReducedMotion, useTheme } from '@/theme';
import { Press, type PressProps } from '@/ui/press';

// Three papers. They are told apart by their step in surface and never by a
// shadow: a card does not float (brand spec, sections 6 and 12).
//   raised  the lighter paper (`surface`) with a 1 `line` edge. The card of
//           the brand, and the default: one step above the ground.
//   flat    no paper of its own, only the 1 `line` edge. Level with whatever
//           is behind it: a quiet group on the ground, a card inside a card.
//   sunk    a well (`surfaceSunk`, no edge, the smaller 14 corner): the block
//           inside a card that holds how a number was worked out, a preview,
//           a stage.
export type CardVariant = 'raised' | 'flat' | 'sunk';

// How much room the card leaves round its content: sm 12 (wells and tight
// cards), md 16 (the brand's card), lg 24 (a card that stands alone).
export type CardSize = 'sm' | 'md' | 'lg';

// Everything a View takes passes through (testID, onLayout, the accessibility
// props), and so do the few press props below.
export type CardProps = Omit<ViewProps, 'style' | 'children'> &
  Pick<PressProps, 'onPress' | 'onLongPress' | 'delayLongPress' | 'disabled' | 'haptic' | 'unstable_pressDelay'> & {
    variant?: CardVariant;
    size?: CardSize;
    // No padding at all: the content runs to the card's edge (two cells with
    // a divider between them, a chart, a picture). Content is not clipped to
    // the corners; pass `overflow: 'hidden'` in style when it must be.
    flush?: boolean;
    // Layout only (flex, a width, a gap between the children). Merged last.
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  };

const PADDING: Record<CardSize, number> = {
  sm: space.md,
  md: rhythm.cardPadding,
  lg: space.xxl,
};

// A surface that holds one piece of content:
//   <Card>
//     <Txt variant="heading">{title}</Txt>
//     <Txt tone="soft">{body}</Txt>
//   </Card>
//   <Card variant="sunk" size="sm">{howItWasWorkedOut}</Card>
//   <Card onPress={open} accessibilityLabel={name}>{preview}</Card>
//
// Its children stack in a column. Space them with `gap` in style or with a
// VStack inside; the card never sets a margin of its own.
//
// With onPress (or onLongPress) the card is built on Press, weight lg. Under
// a finger it shrinks a little and its paper turns to the pressed paper
// (brand spec, section 3: a held card shows `surfacePressed`); on release it
// springs back and the action fires. With reduced motion nothing shrinks and
// the pressed paper is the whole sign of a press (section 8). It is a button
// to a screen reader and it shows the focus ring. Without onPress it is a
// plain view and says nothing by itself.
//
// disabled (the pressable card only): the card turns to plain paper
// (`disabledFill`) and does not move. Its words are yours: write the title in
// `disabledInk` and keep the line that says why in soft ink, so the reason
// can still be read.
//
// A pressable card with another pressable thing inside it (a small button):
// the inner one takes the touch, but on iOS the card hides it from a screen
// reader. Pass `accessible={false}` and label each part, or offer the inner
// action through `accessibilityActions`.
export function Card({
  variant = 'raised',
  size = 'md',
  flush = false,
  onPress,
  onLongPress,
  delayLongPress,
  disabled = false,
  haptic,
  unstable_pressDelay,
  style,
  children,
  ...rest
}: CardProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pressable = onPress !== undefined || onLongPress !== undefined;
  const off = pressable && disabled;
  const well = variant === 'sunk';

  let paper: string | undefined;
  if (off) paper = colors.disabledFill;
  else if (variant === 'raised') paper = colors.surface;
  else if (well) paper = colors.surfaceSunk;

  const look: StyleProp<ViewStyle> = [
    well ? styles.well : [styles.card, { borderColor: colors.line }],
    { padding: flush ? 0 : PADDING[size], backgroundColor: paper },
    style,
  ];

  if (!pressable) {
    return (
      <View {...rest} style={look}>
        {children}
      </View>
    );
  }

  return (
    <Press
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      unstable_pressDelay={unstable_pressDelay}
      haptic={haptic}
      disabled={disabled}
      weight="lg"
      // Press brings the scale. The held paper is drawn below, so with
      // reduced motion Press is asked for nothing and the paper says it all.
      feedback={reduced ? 'none' : 'scale'}
      style={look}>
      {({ pressed }) => (
        <>
          {/* The pressed paper, under the content: in at the speed of the
              press, out at the speed of a small change. Opacity only, so it
              stays when the phone asks for less motion. */}
          <Animated.View
            style={[
              well ? styles.heldWell : styles.heldCard,
              { backgroundColor: colors.surfacePressed, opacity: pressed ? 1 : 0 },
              transition(['opacity'], pressed ? duration.pressIn : duration.quick, 'standard', reduced),
            ]}
          />
          {children}
        </>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  // The edge is part of the card's shape; its colour is added at render.
  card: { borderRadius: radius.card, borderWidth: border.hairline },
  // A well has no edge: its sunk paper is what marks it.
  well: { borderRadius: radius.control },
  // The pressed paper fills the card inside its edge, so its corner is the
  // card's corner less the edge. It never takes a touch.
  heldCard: { ...StyleSheet.absoluteFill, borderRadius: radius.card - border.hairline, pointerEvents: 'none' },
  heldWell: { ...StyleSheet.absoluteFill, borderRadius: radius.control, pointerEvents: 'none' },
});
