import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, usePanGesture, type PanGestureActiveEvent } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  border,
  fade,
  lift,
  motion,
  radius,
  sizes,
  space,
  spring,
  timing,
  useIsRTL,
  useReducedMotion,
  useTheme,
  type Palette,
} from '@/theme';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import {
  OVERLAY_FLICK_SPEED,
  Overlay,
  carryIntoOverlays,
  useOverlayExit,
  useOverlayHosted,
  useOverlayInsets,
  useOverlayKeyboard,
  useOverlayLatest,
  useOverlayPresence,
  warnOverlayUnhosted,
  type OverlayExit,
} from '@/ui/overlay-host';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

// info  something that just happened ("Copied").
// good  it worked.
// warn  not yet, or could not be checked.
// bad   it failed, or it was refused: say what happened and what to do next.
// Each has its own icon beside the words: a status is never colour alone.
export type ToastTone = 'info' | 'good' | 'warn' | 'bad';

// Which edge of the screen it sits at.
export type ToastPlacement = 'top' | 'bottom';

export type ToastProps = {
  // Shown or not. The toast stays mounted while it leaves.
  visible: boolean;
  // The words, in the app's language. One short sentence.
  message: string;
  // Default info.
  tone?: ToastTone;
  // One way back from what the toast reports. With it the toast shows a text
  // button, and pressing it also closes the toast.
  onAction?: () => void;
  // The words of that button. Default: the library's Undo (UIStrings).
  actionLabel?: string;
  // How long it stays, in ms. Default 4000, or 7000 with an action. People
  // who have asked their phone for more time get more, and with a screen
  // reader on a toast with an action stays at least 20 seconds.
  duration?: number;
  // Default bottom.
  placement?: ToastPlacement;
  // More room to keep clear at that edge, in dp, beyond the safe area and the
  // usual 16: the height of a floating tab bar.
  offset?: number;
  // It was asked to close: its time ran out, it was swiped away, its action
  // was pressed, or a screen reader closed it. Set `visible` to false here.
  onClose?: () => void;
  // It has left the screen and is gone.
  onClosed?: () => void;
  // Asks for the reduced-motion form (it fades, nothing scales and no bar
  // drains) whatever the phone says. The phone's own setting is always
  // honoured as well.
  reduceMotion?: boolean;
  testID?: string;
  // Layout of the card (a narrower maxWidth). Merged last.
  style?: StyleProp<ViewStyle>;
};

// The icon of each tone, and the ink of that icon and of the time bar.
const LOOK: Record<ToastTone, { icon: IconName; ink: keyof Palette }> = {
  info: { icon: 'info', ink: 'inkSoft' },
  good: { icon: 'check', ink: 'good' },
  warn: { icon: 'warning', ink: 'warn' },
  bad: { icon: 'error', ink: 'bad' },
};

// How long a toast stays, in ms. Reading time, not movement, so these are
// not motion tokens: long enough to read one sentence, longer when there is
// something to press, and long enough to reach that button with a screen
// reader.
const STAY = 4000;
const STAY_WITH_ACTION = 7000;
const STAY_SPOKEN = 20000;
// The card does not grow past this on a wide screen. It belongs to this
// component.
const MAX_WIDTH = 480;
// It arrives from this scale, with its opacity. Never from nothing.
const POP_FROM = 0.9;
// The bar that shows the time left.
const BAR_HEIGHT = 3;
// How much of the row the words keep before the action is moved under them
// (the same share a list row gives its title).
const WORDS_SHARE = '55%';
// Pushed further aside than this share of its own width, a toast is let go.
const SWIPE_SHARE = 1 / 3;
// How far a finger moves sideways before the toast follows it, and how far up
// or down before the move is not a swipe at all. Distances a finger travels,
// not spacing (the slider uses the same two).
const DRAG_SLOP = 8;
const SCROLL_SLOP = 12;
const SIDEWAYS: [number, number] = [-DRAG_SLOP, DRAG_SLOP];
const UP_OR_DOWN: [number, number] = [-SCROLL_SLOP, SCROLL_SLOP];
// A toast swiped away travels its own width and this much more.
const PAST_THE_EDGE = space.xxl;
// The clock behind the time bar. It keeps running when the phone asks for
// less motion (a time is not a movement), and it runs at one steady rate, so
// it takes no brand curve.
const CLOCK = { ...fade(), easing: Easing.linear };
// The name of the screen reader action that closes a toast.
const CLOSE_ACTION = 'dismiss';

