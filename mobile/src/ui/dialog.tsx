import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { border, duration, fade, radius, space, spring, timing, useReducedMotion, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import type { IconName } from '@/ui/icon-set';
import { ListRow } from '@/ui/list';
import {
  Overlay,
  carryIntoOverlays,
  useOverlayDismiss,
  useOverlayExit,
  useOverlayFocus,
  useOverlayHosted,
  useOverlayInsets,
  useOverlayKeyboard,
  useOverlayLatest,
  useOverlayPresence,
  warnOverlayUnhosted,
  type OverlayExit,
} from '@/ui/overlay-host';
import { Press } from '@/ui/press';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

// default      an ordinary question: the confirm button is the filled main
//              button.
// destructive  saying yes cannot be taken back: the confirm button is written
//              in the failure red (the danger button), so the safe answer is
//              never the one that shouts.
export type DialogTone = 'default' | 'destructive';

// One of the choices of a dialog that asks "which one?".
export type DialogOption<T> = {
  // The words, already in the app's language.
  label: string;
  // What choosing it answers.
  value: T;
  icon?: IconName;
  // destructive: written in the failure red.
  tone?: DialogTone;
  // Cannot be chosen now: faint ink, and it takes no press.
  disabled?: boolean;
};

export type DialogProps<T = unknown> = {
  // Shown or not. The dialog stays mounted while it leaves.
  visible: boolean;
  // The question, in the app's language. It is also the dialog's spoken name.
  title: string;
  // What saying yes means, in a sentence or two.
  message?: string;
  // What the confirm button looks like. Default: default.
  tone?: DialogTone;
  // The words of the two buttons. Defaults: the library's OK and Cancel, in
  // the app's language (UIStrings).
  confirmLabel?: string;
  cancelLabel?: string;
  // Turns the dialog into "which one?": a row for each choice in place of the
  // confirm button, and Cancel under them.
  options?: readonly DialogOption<T>[];
  // The answer is being acted on. The confirm button shows the working mark
  // and keeps its size, nothing else can be pressed, and a tap outside or
  // back does not close the dialog. Close it yourself when the work is done.
  busy?: boolean;
  onConfirm?: () => void;
  onChoose?: (value: T) => void;
  // Cancel, a tap outside the card, Android back, the escape gesture of a
  // screen reader.
  onCancel?: () => void;
  // It has left the screen and is gone.
  onClosed?: () => void;
  // Asks for the reduced-motion form (it fades, nothing scales) whatever the
  // phone says. The phone's own setting is always honoured as well.
  reduceMotion?: boolean;
  testID?: string;
  // Layout of the card (a narrower maxWidth). Merged last.
  style?: StyleProp<ViewStyle>;
  // More, between the message and the choices or buttons.
  children?: ReactNode;
};

// The card does not grow past this on a wide screen. It belongs to this
// component.
const MAX_WIDTH = 400;
// The card pops in from this scale, with its opacity. Never from nothing.
const POP_FROM = 0.96;

type Motions = { enter: () => void; leave: () => void; exit: OverlayExit };

type DialogCardProps<T> = Omit<DialogProps<T>, 'onClosed' | 'confirmLabel' | 'cancelLabel'> & {
  confirmLabel: string;
  cancelLabel: string;
  // It has finished leaving.
  onExited: () => void;
};

// What is drawn in the host: the dimming, the area outside the card, and the
// card.
function DialogCard<T>({
  visible,
  title,
  message,
  tone = 'default',
  confirmLabel,
  cancelLabel,
  options,
  busy = false,
  onConfirm,
  onChoose,
  onCancel,
  onExited,
  reduceMotion = false,
  testID,
  style,
  children,
}: DialogCardProps<T>) {
  const { colors } = useTheme();
  const insets = useOverlayInsets();
  const phoneReduced = useReducedMotion();
  const reduced = phoneReduced || reduceMotion;

  // 0 away, 1 in place.
  const shown = useSharedValue(0);
  const leaving = useSharedValue(false);

  const [layerHeight, setLayerHeight] = useState(0);
  const heading = useRef<ViewInstance>(null);
  const motions = useRef<Motions | null>(null);

  const cover = useOverlayKeyboard(layerHeight);
  const latest = useOverlayLatest({ busy, onCancel });

  const cancel = () => {
    const now = latest.current;
    if (!now.busy) now.onCancel?.();
  };

  // Asked for again after it had gone: it comes back.
  const comeBack = () => {
    const move = motions.current;
    if (move !== null) scheduleOnUI(move.enter);
  };
  const ending = useOverlayExit(visible, onExited, comeBack);
  // Called from the UI thread when the card has finished leaving.
  const left = ending.left;

  const settle = spring('settle', reduced);
  const exit = timing(duration.exit, 'exit', reduced);
  const fading = fade();

  const enter = () => {
    'worklet';
    leaving.set(false);
    // It arrives on a spring that does not overshoot. Reduced motion: it fades.
    shown.set(reduced ? withTiming(1, fading) : withSpring(1, settle));
  };

  const leave = () => {
    'worklet';
    if (leaving.get()) return;
    leaving.set(true);
    // It leaves on the exit curve. Reduced motion: it fades.
    shown.set(
      withTiming(0, reduced ? fading : exit, (finished?: boolean) => {
        'worklet';
        // Not finished: it was asked for again before it had gone.
        if (!finished) return;
        leaving.set(false);
        scheduleOnRN(left);
      }),
    );
  };

  const scrimMotion = useAnimatedStyle<ViewStyle>(() => ({
    opacity: Math.min(Math.max(shown.get(), 0), 1),
  }));

  const cardMotion = useAnimatedStyle<ViewStyle>(() => {
    const progress = Math.min(Math.max(shown.get(), 0), 1);
    return {
      opacity: progress,
      transform: [{ scale: reduced ? 1 : POP_FROM + (1 - POP_FROM) * progress }],
    };
  });

  useEffect(() => {
    motions.current = { enter, leave, exit: ending };
  });

  useEffect(() => {
    const move = motions.current;
    if (move === null) return;
    if (visible) {
      move.exit.stay();
      scheduleOnUI(move.enter);
    } else if (move.exit.isAway()) {
      // Already out of sight: there is nothing to see leave.
      move.exit.finish();
    } else {
      scheduleOnUI(move.leave);
    }
  }, [visible]);

  useOverlayDismiss(visible, cancel);
  useOverlayFocus(heading, visible);

  const measureLayer = (event: LayoutChangeEvent) => setLayerHeight(event.nativeEvent.layout.height);

  const web = Platform.OS === 'web';
  const asksWhich = options !== undefined;
  const hasMore = children !== undefined && children !== null && typeof children !== 'boolean';
  const hasBody = message !== undefined || asksWhich || hasMore;
  // Clear of the status bar, and of the home bar or the keyboard, whichever
  // reaches higher.
  const margins = {
    paddingTop: insets.top + space.xxl,
    paddingBottom: Math.max(cover, insets.bottom) + space.xxl,
  };

  return (
    <View
      testID={testID}
      onLayout={measureLayer}
      accessibilityViewIsModal
      aria-modal
      onAccessibilityEscape={cancel}
      style={[styles.root, visible ? styles.open : styles.closing]}>
      <Animated.View aria-hidden style={[styles.scrim, { backgroundColor: colors.scrim }, scrimMotion]} />
      {/* The area outside the card. To a screen reader it is a button that
          cancels. While the answer is being acted on a plain view stands
          there, so a touch outside the card still goes nowhere. */}
      {busy ? (
        <View aria-hidden style={styles.outside} />
      ) : (
        <Press feedback="none" accessibilityLabel={cancelLabel} onPress={cancel} style={styles.outside} />
      )}
      <View style={[styles.margins, margins]}>
        <View style={styles.room}>
          {/* The caller's style adjusts the card; the movement stays the dialog's own. */}
          <Animated.View
            role={web ? 'alertdialog' : undefined}
            aria-label={web ? title : undefined}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style, cardMotion]}>
            <View
              ref={heading}
              tabIndex={web ? -1 : undefined}
              accessible
              accessibilityRole="header"
              accessibilityLabel={title}>
              <Txt variant="heading">{title}</Txt>
            </View>
            {hasBody ? (
              <ScrollView
                style={styles.scroller}
                contentContainerStyle={styles.body}
                alwaysBounceVertical={false}
                keyboardShouldPersistTaps="handled">
                {message !== undefined ? <Txt tone="soft">{message}</Txt> : null}
                {children}
                {options !== undefined ? (
                  <View style={styles.options}>
                    {options.map((option, index) => (
                      <ListRow
                        key={`${index}:${option.label}`}
                        size="sm"
                        icon={option.icon}
                        title={option.label}
                        variant={option.tone === 'destructive' ? 'destructive' : 'plain'}
                        disabled={busy || option.disabled === true}
                        onPress={() => onChoose?.(option.value)}
                      />
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
            <View style={styles.actions}>
              <Button variant="plain" label={cancelLabel} disabled={busy} onPress={cancel} style={styles.action} />
              {asksWhich ? null : (
                <Button
                  variant={tone === 'destructive' ? 'danger' : 'main'}
                  label={confirmLabel}
                  busy={busy}
                  onPress={onConfirm}
                  style={styles.action}
                />
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// A question in the middle of the screen, drawn by the app (never the phone's
// own alert box, which a browser does not show and which cannot be styled):
//   <Dialog visible={asking} title={t('files.removeTitle')} message={t('files.removeBody')} tone="destructive"
//     confirmLabel={t('common.remove')} onConfirm={remove} onCancel={() => setAsking(false)} />
// Most screens do not write one: they ask through useDialog().
//
// A card (radius 28, a 1 line edge, no shadow) over the dimming. It pops in
// from 96 percent with its opacity on the settle spring, and leaves on the
// exit curve; with reduced motion it only fades. Cancel, a tap outside,
// Android back and the escape gesture of a screen reader all cancel. Two
// buttons sit side by side and stack, confirm on top, when their words no
// longer fit. A long message scrolls inside the card; the buttons stay.
//
// Its content is drawn in the OverlayHost, above every sheet. While it is
// open nothing under it can be reached. Needs OverlayHost above it.
export function Dialog<T = unknown>({
  visible,
  confirmLabel,
  cancelLabel,
  onClosed,
  children,
  ...rest
}: DialogProps<T>) {
  const strings = useUIStrings();
  const { present, round, exited } = useOverlayPresence(visible);

  useEffect(() => {
    // One question at a time: the keyboard of the screen under it goes away.
    if (visible) Keyboard.dismiss();
  }, [visible]);

  if (!present) return null;

  return (
    <Overlay layer="dialog">
      <DialogCard
        key={round}
        {...rest}
        visible={visible}
        confirmLabel={confirmLabel ?? strings.ok}
        cancelLabel={cancelLabel ?? strings.cancel}
        onExited={() => {
          exited();
          onClosed?.();
        }}>
        {children}
      </DialogCard>
    </Overlay>
  );
}

// --- Asking from anywhere --------------------------------------------------------

export type ConfirmRequest = {
  title: string;
  message?: string;
  // Defaults: the library's OK and Cancel.
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};

export type ChooseRequest<T> = {
  title: string;
  message?: string;
  options: readonly DialogOption<T>[];
  cancelLabel?: string;
};

export type DialogController = {
  // Asks yes or no. true for the confirm button; false for Cancel, a tap
  // outside and Android back. It never rejects.
  confirm: (request: ConfirmRequest) => Promise<boolean>;
  // Asks which one. The value of the chosen option, or null when nothing was
  // chosen. It never rejects.
  choose: <T>(request: ChooseRequest<T>) => Promise<T | null>;
};

type Question =
  | { id: number; kind: 'confirm'; request: ConfirmRequest; answer: (yes: boolean) => void }
  | { id: number; kind: 'choose'; request: ChooseRequest<unknown>; answer: (value: unknown) => void };

const DialogContext = createContext<DialogController | null>(null);
// What a sheet (or another dialog) holds is drawn in the host, outside this
// provider. The controller travels with it, so useDialog() works there too.
carryIntoOverlays(DialogContext);

export type DialogProviderProps = {
  children?: ReactNode;
};

// Lets any screen ask a question and wait for the answer:
//   const dialog = useDialog();
//   const yes = await dialog.confirm({ title: t('files.removeTitle'), message: t('files.removeBody'),
//     confirmLabel: t('common.remove'), tone: 'destructive' });
//   if (yes) remove();
//
//   const where = await dialog.choose({ title: t('report.shareTitle'), options: [
//     { label: t('report.asPicture'), value: 'picture', icon: 'share' },
//     { label: t('report.asText'), value: 'text', icon: 'copy' },
//   ] });
//
// One question at a time: a second one waits until the first has been
// answered and has left. The answer is given the moment a button is pressed;
// the card leaves after it.
//
// Mount it once, inside OverlayHost. With no host above it a question cannot
// be shown, so it is answered "no" at once and never left waiting. Questions
// still waiting when the provider itself is taken away are answered "no" as
// well.
export function DialogProvider({ children }: DialogProviderProps) {
  const hosted = useOverlayHosted();
  const [queue, setQueue] = useState<readonly Question[]>([]);
  // The question on screen has been answered and is leaving.
  const [answered, setAnswered] = useState<number | null>(null);
  const count = useRef(0);
  const waiting = useOverlayLatest(queue);

  useEffect(() => {
    return () => {
      // Answering twice does nothing, so the one already answered is safe.
      for (const question of waiting.current) {
        if (question.kind === 'confirm') question.answer(false);
        else question.answer(null);
      }
    };
  }, [waiting]);

  const confirm = (request: ConfirmRequest) =>
    new Promise<boolean>((resolve) => {
      if (!hosted) {
        warnOverlayUnhosted();
        resolve(false);
        return;
      }
      count.current += 1;
      const question: Question = { id: count.current, kind: 'confirm', request, answer: resolve };
      setQueue((now) => [...now, question]);
    });

  const choose = <T,>(request: ChooseRequest<T>) =>
    new Promise<T | null>((resolve) => {
      if (!hosted) {
        warnOverlayUnhosted();
        resolve(null);
        return;
      }
      count.current += 1;
      const question: Question = {
        id: count.current,
        kind: 'choose',
        request,
        answer: resolve as (value: unknown) => void,
      };
      setQueue((now) => [...now, question]);
    });

  const controller: DialogController = { confirm, choose };

  const asked = queue.length > 0 ? queue[0] : undefined;
  let card: ReactNode = null;
  if (asked !== undefined) {
    const visible = answered !== asked.id;
    const afterIt = () => {
      setQueue((now) => now.filter((question) => question.id !== asked.id));
      setAnswered((now) => (now === asked.id ? null : now));
    };
    if (asked.kind === 'confirm') {
      const reply = (yes: boolean) => {
        asked.answer(yes);
        setAnswered(asked.id);
      };
      card = (
        <Dialog
          key={asked.id}
          visible={visible}
          title={asked.request.title}
          message={asked.request.message}
          tone={asked.request.tone}
          confirmLabel={asked.request.confirmLabel}
          cancelLabel={asked.request.cancelLabel}
          onConfirm={() => reply(true)}
          onCancel={() => reply(false)}
          onClosed={afterIt}
        />
      );
    } else {
      const reply = (value: unknown) => {
        asked.answer(value);
        setAnswered(asked.id);
      };
      card = (
        <Dialog
          key={asked.id}
          visible={visible}
          title={asked.request.title}
          message={asked.request.message}
          cancelLabel={asked.request.cancelLabel}
          options={asked.request.options}
          onChoose={reply}
          onCancel={() => reply(null)}
          onClosed={afterIt}
        />
      );
    }
  }

  return (
    <DialogContext.Provider value={controller}>
      {children}
      {card}
    </DialogContext.Provider>
  );
}

// The way to ask a question from a screen. Needs DialogProvider above it.
export function useDialog(): DialogController {
  const dialog = useContext(DialogContext);
  if (dialog === null) throw new Error('useDialog must be used inside DialogProvider');
  return dialog;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill },
  // Open, it takes every touch on the screen. Leaving, it takes none.
  open: { pointerEvents: 'box-none' },
  closing: { pointerEvents: 'none' },
  scrim: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  outside: { ...StyleSheet.absoluteFill },
  // 24 clear of each side of the screen; top and bottom are added at render.
  margins: { flex: 1, paddingHorizontal: space.xxl, pointerEvents: 'box-none' },
  // The room the card may fill. No padding of its own, so "100 percent" is
  // exactly this.
  room: { flex: 1, alignItems: 'center', justifyContent: 'center', pointerEvents: 'box-none' },
  // Radius 28 and a 1 line edge (brand spec, section 6). A dialog is not one
  // of the four things that float, so it has no shadow: the dimming sets it
  // apart.
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    maxHeight: '100%',
    padding: space.xxl,
    gap: space.lg,
    borderRadius: radius.sheet,
    borderWidth: border.hairline,
  },
  // As tall as its content, and no taller than the card lets it be. It
  // reaches 8 past the words on each side, so the pressed paper of a choice
  // has room; the padding of `body` brings the words back in line.
  scroller: { flexGrow: 0, flexShrink: 1, marginHorizontal: -space.sm },
  body: { paddingHorizontal: space.sm, gap: space.md },
  // A row keeps 8 inside itself: pulled out by 8, its words line up with the
  // title.
  options: { marginHorizontal: -space.sm },
  // Side by side while both fit. When they do not, they stack with the
  // confirm button on top (the last one written takes the first line).
  actions: { flexDirection: 'row', flexWrap: 'wrap-reverse', gap: space.sm },
  action: { flexGrow: 1 },
});
