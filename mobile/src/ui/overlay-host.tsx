import {
  createContext,
  createElement,
  use,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type Context,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  Platform,
  StyleSheet,
  View,
  type KeyboardEvent as SoftKeyboardEvent,
  type StyleProp,
  type ViewInstance,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';

import { duration } from '@/theme';

// The one place sheets, dialogs and toasts are drawn. Mounted once, round the
// whole app:
//   <OverlayHost>
//     <DialogProvider>
//       <ToastProvider>
//         <Stack />
//       </ToastProvider>
//     </DialogProvider>
//   </OverlayHost>
//
// The app is its first child and three layers follow it, always in this
// order: sheets, then dialogs, then toasts. A later sibling is drawn over an
// earlier one, so a toast is above a dialog and a dialog is above a sheet
// because of where they are, never because of a zIndex. Inside one layer the
// one asked for last is on top.
//
// A Sheet, a Dialog or a Toast can be written anywhere under the host. What
// it holds is handed to the host and drawn there, so it reads the providers
// ABOVE the host, not the ones between the host and the place it was written.
// Put the host inside AppStateProvider (all text needs the app language),
// inside UIStringsProvider and the app's own providers, and inside the
// safe-area provider of the router. Two contexts are carried across for you:
// what a sheet holds can call useDialog() and useToast() (see
// carryIntoOverlays).
//
// The host is also a gesture root, so the drag of a sheet and the swipe of a
// toast work whether or not the app has a GestureHandlerRootView of its own.
//
// It draws in the app's own window. A route that the phone presents as its
// own modal window covers it: give such a route a host of its own.

// --- The store -----------------------------------------------------------------

export type OverlayLayer = 'sheet' | 'dialog' | 'toast';

type OverlayEntry = { id: string; node: ReactNode };

type OverlayStore = {
  subscribe: (listener: () => void) => () => void;
  read: (layer: OverlayLayer) => readonly OverlayEntry[];
  // Adds an overlay on top of its layer, or changes what one already there
  // holds without moving it.
  put: (layer: OverlayLayer, id: string, node: ReactNode) => void;
  drop: (layer: OverlayLayer, id: string) => void;
};

const NOTHING: readonly OverlayEntry[] = [];

// Kept outside React state: a sheet that changes re-renders its own layer and
// nothing else, least of all the app under it.
function createOverlayStore(): OverlayStore {
  let entries: Record<OverlayLayer, readonly OverlayEntry[]> = { sheet: NOTHING, dialog: NOTHING, toast: NOTHING };
  const listeners = new Set<() => void>();

  const change = (layer: OverlayLayer, next: readonly OverlayEntry[]) => {
    entries = { ...entries, [layer]: next };
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read(layer) {
      return entries[layer];
    },
    put(layer, id, node) {
      const now = entries[layer];
      const known = now.some((entry) => entry.id === id);
      change(layer, known ? now.map((entry) => (entry.id === id ? { id, node } : entry)) : [...now, { id, node }]);
    },
    drop(layer, id) {
      const now = entries[layer];
      if (now.some((entry) => entry.id === id)) {
        change(
          layer,
          now.filter((entry) => entry.id !== id),
        );
      }
    },
  };
}

const OverlayContext = createContext<OverlayStore | null>(null);

// --- The host ------------------------------------------------------------------

// A browser is told what is modal by aria-modal on the sheet or the dialog
// itself, and it objects to hiding the element that still has the keyboard
// focus. So only a phone hides what lies under a sheet or a dialog.
const HIDES_WHAT_IS_UNDER = Platform.OS !== 'web';

// The app itself. While a sheet or a dialog is open nothing in it can be
// reached by a screen reader: the question on top is the only thing there.
function HostContent({ store, children }: { store: OverlayStore; children?: ReactNode }) {
  const isCovered = () => store.read('sheet').length + store.read('dialog').length > 0;
  const covered = useSyncExternalStore(store.subscribe, isCovered, isCovered);
  return (
    <View style={styles.content} aria-hidden={HIDES_WHAT_IS_UNDER && covered}>
      {children}
    </View>
  );
}

function HostLayer({ store, layer }: { store: OverlayStore; layer: OverlayLayer }) {
  const readLayer = () => store.read(layer);
  const countDialogs = () => store.read('dialog').length;
  const entries = useSyncExternalStore(store.subscribe, readLayer, readLayer);
  const dialogs = useSyncExternalStore(store.subscribe, countDialogs, countDialogs);

  if (entries.length === 0) return null;

  // The top question holds the screen reader. The layer is a sibling of the
  // app, which is what an iPhone needs to keep VoiceOver out of the app; the
  // app and anything lower are also hidden outright (Android has no such
  // switch).
  const question = layer !== 'toast';
  const modal = layer === 'dialog' || (layer === 'sheet' && dialogs === 0);
  const under = layer === 'sheet' && dialogs > 0;
  const top = entries.length - 1;

  return (
    <View style={styles.layer} accessibilityViewIsModal={modal} aria-hidden={HIDES_WHAT_IS_UNDER && under}>
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.layer} aria-hidden={HIDES_WHAT_IS_UNDER && question && index < top}>
          {entry.node}
        </View>
      ))}
    </View>
  );
}

