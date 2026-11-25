import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { duration, radius, sizes, space, transition, useReducedMotion, useTheme, type Palette } from '@/theme';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Press, type PressProps } from '@/ui/press';
import { Txt } from '@/ui/text';

// main    the one filled button of a screen, in the action blue. One per
//         screen: a second filled button makes neither of them the main one.
// quiet   a second action, on the soft blue fill.
// plain   words only, in the blue as text. The least pressing action.
// danger  something that cannot be taken back, labelled in the failure red.
export type ButtonVariant = 'main' | 'quiet' | 'plain' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonIconPosition = 'start' | 'end';

// Everything Press takes passes through (onPress, onLongPress, hitSlop,
// testID, the accessibility props). Press's own weight, feedback and haptic
// are fixed here: they are part of what a button is.
export type ButtonProps = Omit<PressProps, 'children' | 'style' | 'weight' | 'feedback' | 'haptic'> & {
  // What the button is for. Default main.
  variant?: ButtonVariant;
  // sm is drawn 44 high and still takes a 48 touch. md is 52, lg is 56. The
  // plain button is 44, 48 and 52. Default md. Every size grows with its text.
  size?: ButtonSize;
  // The words, already in the app's language. `label` wins over `children`.
  label?: string;
  // One icon of the family, drawn 20, in the colour of the words.
  icon?: IconName;
  // Which side of the words the icon sits on. It follows the reading
  // direction: start is the right-hand side in Hebrew. Default start.
  iconPosition?: ButtonIconPosition;
  // The button is working on what it was pressed for. The working mark takes
  // the place of the words, the button keeps its exact size, it cannot be
  // pressed again, and a screen reader hears that it is busy.
  busy?: boolean;
  // Cannot be used: plain paper and faint ink, never a faded blue.
  disabled?: boolean;
  // Takes the whole width of its parent, with its words centred across it
  // (also when they wrap). Without it the button is as wide as its parent
  // lays it out: its own words in a row, the full width in a column that
  // stretches its children.
  fullWidth?: boolean;
  // Layout only (flex, alignSelf, a width). Merged last.
  style?: StyleProp<ViewStyle>;
  // The words, in place of `label`:
  //   <Button onPress={save}>{t('common.save')}</Button>
  // Anything that is not plain words is drawn as given, in its own colours;
  // then pass accessibilityLabel too, so the button keeps a spoken name.
  children?: ReactNode;
};

// Heights (brand spec, section 6). The filled button is 52. 44 and 56 belong
// to this component: sm is drawn 44 and Press pads its target to 48.
const HEIGHT: Record<ButtonSize, number> = { sm: 44, md: sizes.control, lg: 56 };
// The text button is 48 where the filled one is 52 (brand spec, section 6),
// and keeps that step at lg. It is never drawn under 44.
const PLAIN_HEIGHT: Record<ButtonSize, number> = { sm: 44, md: sizes.target, lg: sizes.control };
// Room at the two ends: 24 (brand spec, section 6), one step less on the
// small button. The text button takes 12.
const PADDING: Record<ButtonSize, number> = { sm: space.xl, md: space.xxl, lg: space.xxl };
const PLAIN_PADDING = space.md;

// --- The working mark ----------------------------------------------------------

// Three dots that come forward one after another, in the colour of the words
// they stand in for. Opacity only: nothing moves. The sizes belong to this
// mark alone.
const DOT = 6;
// How faint a dot is while it waits its turn.
const DOT_REST = 0.32;
// One dot starts this long after the one before it, and a whole round takes
// three sweeps: every dot has its turn, then a short rest.
const DOT_TURN = duration.quick;
const DOT_ROUND = duration.sweep * 3;
const DOT_PULSE = {
  '0%': { opacity: DOT_REST },
  '25%': { opacity: 1 },
  '50%': { opacity: DOT_REST },
  '100%': { opacity: DOT_REST },
};
const DOT_ORDER = [0, 1, 2] as const;

// The mark a control shows while it works:
//   {working ? <WorkingDots color={colors.onAction} /> : <Icon name="send" color={colors.onAction} />}
// It is 26 by 6 and does not grow with text. When the phone asks for less
// motion the loop stops and the three dots stand still at full strength. It
// never speaks: the control around it says busy (aria-busy).
export function WorkingDots({ color }: { color: string }) {
  const reduced = useReducedMotion();
  return (
    <View aria-hidden style={styles.dots}>
      {DOT_ORDER.map((turn) => (
        <Animated.View
          key={turn}
          style={[
            styles.dot,
            { backgroundColor: color },
            reduced
              ? null
              : {
                  opacity: DOT_REST,
                  animationName: DOT_PULSE,
                  animationDuration: DOT_ROUND,
                  animationDelay: DOT_TURN * turn,
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'linear',
                },
          ]}
        />
      ))}
    </View>
  );
}

