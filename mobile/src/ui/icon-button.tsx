import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius, sizes, useTheme, type Palette } from '@/theme';
import { WorkingDots } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Press, type PressProps } from '@/ui/press';

// plain   the bare icon in ink, for the edges of a screen: back, close,
//         clear, more. An icon stands where words would, so it takes their
//         colour, not the blue.
// quiet   on the soft blue fill, like the quiet button.
// main    on the action blue: the send button. It counts as the screen's one
//         filled button.
// danger  the failure red on its soft fill: delete, remove.
export type IconButtonVariant = 'plain' | 'quiet' | 'main' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

// Everything Press takes passes through (onPress, onLongPress, hitSlop,
// testID, the accessibility props).
export type IconButtonProps = Omit<
  PressProps,
  'children' | 'style' | 'weight' | 'feedback' | 'haptic' | 'accessibilityLabel'
> & {
  // One icon of the family. Icons that point (back, chevron, send, undo)
  // mirror by themselves in right-to-left languages.
  icon: IconName;
  // What the button does, in the app's language. An icon cannot speak, so
  // this is not optional.
  accessibilityLabel: string;
  // Default plain.
  variant?: IconButtonVariant;
  // sm is drawn 44 with a 20 icon and still takes a 48 touch. md is 48, the
  // smallest thing a finger can press. lg is 52, to sit beside a field or a
  // main button. Default md.
  size?: IconButtonSize;
  // Working on what it was pressed for: the working mark takes the icon's
  // place, the button keeps its size, it cannot be pressed again, and a
  // screen reader hears that it is busy.
  busy?: boolean;
  // Cannot be used: faint ink, on plain paper where the button has a fill.
  disabled?: boolean;
  // Layout only (alignSelf, a margin). Merged last.
  style?: StyleProp<ViewStyle>;
};

// The round box (brand spec, section 6: nothing pressed is under 48, and the
// send button is 52). 44 belongs to this component: it matches the small
// button, and Press pads its target to 48.
const BOX: Record<IconButtonSize, number> = { sm: 44, md: sizes.target, lg: sizes.control };
// 24 by itself, 20 in the small box (brand spec, section 10).
const GLYPH: Record<IconButtonSize, number> = { sm: sizes.iconSmall, md: sizes.icon, lg: sizes.icon };

type Paint = {
  // The round surface. The plain button has none.
  fill: string | undefined;
  // The icon and the working mark.
  ink: string;
};

function paintOf(variant: IconButtonVariant, disabled: boolean, colors: Palette): Paint {
  if (disabled) {
    // Plain paper and faint ink. The plain button has no paper, only the ink.
    return { fill: variant === 'plain' ? undefined : colors.disabledFill, ink: colors.disabledInk };
  }
  if (variant === 'main') return { fill: colors.action, ink: colors.onAction };
  if (variant === 'quiet') return { fill: colors.actionSoft, ink: colors.onActionSoft };
  if (variant === 'danger') return { fill: colors.badSoft, ink: colors.bad };
  return { fill: undefined, ink: colors.ink };
}

// A button that is only an icon:
//   <IconButton icon="close" accessibilityLabel={strings.close} onPress={onClose} />
//   <IconButton icon="send" variant="main" size="lg" accessibilityLabel={t('ask.send')} onPress={send} />
//
// Round, never smaller to a finger than 48 by 48, and always named for a
// screen reader. It answers at contact and acts on release (Press); the main
// one gives one light tap in the hand at contact.
//
// A button with a fill shrinks a little under the finger, like every button.
// The plain one has no surface to shrink, and a small icon getting a few
// hundredths smaller cannot be seen (a line of words can, so the plain Button
// still shrinks). It gets a surface instead: a round tint fades in under the
// icon while it is held.
export function IconButton({
  icon,
  variant = 'plain',
  size = 'md',
  busy = false,
  disabled = false,
  style,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();

  // Disabled wins: a button that cannot be used is not shown as working.
  const working = busy && !disabled;
  const paint = paintOf(variant, disabled, colors);
  const box = BOX[size];

  return (
    <Press
      {...rest}
      weight="sm"
      feedback={paint.fill === undefined ? 'highlight' : 'scale'}
      haptic={variant === 'main' ? 'tap' : 'none'}
      disabled={disabled || busy}
      aria-busy={working}
      style={[styles.base, { width: box, height: box, backgroundColor: paint.fill }, style]}>
      {working ? <WorkingDots color={paint.ink} /> : <Icon name={icon} size={GLYPH[size]} color={paint.ink} />}
    </Press>
  );
}

const styles = StyleSheet.create({
  // Holds an icon, never text, so it may have a fixed size.
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
});