export type OverlayHostProps = {
  // Layout of the host. It fills its parent, and its parent must be the whole
  // window: overlays are placed against the host's own edges.
  style?: StyleProp<ViewStyle>;
  // The app.
  children?: ReactNode;
};

export function OverlayHost({ style, children }: OverlayHostProps) {
  const [store] = useState(createOverlayStore);
  return (
    <OverlayContext.Provider value={store}>
      <GestureHandlerRootView style={[styles.host, style]}>
        <HostContent store={store}>{children}</HostContent>
        <HostLayer store={store} layer="sheet" />
        <HostLayer store={store} layer="dialog" />
        <HostLayer store={store} layer="toast" />
      </GestureHandlerRootView>
    </OverlayContext.Provider>
  );
}

// --- Drawing into the host -------------------------------------------------------

let warnedUnhosted = false;

// Says once, to the developer and only while developing, why nothing showed.
export function warnOverlayUnhosted(): void {
  if (!__DEV__ || warnedUnhosted) return;
  warnedUnhosted = true;
  console.warn(
    'A Sheet, Dialog or Toast was asked for with no OverlayHost above it, so nothing was drawn. Mount <OverlayHost> once, round the app.',
  );
}

// The contexts that travel with an overlay from where it is written to where
// it is drawn.
const carried: Context<unknown>[] = [];

// What an overlay holds is drawn in the host, outside every provider that
// sits between the host and the place the overlay was written. A provider
// that has to live inside the host (DialogProvider, ToastProvider) names its
// context here, once, at module scope: the value is then read where the
// overlay is written and provided again where it is drawn, so a row inside a
// sheet can ask a question or show a toast like any other part of the screen.
export function carryIntoOverlays<T>(context: Context<T>): void {
  const one = context as unknown as Context<unknown>;
  if (!carried.includes(one)) carried.push(one);
}

export type OverlayProps = {
  layer: OverlayLayer;
  children?: ReactNode;
};

// Draws its children in a layer of the host for as long as it is mounted. It
// takes no room where it is written. Sheet, Dialog and Toast are built on it;
// a screen uses those.
export function Overlay({ layer, children }: OverlayProps) {
  const store = useContext(OverlayContext);
  const id = useId();

  // `use` may be called in a loop (useContext may not), so the list can grow
  // when a file that carries a context is first loaded.
  let node: ReactNode = children;
  for (const context of carried) {
    node = createElement(context.Provider, { value: use(context) }, node);
  }

  useEffect(() => {
    if (store === null) {
      warnOverlayUnhosted();
      return;
    }
    store.put(layer, id, node);
  }, [store, layer, id, node]);

  useEffect(() => {
    if (store === null) return undefined;
    return () => store.drop(layer, id);
  }, [store, layer, id]);

  return null;
}

