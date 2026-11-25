import { lift, useTheme, type LiftLevel } from '@/theme';
import { Button, type ButtonProps } from '@/ui/button';
import type { IconName } from '@/ui/icon-set';

// How high a floating button rides. The brand gives floating buttons and
// toasts the lighter of its two shadows, `raised`; `floating` is the tab
// bar's and a sheet's (brand spec, section 6, and the note on lift()).
const LIFT: LiftLevel = 'raised';

// main   the action blue. On its screen it is the one filled button.
// quiet  the soft blue fill, for a screen that already has a main button.
export type FabVariant = 'main' | 'quiet';

// Everything a Button takes passes through (label or children, onPress, busy,
// disabled, the accessibility props), except what a floating button fixes:
// its size and where its icon sits.
export type FabProps = Omit<ButtonProps, 'variant' | 'size' | 'icon' | 'iconPosition' | 'fullWidth'> & {
  // Default main.
  variant?: FabVariant;
  // Default add.
  icon?: IconName;
};

// The floating button of a screen, an icon and its words:
//   <View style={styles.corner}>
//     <Fab label={t('home.addFile')} onPress={addFile} />
//   </View>
//
// It is one of the four things that float: a 1 line edge on every platform,
// and one soft shadow on iOS and the web. It does not place itself. The
// screen puts it in a corner (position absolute, `end` and `bottom`, above
// the tab bar and the safe area), because only the screen knows what is
// under it.
//
// Everything else is the large Button: 56 high, a light tap in the hand at
// contact for main, plain paper when disabled, the same size while busy, and
// words that wrap before the button outgrows its parent.
export function Fab({ variant = 'main', icon = 'add', style, ...rest }: FabProps) {
  const { colors } = useTheme();
  return <Button {...rest} variant={variant} size="lg" icon={icon} style={[lift(LIFT, colors), style]} />;
}
