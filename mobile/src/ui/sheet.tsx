import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, usePanGesture, type PanGestureActiveEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  duration,
  fade,
  lift,
  radius,
  sheetDismissTravel,
  sizes,
  space,
  spring,
  timing,
  useReducedMotion,
  useTheme,
  type SpringName,
} from '@/theme';
import { tap } from '@/ui/haptics';
import { IconButton } from '@/ui/icon-button';
import {
  OVERLAY_FLICK_SPEED,
  Overlay,
  useOverlayDismiss,
  useOverlayExit,
  useOverlayFocus,
  useOverlayInsets,
  useOverlayKeyboard,
  useOverlayLatest,
  useOverlayPresence,
  type OverlayExit,
} from '@/ui/overlay-host';
import { Press } from '@/ui/press';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

export type SheetProps = {
  // Shown or not. The sheet stays mounted while it leaves.
  visible: boolean;
  // It was asked to close: a tap outside it, Android back, a drag or a flick
  // down, its close button, the escape gesture of a screen reader. Set
  // `visible` to false here.
  onClose?: () => void;
  // It has left the screen and is gone. The place to show the next thing.
  onClosed?: () => void;
  // The heading at the top, in the app's language. It is also the spoken name
  // of the sheet.
  title?: string;
  // The small bar at the top that says "this can be dragged". Default true.
  grabber?: boolean;
  // Draws a close button at the end of the top row. A drag is never the only
  // way out (brand spec, section 7): a sheet whose content has no button of
  // its own that closes it (Done, Cancel) takes this one. Default false.
  closeButton?: boolean;
  // false: only the sheet's own controls close it (work that has to finish
  // first). A tap outside, back and a drag down do nothing, and the close
  // button is not drawn. Default true.
  dismissable?: boolean;
  // true (the default): a sheet that would be taller than 85 percent of the
  // screen stops there and scrolls inside. false: the content brings its own
  // scroller (a long list); it must be able to shrink (`flexShrink: 1`).
  scrollable?: boolean;
  // The spoken name of a sheet that has no title.
  accessibilityLabel?: string;
  // Asks for the reduced-motion form (it fades where it rests) whatever the
  // phone says. The phone's own setting is always honoured as well.
  reduceMotion?: boolean;
  testID?: string;
  // Layout of the content area: its padding and the gap between its children.
  // Merged last.
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// The grabber (brand spec, section 6): 40 by 5, round ends, in inkFaint. The
// sizes belong to this component.
const GRABBER_WIDTH = 40;
const GRABBER_HEIGHT = 5;
// A sheet stops growing at this share of the screen and scrolls inside.
const MAX_HEIGHT = '85%';
// On a wide screen (a tablet, the browser preview) a sheet stops growing
// sideways and sits in the middle.
const MAX_WIDTH = 640;
// The sheet is put this much further down than its own height, so the shadow
// above its top edge leaves the screen with it (the board does the same).
const HIDE_EXTRA = space.md;
// How far a sheet can be pulled above its resting place. It resists more the
// further it is pulled and never passes this.
const BAND_REACH = space.huge;
// The pull of that resistance: the constant of the phone's own rubber band.
const BAND_PULL = 0.55;
// How far a finger moves up or down before the sheet follows it, and how far
// sideways before the move is not a drag of the sheet at all. Distances a
// finger travels, not spacing, so they are not on the spacing scale (the
// slider uses the same two).
const DRAG_SLOP = 8;
const SIDEWAYS_SLOP = 12;
const UP_OR_DOWN: [number, number] = [-DRAG_SLOP, DRAG_SLOP];
const SIDEWAYS: [number, number] = [-SIDEWAYS_SLOP, SIDEWAYS_SLOP];
// Within this of its resting place a sheet has come to rest, as far as a hand
// can tell: the moment of the light tap.
const REST_WITHIN = 2;
// What a sheet returns on when it is let go short of the mark (brand spec,
// section 7: "otherwise it returns on `sheet`").
const RETURN_SPRING: SpringName = 'sheet';

// Where the sheet goes when a finger has pulled it `over` dp past where it
// may freely go: less and less of the way, and never as far as BAND_REACH.
function resist(over: number): number {
  'worklet';
  return (over * BAND_REACH * BAND_PULL) / (BAND_REACH + BAND_PULL * Math.abs(over));
}

// The other way round: how far the finger had pulled, from where the sheet is.
function pulled(at: number): number {
  'worklet';
  return (at * BAND_REACH) / (BAND_PULL * Math.max(BAND_REACH - Math.abs(at), 1));
}

type Motions = { comeUp: () => void; goDown: () => void; exit: OverlayExit };

type SheetPaneProps = Omit<SheetProps, 'onClosed'> & {
  // The word for closing: the name of the area outside the sheet and of the
  // close button.
  closeLabel: string;
  // It has finished leaving.
  onExited: () => void;
};

// What is drawn in the host: the dimming, the area outside the sheet, and the
// sheet itself.
function SheetPane({
  visible,
  onClose,
  onExited,
  closeLabel,
  title,
  grabber = true,
  closeButton = false,
  dismissable = true,
  scrollable = true,
  accessibilityLabel,
  reduceMotion = false,
  testID,
  style,
  children,
}: SheetPaneProps) {
  const { colors } = useTheme();
  const insets = useOverlayInsets();
  const phoneReduced = useReducedMotion();
  const reduced = phoneReduced || reduceMotion;

  // Where the sheet is: 0 at rest, `travel` when all of it is below the screen.
  const y = useSharedValue(0);
  // 0 until the sheet has been measured and put in place. With reduced motion
  // this is the fade.
  const veil = useSharedValue(0);
  // Its measured height, and a little more (HIDE_EXTRA).
  const travel = useSharedValue(0);
  const arrived = useSharedValue(false);
  const leaving = useSharedValue(false);
  // Waiting to come to rest (the light tap is owed).
  const settling = useSharedValue(false);
  // Where the sheet and the finger were when the drag began.
  const grabbedAt = useSharedValue(0);
  const fingerAt = useSharedValue(0);

  const [measured, setMeasured] = useState(false);
  const [layerHeight, setLayerHeight] = useState(0);
  // The content is taller than the room the sheet can give it.
  const [overflows, setOverflows] = useState(false);
  const roomHeight = useRef(0);
  const contentHeight = useRef(0);
  const heading = useRef<ViewInstance>(null);
  const motions = useRef<Motions | null>(null);

  const cover = useOverlayKeyboard(layerHeight);
  const latest = useOverlayLatest({ dismissable, onClose });

  const close = () => {
    const now = latest.current;
    if (now.dismissable) now.onClose?.();
  };

  // Whoever shows it still wants it (a drag sent it away and they said no):
  // it comes back up.
  const comeBack = () => {
    const move = motions.current;
    if (move !== null) scheduleOnUI(move.comeUp);
  };
  const exit = useOverlayExit(visible, onExited, comeBack);
  // Called from the UI thread when the sheet has finished leaving.
  const left = exit.left;

  const rise = spring('sheet', reduced);
  const back = spring(RETURN_SPRING, reduced);
  const leave = timing(duration.exit, 'exit', reduced);
  const fading = fade();

  const comeUp = () => {
    'worklet';
    leaving.set(false);
    if (reduced) {
      // Reduced motion: it fades in where it rests. No slide.
      y.set(0);
      arrived.set(true);
      if (veil.get() < 1) {
        settling.set(true);
        veil.set(withTiming(1, fading));
      }
      return;
    }
    // The first time, it starts from its own measured height. After that it
    // starts from where it is, so a sheet called back half way turns round.
    if (!arrived.get()) y.set(travel.get());
    arrived.set(true);
    veil.set(1);
    if (y.get() > REST_WITHIN) settling.set(true);
    y.set(withSpring(0, rise));
  };

  const goDown = () => {
    'worklet';
    if (leaving.get()) return;
    if (!arrived.get()) {
      // It never came up, so there is nothing to see leave.
      scheduleOnRN(left);
      return;
    }
    leaving.set(true);
    settling.set(false);
    const whenGone = (finished?: boolean) => {
      'worklet';
      // Not finished: it was called back before it had gone.
      if (!finished) return;
      leaving.set(false);
      scheduleOnRN(left);
    };
    // It leaves on the exit curve and never settles. Reduced motion: it fades.
    if (reduced) veil.set(withTiming(0, fading, whenGone));
    else y.set(withTiming(travel.get(), leave, whenGone));
  };

  const grab = (event: PanGestureActiveEvent) => {
    'worklet';
    // From where it is on screen, not from rest: a sheet caught on its way up
    // goes on from there.
    const at = y.get();
    grabbedAt.set(at > 0 && dismissable ? at : pulled(at));
    fingerAt.set(event.translationY);
  };

  const drag = (event: PanGestureActiveEvent) => {
    'worklet';
    if (leaving.get()) return;
    const next = grabbedAt.get() + event.translationY - fingerAt.get();
    // Down, it follows the finger. Up, or when it may not be dismissed, it
    // resists.
    y.set(next > 0 && dismissable ? next : resist(next));
  };

  const release = (event: PanGestureActiveEvent & { canceled: boolean }) => {
    'worklet';
    if (leaving.get()) return;
    const at = y.get();
    const flicked = event.velocityY > OVERLAY_FLICK_SPEED;
    if (dismissable && !event.canceled && (at > sheetDismissTravel || flicked)) {
      // Past the mark, or flicked down: it leaves from where it is, at once,
      // and whoever shows it is told.
      goDown();
      scheduleOnRN(close);
      return;
    }
    // Short of the mark it returns, and the spring takes the finger's speed.
    if (Math.abs(at) > REST_WITHIN) settling.set(true);
    y.set(withSpring(0, { ...back, velocity: event.velocityY }));
  };

  // A sheet that fits is dragged by any part of it. One that scrolls inside
  // is dragged by its top, so a finger on the content scrolls the content.
  const anywhere = scrollable && !overflows;
  const paneDrag = usePanGesture({
    enabled: visible && anywhere,
    activeOffsetY: UP_OR_DOWN,
    failOffsetX: SIDEWAYS,
    onActivate: grab,
    onUpdate: drag,
    onDeactivate: release,
  });
  const handleDrag = usePanGesture({
    enabled: visible && !anywhere,
    activeOffsetY: UP_OR_DOWN,
    failOffsetX: SIDEWAYS,
    onActivate: grab,
    onUpdate: drag,
    onDeactivate: release,
  });

  const paneMotion = useAnimatedStyle<ViewStyle>(() => ({
    opacity: veil.get(),
    transform: [{ translateY: y.get() }],
  }));

  // The dimming is read from where the sheet is, so the two cannot disagree.
  const scrimMotion = useAnimatedStyle<ViewStyle>(() => {
    const distance = travel.get();
    const up = distance > 0 ? 1 - Math.min(Math.max(y.get() / distance, 0), 1) : 0;
    return { opacity: veil.get() * up };
  });

  // One light tap in the hand as the sheet comes to rest.
  useAnimatedReaction(
    () => settling.get() && Math.abs(y.get()) <= REST_WITHIN && veil.get() >= 1,
    (rested, was) => {
      if (rested && !was) {
        settling.set(false);
        scheduleOnRN(tap);
      }
    },
  );

  useEffect(() => {
    motions.current = { comeUp, goDown, exit };
  });

  useEffect(() => {
    const move = motions.current;
    if (move === null) return;
    if (visible) {
      move.exit.stay();
      // It measures itself first and only then moves.
      if (measured) scheduleOnUI(move.comeUp);
    } else if (!measured || move.exit.isAway()) {
      // Never seen, or already out of sight: there is nothing to see leave.
      move.exit.finish();
    } else {
      scheduleOnUI(move.goDown);
    }
  }, [visible, measured]);

  useOverlayDismiss(visible, close);
  useOverlayFocus(heading, visible && measured);

  const measureLayer = (event: LayoutChangeEvent) => setLayerHeight(event.nativeEvent.layout.height);

  const measurePane = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height <= 0) return;
    travel.set(height + HIDE_EXTRA);
    setMeasured(true);
  };

  // A rounding pixel is not an overflow.
  const judge = () => setOverflows(contentHeight.current > roomHeight.current + 1);
  const measureRoom = (event: LayoutChangeEvent) => {
    roomHeight.current = event.nativeEvent.layout.height;
    judge();
  };
  const measureContent = (_width: number, height: number) => {
    contentHeight.current = height;
    judge();
  };

  const web = Platform.OS === 'web';
  const titled = title !== undefined;
  const spokenName = title ?? accessibilityLabel;
  const named = spokenName !== undefined;
  // A sheet that cannot be dismissed has no close button either.
  const closes = closeButton && dismissable;
  const hasTitleRow = titled || closes;
  const hasTop = grabber || hasTitleRow;
  // Above the keyboard there is no home bar to keep clear of.
  const foot = { paddingTop: hasTop ? 0 : space.lg, paddingBottom: space.lg + (cover > 0 ? 0 : insets.bottom) };

  const bar = <View style={[styles.grabber, { backgroundColor: colors.inkFaint }]} />;

  return (
    <View
      testID={testID}
      onLayout={measureLayer}
      accessibilityViewIsModal
      aria-modal
      onAccessibilityEscape={close}
      style={[styles.root, visible ? styles.open : styles.closing]}>
      <Animated.View aria-hidden style={[styles.scrim, { backgroundColor: colors.scrim }, scrimMotion]} />
      {/* The area outside the sheet. To a screen reader it is a button that
          closes it. A sheet that cannot be dismissed keeps a plain view here,
          so a touch outside it still goes nowhere. */}
      {dismissable ? (
        <Press feedback="none" accessibilityLabel={closeLabel} onPress={close} style={styles.outside} />
      ) : (
        <View aria-hidden style={styles.outside} />
      )}
      <View style={[styles.aboveKeyboard, { paddingBottom: cover }]}>
        <View style={styles.room}>
          <GestureDetector gesture={paneDrag}>
            <Animated.View
              role={web ? 'dialog' : undefined}
              aria-label={web ? spokenName : undefined}
              onLayout={measurePane}
              style={[
                styles.pane,
                { backgroundColor: colors.surface },
                lift('floating', colors),
                styles.paneFoot,
                paneMotion,
              ]}>
              {/* More of the same paper below the sheet, for when it is pulled up past its resting place. */}
              <View aria-hidden style={[styles.tail, { backgroundColor: colors.surface }]} />
              {hasTop ? (
                <GestureDetector gesture={handleDrag}>
                  <View style={[styles.top, !anywhere && styles.handle]}>
                    {/* With no title the grabber's row carries the spoken name,
                        and is where a screen reader starts. */}
                    {grabber && (titled || !named) ? (
                      <View aria-hidden style={styles.grabberRow}>
                        {bar}
                      </View>
                    ) : null}
                    {grabber && !titled && named ? (
                      <View
                        ref={heading}
                        tabIndex={web ? -1 : undefined}
                        accessible
                        accessibilityRole="header"
                        accessibilityLabel={spokenName}
                        style={styles.grabberRow}>
                        {bar}
                      </View>
                    ) : null}
                    {hasTitleRow ? (
                      <View style={styles.titleRow}>
                        {titled ? (
                          <View
                            ref={heading}
                            tabIndex={web ? -1 : undefined}
                            accessible
                            accessibilityRole="header"
                            accessibilityLabel={title}
                            style={styles.titleWords}>
                            <Txt variant="heading">{title}</Txt>
                          </View>
                        ) : (
                          <View style={styles.titleWords} />
                        )}
                        {closes ? (
                          <IconButton
                            icon="close"
                            accessibilityLabel={closeLabel}
                            onPress={close}
                            style={styles.closeButton}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </GestureDetector>
              ) : null}
              {scrollable ? (
                <ScrollView
                  style={styles.scroller}
                  contentContainerStyle={[styles.content, foot, style]}
                  scrollEnabled={overflows}
                  bounces={overflows}
                  alwaysBounceVertical={false}
                  overScrollMode={overflows ? 'auto' : 'never'}
                  showsVerticalScrollIndicator={overflows}
                  keyboardShouldPersistTaps="handled"
                  onLayout={measureRoom}
                  onContentSizeChange={measureContent}>
                  {children}
                </ScrollView>
              ) : (
                <View style={[styles.own, styles.content, foot, style]}>{children}</View>
              )}
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
}

// A bottom sheet: one question, asked from the bottom of the screen.
//   <Sheet visible={open} title={t('numbers.title')} onClose={() => setOpen(false)}>
//     <RadioGroup ... />
//     <Button fullWidth label={t('common.done')} onPress={() => setOpen(false)} />
//   </Sheet>
//
// It measures itself before it moves, comes up from its own height on the
// sheet spring and settles without a bounce, with one light tap in the hand as
// it comes to rest. The dimming behind it is read from where the sheet is.
// Drag it down: past 110 or flicked, it leaves; short of that it returns on
// the sheet spring with the finger's speed. Pulled up, it resists. It leaves
// on the exit curve, faster than it came. With reduced motion it fades in
// where it rests and fades out: no slide.
//
// A tap outside it, Android back and the escape gesture of a screen reader
// ask it to close (`onClose`); `onClosed` says when it has gone. A drag is
// never the only way out: give it a button that can be seen, its own (Done,
// Cancel) or `closeButton`. It stays above the keyboard, keeps clear of the
// home bar, and scrolls inside once it would be taller than 85 percent of
// the screen. While it is open the screen under it cannot be reached by
// touch or by a screen reader, and the keyboard of that screen is put away.
//
// Its content is drawn in the OverlayHost, so it reads the providers above
// the host (useDialog and useToast are carried across and work inside it).
// It takes no room where it is written. Needs OverlayHost above it.
export function Sheet({ visible, onClose, onClosed, children, ...rest }: SheetProps) {
  const strings = useUIStrings();
  const { present, round, exited } = useOverlayPresence(visible);

  useEffect(() => {
    // One question at a time: the keyboard of the screen under it goes away.
    if (visible) Keyboard.dismiss();
  }, [visible]);

  if (!present) return null;

  return (
    <Overlay layer="sheet">
      <SheetPane
        key={round}
        {...rest}
        visible={visible}
        closeLabel={strings.close}
        onClose={onClose}
        onExited={() => {
          exited();
          onClosed?.();
        }}>
        {children}
      </SheetPane>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill },
  // Open, it takes every touch on the screen. Leaving, it takes none, so the
  // screen under it answers at once.
  open: { pointerEvents: 'box-none' },
  closing: { pointerEvents: 'none' },
  scrim: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  outside: { ...StyleSheet.absoluteFill },
  // Padded at the bottom by what the keyboard covers.
  aboveKeyboard: { flex: 1, pointerEvents: 'box-none' },
  // The room a sheet may fill. It has no padding of its own, so "85 percent"
  // is 85 percent of exactly this.
  room: { flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  pane: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_WIDTH,
    maxHeight: MAX_HEIGHT,
    borderTopStartRadius: radius.sheet,
    borderTopEndRadius: radius.sheet,
  },
  // The edge runs round the top and the sides only: the foot is off the screen.
  paneFoot: { borderBottomWidth: 0 },
  tail: { position: 'absolute', top: '100%', insetInlineStart: 0, insetInlineEnd: 0, height: BAND_REACH },
  // The grabber 8 from the top, 12 between it and the title, 8 under them: the
  // board's 10, 12 and 6 set on the spacing scale.
  top: { paddingTop: space.sm, paddingBottom: space.sm, paddingHorizontal: space.lg, gap: space.md },
  // When the top is the only place to drag from, it is a full target high.
  handle: { minHeight: sizes.target },
  // The row is 8 taller each way than the bar it holds, without moving
  // anything: when it carries the sheet's spoken name, a screen reader has
  // more than a 5 high line to land on.
  grabberRow: { alignItems: 'center', paddingVertical: space.sm, marginVertical: -space.sm },
  grabber: { width: GRABBER_WIDTH, height: GRABBER_HEIGHT, borderRadius: radius.pill },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleWords: { flex: 1 },
  // An optical nudge: the cross is drawn 12 inside its 48 target, so the
  // target reaches 12 past the content's edge and the cross itself lines up
  // with that edge.
  closeButton: { marginEnd: -space.md },
  // As tall as its content, and no taller than the sheet lets it be.
  scroller: { flexGrow: 0, flexShrink: 1 },
  own: { flexShrink: 1 },
  content: { paddingHorizontal: space.lg, gap: space.sm },
});