// True when there is an OverlayHost above. Without one nothing can be shown:
// a provider answers "no" at once instead of waiting for a dialog that will
// never appear.
export function useOverlayHosted(): boolean {
  return useContext(OverlayContext) !== null;
}

// --- What the three overlays share -------------------------------------------------

// A finger let go faster than this, in dp per second, has flicked the thing
// away however short the way it travelled. It stands beside
// `sheetDismissTravel` and belongs in the motion tokens with it; until it is
// there, this is the one place it is written.
export const OVERLAY_FLICK_SPEED = 900;

// A ref that always holds the newest value. For what a long-lived callback
// needs to read when it finally runs: the end of an animation, a back press,
// a gesture. Read it there, never while rendering.
export function useOverlayLatest<T>(value: T): RefObject<T> {
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export type OverlayPresence = {
  // Mounted: asked for, or still on its way out.
  present: boolean;
  // Goes up each time it has left, so the next showing starts as a new thing
  // (use it as the key of what is drawn).
  round: number;
  // Call when it has finished leaving.
  exited: () => void;
};

// Keeps an overlay mounted from the moment it is asked for until it has
// finished leaving.
export function useOverlayPresence(visible: boolean): OverlayPresence {
  const [mounted, setMounted] = useState(visible);
  const [round, setRound] = useState(0);

  // Being asked for mounts it in the same render (state that follows a prop).
  if (visible && !mounted) setMounted(true);

  const exited = () => {
    setMounted(false);
    setRound((now) => now + 1);
  };

  return { present: visible || mounted, round, exited };
}

// How long an overlay that has gone out of sight waits before it decides it
// is still wanted. A finger sends it away on the UI thread and `onClose` is
// answered through React, which may be busy with a calculation for a moment.
// Without the wait, a sheet flicked away at such a moment would come back up
// and leave a second time. It is a wait, not a movement, and it borrows the
// brand's quick beat.
const SECOND_THOUGHT = duration.quick;

type ExitState = { away: boolean; gone: boolean; timer: ReturnType<typeof setTimeout> | null };

export type OverlayExit = {
  // Its leaving animation has ended and it is out of sight. Call it from the
  // end of that animation (through scheduleOnRN).
  left: () => void;
  // It is asked for. Whatever `left` was waiting on is dropped.
  stay: () => void;
  // True while it is out of sight with nothing decided yet: there is nothing
  // to see leave, so call `finish` in place of the leaving animation.
  isAway: () => boolean;
  // Reports it gone (`onExited`), once.
  finish: () => void;
};

// What happens once an overlay has finished leaving. No longer asked for: it
// is reported gone, once. Still asked for (a drag sent it away and whoever
// shows it said no): after a moment it comes back (`comeBack`), rather than
// stay out of sight and in the way.
export function useOverlayExit(visible: boolean, onExited: () => void, comeBack: () => void): OverlayExit {
  const latest = useOverlayLatest({ visible, onExited, comeBack });
  const state = useRef<ExitState>({ away: false, gone: false, timer: null });

  const finish = () => {
    const now = state.current;
    if (now.gone) return;
    now.gone = true;
    now.away = false;
    latest.current.onExited();
  };

  const left = () => {
    const now = state.current;
    if (now.gone) return;
    if (!latest.current.visible) {
      finish();
      return;
    }
    now.away = true;
    if (now.timer !== null) clearTimeout(now.timer);
    now.timer = setTimeout(() => {
      now.timer = null;
      if (!now.away || now.gone) return;
      if (latest.current.visible) {
        now.away = false;
        latest.current.comeBack();
      } else {
        finish();
      }
    }, SECOND_THOUGHT);
  };

  const stay = () => {
    state.current.away = false;
  };

  const isAway = () => state.current.away;

  useEffect(() => {
    const now = state.current;
    return () => {
      if (now.timer !== null) clearTimeout(now.timer);
    };
  }, [state]);

  return { left, stay, isAway, finish };
}

// Escape closes the top question in the browser preview, and only the top
// one: one listener for the page, and the newest question answers it.
const escapeStack: RefObject<() => void>[] = [];

function onPageKey(event: { key: string }): void {
  if (event.key !== 'Escape') return;
  escapeStack[escapeStack.length - 1]?.current();
}

function listenForEscape(handler: RefObject<() => void>): () => void {
  if (typeof document === 'undefined') return () => {};
  if (escapeStack.length === 0) document.addEventListener('keydown', onPageKey);
  escapeStack.push(handler);
  return () => {
    const at = escapeStack.indexOf(handler);
    if (at !== -1) escapeStack.splice(at, 1);
    if (escapeStack.length === 0) document.removeEventListener('keydown', onPageKey);
  };
}

// While `active`, Android back (and Escape in the browser) calls `onDismiss`
// and goes no further: the app under the question does not move. The question
// opened last is asked first. It is subscribed once per showing, so a question
// that re-renders does not jump the queue.
export function useOverlayDismiss(active: boolean, onDismiss: () => void): void {
  const latest = useOverlayLatest(onDismiss);
  useEffect(() => {
    if (!active) return undefined;
    if (Platform.OS === 'web') return listenForEscape(latest);
    // Only Android has a back button to listen for.
    if (Platform.OS !== 'android') return undefined;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      latest.current();
      return true;
    });
    return () => back.remove();
  }, [active, latest]);
}