type Motions = { enter: () => void; leave: (side: number) => void; run: () => void; exit: OverlayExit };

type ToastCardProps = Omit<ToastProps, 'onClosed'> & {
  // The word a screen reader offers for closing it.
  closeLabel: string;
  // It has finished leaving.
  onExited: () => void;
};

// What is drawn in the host: the card, at its edge of the screen.
function ToastCard({
  visible,
  message,
  tone = 'info',
  onAction,
  actionLabel,
  duration: stay,
  placement = 'bottom',
  offset = 0,
  onClose,
  onExited,
  closeLabel,
  reduceMotion = false,
  testID,
  style,
}: ToastCardProps) {
  const { colors } = useTheme();
  const insets = useOverlayInsets();
  const rtl = useIsRTL();
  const phoneReduced = useReducedMotion();
  const reduced = phoneReduced || reduceMotion;

  // 0 away, 1 in place.
  const shown = useSharedValue(0);
  // Where a finger has pushed it, sideways.
  const x = useSharedValue(0);
  // The share of its time still to run, 1 down to 0, and that time in ms (0
  // until it is known).
  const remaining = useSharedValue(1);
  const whole = useSharedValue(0);
  const width = useSharedValue(0);
  const leaving = useSharedValue(false);
  // Where the toast and the finger were when the swipe began.
  const grabbedAt = useSharedValue(0);
  const fingerAt = useSharedValue(0);

  const [layerHeight, setLayerHeight] = useState(0);
  const motions = useRef<Motions | null>(null);

  const cover = useOverlayKeyboard(layerHeight);
  const latest = useOverlayLatest({ onClose, onAction });

  const close = () => latest.current.onClose?.();

  const act = () => {
    const now = latest.current;
    now.onAction?.();
    now.onClose?.();
  };

  // Whoever shows it still wants it (it was swiped away and they said no):
  // it comes back.
  const comeBack = () => {
    const move = motions.current;
    if (move !== null) scheduleOnUI(move.enter);
  };
  const ending = useOverlayExit(visible, onExited, comeBack);
  // Called from the UI thread when the toast has finished leaving.
  const left = ending.left;

  const settle = spring('settle', reduced);
  const exit = timing(motion.duration.exit, 'exit', reduced);
  const fading = fade();

  // Starts the clock, or starts it again from where it was stopped.
  const run = () => {
    'worklet';
    const share = remaining.get();
    const time = whole.get();
    if (leaving.get() || time <= 0 || share <= 0) return;
    remaining.set(
      withTiming(0, { ...CLOCK, duration: time * share }, (finished?: boolean) => {
        'worklet';
        // Its time ran out. Not finished: a finger stopped the clock.
        if (finished) scheduleOnRN(close);
      }),
    );
  };

  // A finger on the toast stops the clock: nothing leaves from under a hand.
  const hold = () => {
    'worklet';
    cancelAnimation(remaining);
  };

  const enter = () => {
    'worklet';
    leaving.set(false);
    if (x.get() !== 0) x.set(0);
    // It arrives on a spring that does not overshoot. Reduced motion: it fades.
    shown.set(reduced ? withTiming(1, fading) : withSpring(1, settle));
    run();
  };

  // `side` is the way a swipe sent it: -1 or 1, or 0 when it was not swiped.
  const leave = (side: number) => {
    'worklet';
    if (leaving.get()) return;
    leaving.set(true);
    cancelAnimation(remaining);
    // A swiped toast keeps going the way it was pushed. Everything leaves on
    // the exit curve. Reduced motion: it fades where it is.
    if (side !== 0 && !reduced) x.set(withTiming(side * (width.get() + PAST_THE_EDGE), exit));
    shown.set(
      withTiming(0, reduced ? fading : exit, (finished?: boolean) => {
        'worklet';
        if (!finished) return;
        leaving.set(false);
        scheduleOnRN(left);
      }),
    );
  };

  const grab = (event: PanGestureActiveEvent) => {
    'worklet';
    grabbedAt.set(x.get());
    fingerAt.set(event.translationX);
  };

  const push = (event: PanGestureActiveEvent) => {
    'worklet';
    if (leaving.get()) return;
    x.set(grabbedAt.get() + event.translationX - fingerAt.get());
  };

  const release = (event: PanGestureActiveEvent & { canceled: boolean }) => {
    'worklet';
    if (leaving.get()) return;
    const at = x.get();
    const flicked = Math.abs(event.velocityX) > OVERLAY_FLICK_SPEED;
    const far = Math.abs(at) > width.get() * SWIPE_SHARE;
    if (!event.canceled && (far || flicked)) {
      // Far enough, or flicked: it goes, and whoever shows it is told.
      leave((flicked ? event.velocityX : at) < 0 ? -1 : 1);
      scheduleOnRN(close);
      return;
    }
    // Otherwise it settles back, and the spring takes the finger's speed.
    x.set(withSpring(0, { ...settle, velocity: event.velocityX }));
  };

  const swipe = usePanGesture({
    enabled: visible,
    activeOffsetX: SIDEWAYS,
    failOffsetY: UP_OR_DOWN,
    onBegin: hold,
    onActivate: grab,
    onUpdate: push,
    onDeactivate: release,
    // The finger is off again: the clock goes on, unless the toast is leaving.
    onFinalize: run,
  });

  const cardMotion = useAnimatedStyle<ViewStyle>(() => {
    const progress = Math.min(Math.max(shown.get(), 0), 1);
    return {
      opacity: progress,
      transform: [{ translateX: x.get() }, { scale: reduced ? 1 : POP_FROM + (1 - POP_FROM) * progress }],
    };
  });

  // The time left, as a bar that drains: a scale, never a width.
  const barMotion = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scaleX: Math.min(Math.max(remaining.get(), 0), 1) }],
  }));

  useEffect(() => {
    motions.current = { enter, leave, run, exit: ending };
  });

  useEffect(() => {
    const move = motions.current;
    if (move === null) return;
    if (visible) {
      move.exit.stay();
      scheduleOnUI(move.enter);
    } else if (move.exit.isAway()) {
      // Already swiped out of sight: there is nothing to see leave.
      move.exit.finish();
    } else {
      scheduleOnUI(move.leave, 0);
    }
  }, [visible]);

  const hasAction = actionLabel !== undefined;
  const wanted = stay ?? (hasAction ? STAY_WITH_ACTION : STAY);

  // How long it stays is settled once the phone has been asked.
  useEffect(() => {
    let current = true;
    const start = (ms: number) => {
      if (!current) return;
      whole.set(ms);
      const move = motions.current;
      if (move !== null) scheduleOnUI(move.run);
    };
    if (Platform.OS === 'web') {
      start(wanted);
    } else {
      // Android has a setting for how long such messages should stay; an
      // iPhone answers with the time it was given. A screen reader needs time
      // to get to the button.
      Promise.all([
        AccessibilityInfo.getRecommendedTimeoutMillis(wanted),
        AccessibilityInfo.isScreenReaderEnabled(),
      ]).then(
        ([asked, spoken]) => start(Math.max(wanted, asked, spoken && hasAction ? STAY_SPOKEN : 0)),
        () => start(wanted),
      );
    }
    return () => {
      current = false;
    };
  }, [wanted, hasAction, whole]);

  // Android and a browser read a live region out by themselves. An iPhone has
  // none, so it is told.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  const measureLayer = (event: LayoutChangeEvent) => setLayerHeight(event.nativeEvent.layout.height);
  const measureCard = (event: LayoutChangeEvent) => width.set(event.nativeEvent.layout.width);

  const spokenAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === CLOSE_ACTION) close();
  };

  const look = LOOK[tone];
  const ink = colors[look.ink];
  const atTop = placement === 'top';
  const clear = space.lg + offset;
  // At the bottom it stays above the keyboard; the keyboard covers the home
  // bar and whatever the offset was for.
  const edge = atTop
    ? { paddingTop: insets.top + clear }
    : { paddingBottom: cover > 0 ? cover + space.lg : insets.bottom + clear };

  return (
    <View testID={testID} onLayout={measureLayer} style={[styles.root, atTop ? styles.atTop : styles.atBottom, edge]}>
      <GestureDetector gesture={swipe} touchAction="pan-y">
        {/* The caller's style adjusts the card; the movement stays the toast's own. */}
        <Animated.View
          onLayout={measureCard}
          onAccessibilityEscape={close}
          style={[styles.card, { backgroundColor: colors.surface }, lift('raised', colors), style, cardMotion]}>
          {/* Clipped here, on the inside, so the shadow of the card is not cut. */}
          <View style={styles.clip}>
            <View style={[styles.row, hasAction && styles.rowWithAction]}>
              <Icon name={look.icon} color={ink} />
              {/* One stop for a screen reader, read out when it arrives. The
                  button stays outside it, so it can still be reached. */}
              <View
                accessible
                accessibilityRole={tone === 'warn' || tone === 'bad' ? 'alert' : undefined}
                aria-live="polite"
                accessibilityActions={[{ name: CLOSE_ACTION, label: closeLabel }]}
                onAccessibilityAction={spokenAction}
                style={styles.words}>
                <Txt>{message}</Txt>
              </View>
              {actionLabel !== undefined ? (
                <Button variant="plain" label={actionLabel} onPress={act} style={styles.action} />
              ) : null}
            </View>
            {reduced ? null : (
              <Animated.View
                aria-hidden
                style={[styles.bar, rtl ? styles.barFromRight : styles.barFromLeft, { backgroundColor: ink }, barMotion]}
              />
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// A short message at the edge of the screen that leaves by itself:
//   <Toast visible={shown} message={t('files.removed')} onAction={putBack} onClose={() => setShown(false)} />
// Most screens do not write one: they call useToast().show().
//
// A card (radius 20, the raised lift) with the tone's icon, the words, and at
// most one text button. It arrives from 90 percent with its opacity on the
// settle spring and leaves on the exit curve. A bar along its foot drains as
// its time runs out; a finger on the toast stops the clock. Swipe it sideways
// to send it away: let go past a third of its width, or flick it. With
// reduced motion it only fades and the bar is not drawn; the time still runs.
//
// It is read out when it arrives. A screen reader can close it (the Close
// action, or the escape gesture) and reach its button. It never takes the
// screen: everything round it stays in reach.
//
// It fires no haptic of its own: whoever shows it knows whether one has
// already been felt. Drawn in the OverlayHost, above sheets and dialogs.
// Needs OverlayHost above it.
export function Toast({ visible, actionLabel, onClosed, ...rest }: ToastProps) {
  const strings = useUIStrings();
  const { present, round, exited } = useOverlayPresence(visible);

  if (!present) return null;

  return (
    <Overlay layer="toast">
      <ToastCard
        key={round}
        {...rest}
        visible={visible}
        actionLabel={rest.onAction === undefined ? undefined : (actionLabel ?? strings.undo)}
        closeLabel={strings.close}
        onExited={() => {
          exited();
          onClosed?.();
        }}
      />
    </Overlay>
  );
}

// --- Showing one from anywhere -----------------------------------------------------

export type ToastRequest = {
  message: string;
  tone?: ToastTone;
  // The words of the action. Default: the library's Undo.
  actionLabel?: string;
  // With it the toast shows a text button; pressing it also closes the toast.
  onAction?: () => void;
  // How long it stays, in ms. See ToastProps.
  duration?: number;
};

export type ToastController = {
  // Shows a toast, after the ones already waiting. Gives back a function that
  // takes this one away early.
  show: (request: ToastRequest) => () => void;
  // Takes away the toast on screen and every one that is waiting.
  clear: () => void;
};

type Waiting = ToastRequest & { id: number };

// The toasts in the order they were asked for (the first is on screen), and
// the one on screen once it has been asked to leave.
type Line = { queue: readonly Waiting[]; closing: number | null };

const EMPTY_LINE: Line = { queue: [], closing: null };
const NO_TOAST = () => {};

const ToastContext = createContext<ToastController | null>(null);
// What a sheet or a dialog holds is drawn in the host, outside this provider.
// The controller travels with it, so useToast() works there too.
carryIntoOverlays(ToastContext);

export type ToastProviderProps = {
  // Where every toast sits. Default bottom.
  placement?: ToastPlacement;
  // Room to keep clear at that edge beyond the safe area, in dp: the height
  // of the floating tab bar while it is on screen.
  offset?: number;
  children?: ReactNode;
};

// Lets any screen show a toast:
//   const toast = useToast();
//   toast.show({ message: t('files.removed'), onAction: putBack });
//   toast.show({ message: t('import.failed'), tone: 'bad', actionLabel: t('common.retry'), onAction: retry });
//
// One at a time: a toast asked for while another is on screen waits its turn,
// in the order asked. The same words asked for twice in a row are shown once.
//
// Mount it once, inside OverlayHost. With no host above it nothing can be
// shown.
export function ToastProvider({ placement = 'bottom', offset = 0, children }: ToastProviderProps) {
  const hosted = useOverlayHosted();
  const [line, setLine] = useState<Line>(EMPTY_LINE);
  const count = useRef(0);

  // On screen: it is asked to leave. Still waiting: it never shows.
  const hide = (id: number) =>
    setLine((now) => {
      if (now.queue.length === 0) return now;
      if (now.queue[0].id === id) return now.closing === id ? now : { ...now, closing: id };
      return { ...now, queue: now.queue.filter((toast) => toast.id !== id) };
    });

  // It has left: the next one in line shows.
  const gone = (id: number) =>
    setLine((now) => ({
      queue: now.queue.filter((toast) => toast.id !== id),
      closing: now.closing === id ? null : now.closing,
    }));

  const show = (request: ToastRequest) => {
    if (!hosted) {
      warnOverlayUnhosted();
      return NO_TOAST;
    }
    count.current += 1;
    const id = count.current;
    setLine((now) => {
      const last = now.queue.length > 0 ? now.queue[now.queue.length - 1] : undefined;
      // The same words again, while they are still there to read: once is enough.
      const repeat =
        last !== undefined &&
        last.id !== now.closing &&
        last.message === request.message &&
        last.tone === request.tone &&
        last.onAction === undefined &&
        request.onAction === undefined;
      return repeat ? now : { ...now, queue: [...now.queue, { ...request, id }] };
    });
    return () => hide(id);
  };

  const clear = () =>
    setLine((now) => (now.queue.length === 0 ? now : { queue: now.queue.slice(0, 1), closing: now.queue[0].id }));

  const controller: ToastController = { show, clear };
  const first = line.queue.length > 0 ? line.queue[0] : undefined;

  return (
    <ToastContext.Provider value={controller}>
      {children}
      {first !== undefined ? (
        <Toast
          key={first.id}
          visible={line.closing !== first.id}
          message={first.message}
          tone={first.tone}
          actionLabel={first.actionLabel}
          onAction={first.onAction}
          duration={first.duration}
          placement={placement}
          offset={offset}
          onClose={() => hide(first.id)}
          onClosed={() => gone(first.id)}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

// The way to show a toast from a screen. Needs ToastProvider above it.
export function useToast(): ToastController {
  const toast = useContext(ToastContext);
  if (toast === null) throw new Error('useToast must be used inside ToastProvider');
  return toast;
}

const styles = StyleSheet.create({
  // Fills the screen and takes no touch itself: only the card does.
  root: { ...StyleSheet.absoluteFill, paddingHorizontal: space.lg, pointerEvents: 'box-none' },
  atTop: { justifyContent: 'flex-start' },
  atBottom: { justifyContent: 'flex-end' },
  // Radius 20 (brand spec, section 6). The edge and the shadow come from lift.
  card: { alignSelf: 'center', width: '100%', maxWidth: MAX_WIDTH, borderRadius: radius.card },
  // The corner of the card, less its 1 edge.
  clip: { borderRadius: radius.card - border.hairline, overflow: 'hidden' },
  // The icon, the words and the action on one line, at least a row high; the
  // action moves under the words when the two no longer fit side by side.
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    columnGap: space.md,
    minHeight: sizes.row,
    paddingVertical: space.sm,
    paddingStart: space.lg,
    paddingEnd: space.lg,
  },
  // A text button brings 12 of room at its ends and is a full target high, so
  // the row gives up some of its own.
  rowWithAction: { paddingVertical: space.xs, paddingEnd: space.xs },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: WORDS_SHARE },
  // At the end of its line, also when it has a line to itself.
  action: { marginStart: 'auto' },
  bar: { position: 'absolute', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, height: BAR_HEIGHT },
  // The bar drains toward the edge reading starts from. A style has no word
  // for that edge of a transform, so the direction is asked (useIsRTL).
  barFromLeft: { transformOrigin: 'left' },
  barFromRight: { transformOrigin: 'right' },
});