// --- The button ------------------------------------------------------------------

// The words, when the children are nothing but words: a string, a number, or
// a list of them. Anything else (an icon, a view) gives undefined.
function plainText(children: ReactNode): string | undefined {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!Array.isArray(children)) return undefined;
  let text = '';
  for (const child of children as readonly unknown[]) {
    if (typeof child === 'string') text += child;
    else if (typeof child === 'number') text += String(child);
    else if (child !== null && child !== undefined && typeof child !== 'boolean') return undefined;
  }
  return text;
}

type Paint = {
  // The surface. A text button has none.
  fill: string | undefined;
  // The words, the icon and the working mark.
  ink: string;
};

function paintOf(variant: ButtonVariant, disabled: boolean, colors: Palette): Paint {
  if (disabled) {
    // Plain paper and faint ink. A text button has no paper, only the ink.
    return { fill: variant === 'plain' ? undefined : colors.disabledFill, ink: colors.disabledInk };
  }
  if (variant === 'main') return { fill: colors.action, ink: colors.onAction };
  if (variant === 'quiet') return { fill: colors.actionSoft, ink: colors.onActionSoft };
  // The palette has no ink for a solid red, so the red is the label and the
  // fill is its soft partner, the pair the failure notes already use.
  if (variant === 'danger') return { fill: colors.badSoft, ink: colors.bad };
  return { fill: undefined, ink: colors.actionText };
}

// A button:
//   <Button label={t('home.ask')} onPress={ask} />
//   <Button variant="quiet" icon="add" label={t('home.addFile')} onPress={add} />
//   <Button variant="plain" icon="chevron" iconPosition="end" label={t('home.insights')} onPress={open} />
//   <Button fullWidth busy={saving} label={t('report.save')} onPress={save} />
//
// It answers at contact and acts on release (Press). The main button gives
// one light tap in the hand at contact. While busy, the working mark stands
// in for the words and the size does not change by a pixel. Disabled is plain
// paper. Long words wrap onto a second line before the button outgrows its
// parent, and every size grows with the phone's text size.
export function Button({
  variant = 'main',
  size = 'md',
  label,
  icon,
  iconPosition = 'start',
  busy = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  style,
  children,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const words = label ?? plainText(children);
  // Disabled wins: a button that cannot be used is not shown as working.
  const working = busy && !disabled;
  const plain = variant === 'plain';
  const paint = paintOf(variant, disabled, colors);
  // Words alone in a full-width button are given the whole width and centred
  // in it, so lines that wrap stay centred. Beside an icon they keep their own
  // width, so the icon stays next to them.
  const centred = fullWidth && icon === undefined;

  const mark = icon === undefined ? null : <Icon name={icon} size={sizes.iconSmall} color={paint.ink} />;

  return (
    <Press
      {...rest}
      weight="md"
      haptic={variant === 'main' ? 'tap' : 'none'}
      disabled={disabled || busy}
      aria-busy={working}
      // Said out loud by name even while the working mark hides the words.
      accessibilityLabel={accessibilityLabel ?? words}
      style={[
        styles.base,
        {
          minHeight: (plain ? PLAIN_HEIGHT : HEIGHT)[size],
          paddingHorizontal: plain ? PLAIN_PADDING : PADDING[size],
          backgroundColor: paint.fill,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {/* The words stay in the layout while the button works, so its width cannot change. */}
      <Animated.View
        style={[
          styles.content,
          { opacity: working ? 0 : 1 },
          transition(['opacity'], duration.quick, 'standard', reduced),
        ]}>
        {iconPosition === 'start' ? mark : null}
        {words === undefined ? (
          children
        ) : centred ? (
          <Txt variant="label" color={paint.ink} align="center" selectable={false} style={styles.wordsCentred}>
            {words}
          </Txt>
        ) : (
          <Txt variant="label" color={paint.ink} snug selectable={false} style={styles.words}>
            {words}
          </Txt>
        )}
        {iconPosition === 'end' ? mark : null}
      </Animated.View>
      {working ? (
        <View style={styles.working}>
          <WorkingDots color={paint.ink} />
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  // A column, so the row of icon and words inside it takes the button's whole
  // width. No fixed height: the button grows with its text.
  base: {
    justifyContent: 'center',
    maxWidth: '100%',
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  // Words that take their own width: they wrap before the button outgrows
  // its parent.
  words: { flexShrink: 1 },
  // Words given the row's whole width, so centring them is safe.
  wordsCentred: { flex: 1 },
  // Over the hidden words, in the middle of the button. Never takes a touch.
  working: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
});