// While `active`, a screen reader starts at `target` (the heading of the
// question). In the browser the keyboard focus goes there, and goes back to
// where it was when the question leaves. A phone gives no way to ask where a
// screen reader was, so there it lands where the phone puts it.
export function useOverlayFocus(target: RefObject<ViewInstance | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    const node = target.current;
    if (Platform.OS !== 'web') {
      if (node !== null) AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
      return undefined;
    }
    if (typeof document === 'undefined') return undefined;
    const before = document.activeElement;
    node?.focus();
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    };
  }, [active, target]);
}

function keyboardTopNow(): number | null {
  if (Platform.OS === 'web' || !Keyboard.isVisible()) return null;
  return Keyboard.metrics()?.screenY ?? null;
}

// How much of a layer the keyboard covers, in dp, measured from the layer's
// bottom edge. `layerHeight` is the height of the layer (the host fills the
// window, so its top is the top of the window). Pad the bottom of what must
// stay in view by this much.
//
// The change is handed to the phone's own layout animation, so on an iPhone
// the thing rides up with the keyboard. Android reports the keyboard once it
// has arrived, and the thing steps up then. A browser moves its own page and
// reports nothing: there this is always 0.
export function useOverlayKeyboard(layerHeight: number): number {
  // Where the top edge of the keyboard is on the screen, or null without one.
  const [top, setTop] = useState<number | null>(keyboardTopNow);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const moved = (event: SoftKeyboardEvent) => {
      if (event) Keyboard.scheduleLayoutAnimation(event);
      setTop(event ? event.endCoordinates.screenY : null);
    };
    const hid = (event: SoftKeyboardEvent) => {
      if (event) Keyboard.scheduleLayoutAnimation(event);
      setTop(null);
    };
    // An iPhone says where the keyboard is going before it moves.
    const early = Platform.OS === 'ios';
    const shown = Keyboard.addListener(early ? 'keyboardWillShow' : 'keyboardDidShow', moved);
    const hidden = Keyboard.addListener(early ? 'keyboardWillHide' : 'keyboardDidHide', hid);
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  // A top edge of 0 is not a keyboard that covers the whole screen: it is how
  // an iPhone set to cross-fade reports one that is leaving.
  if (top === null || top <= 0 || layerHeight <= 0) return 0;
  return Math.max(0, layerHeight - top);
}

const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

// The safe area of the window (the status bar, the home bar). Zero when no
// safe-area provider is above the host, so a host never fails for want of
// one.
export function useOverlayInsets(): EdgeInsets {
  return useContext(SafeAreaInsetsContext) ?? NO_INSETS;
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  content: { flex: 1 },
  // Fills the host and takes no touch itself: only what it holds does, so the
  // app under an empty stretch of a layer stays in reach.
  layer: { ...StyleSheet.absoluteFill, pointerEvents: 'box-none' },
});
