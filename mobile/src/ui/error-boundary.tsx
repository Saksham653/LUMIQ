import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';

import {
  MAX_FONT_SCALE,
  lineHeightFor,
  radius,
  rhythm,
  sizes,
  space,
  textFont,
  typeScale,
  useTheme,
  type TypeVariant,
} from '@/theme';
import { EmptyState } from '@/ui/empty-state';
import { SomethingBrokeIllustration } from '@/ui/illustrations';
import { Press } from '@/ui/press';
import { useUIStrings } from '@/ui/strings';

// What stands between a crash in one part of the app and a blank screen.
// When something below it throws while drawing, the boundary shows a
// recovery view in its place: what happened, what to do, and one button that
// tries again. The failure is handed to `onError` for the error report and
// is never shown to the person.
//
//   <ErrorBoundary onError={reportError} onRestart={reloadApp}>
//     <App />
//   </ErrorBoundary>
//
//   <ErrorBoundary variant="section" resetKeys={[fileId]} onError={reportError}>
//     <ChartCard />
//   </ErrorBoundary>
//
// Its words are the library's errorTitle, errorBody and errorAction, in the
// app's language once the app passes them to UIStringsProvider.
//
// The recovery view is drawn with the library's own components. If those
// fail as well (the boundary sits above a provider they need, or the fault is
// in the library itself), a second, plainer view built from the bare
// platform takes over, so there is always something to read and a button to
// press.
//
// A boundary catches what is thrown while drawing. It does not catch what is
// thrown inside a press handler or after an await: those go to the app's own
// error report.

// screen   the boundary wraps a whole screen or the whole app: the recovery
//          view fills it, on the ground colour.
// section  the boundary wraps a part of a screen (one card, one chart): the
//          recovery view is compact and sits where the part was.
export type ErrorBoundaryVariant = 'screen' | 'section';

// What a recovery view of your own is given.
export type ErrorBoundaryRecovery = {
  // Whatever was thrown. For the report and for choosing words, never for
  // showing as it is.
  error: unknown;
  // Clears the failure and draws the content again.
  restart: () => void;
};

export type ErrorBoundaryProps = {
  children?: ReactNode;
  // Default screen.
  variant?: ErrorBoundaryVariant;
  // Told once for each failure, with React's own trail of components. Send
  // it to the error report. Never show it.
  onError?: (error: unknown, info: { componentStack: string | null }) => void;
  // Called when the person presses the button, just before the content is
  // drawn again. Put right whatever broke (drop the bad state, go back to a
  // safe screen), or reload the app from here.
  onRestart?: () => void;
  // When any of these changes after a failure, the content is drawn again by
  // itself: a new route, a new file.
  resetKeys?: readonly unknown[];
  // Your own recovery view, in place of the library's.
  fallback?: (recovery: ErrorBoundaryRecovery) => ReactNode;
};

export type ErrorRecoveryProps = {
  // Default screen.
  variant?: ErrorBoundaryVariant;
  // The button's press: try again.
  onRestart: () => void;
};

// --- The last resort ------------------------------------------------------------

// Catches a recovery view that fails itself, and shows the plain one.
class LastResort extends Component<{ plain: ReactNode; children?: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.plain : this.props.children;
  }
}

// The type style for bare text. The app's language is not known here (the
// app's own state may be what broke), so the words themselves choose the font
// and the height of the line.
function bare(variant: TypeVariant, words: string): TextStyle {
  const step = typeScale[variant];
  return {
    ...textFont(step.weight, 'en', words),
    fontSize: step.size,
    lineHeight: lineHeightFor(variant, 'en', words),
  };
}

// It uses a bare Text because Txt needs the app's state above it, and that
// state may be exactly what is missing. Everything here reads only the theme
// and the library's words, which need nothing above them. The button is as
// wide as the view, so its centred words get their width from it and are
// never cut.
function PlainRecovery({ variant, onRestart }: { variant: ErrorBoundaryVariant; onRestart: () => void }) {
  const { colors } = useTheme();
  const strings = useUIStrings();
  return (
    <View style={[styles.plain, variant === 'screen' && [styles.screen, { backgroundColor: colors.ground }]]}>
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[bare('heading', strings.errorTitle), styles.centredWords, { color: colors.ink }]}>
        {strings.errorTitle}
      </Text>
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[bare('body', strings.errorBody), styles.centredWords, { color: colors.inkSoft }]}>
        {strings.errorBody}
      </Text>
      <Press onPress={onRestart} style={[styles.plainButton, { backgroundColor: colors.action }]}>
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[bare('label', strings.errorAction), styles.centredWords, { color: colors.onAction }]}>
          {strings.errorAction}
        </Text>
      </Press>
    </View>
  );
}

// --- The recovery view ----------------------------------------------------------

// The drawing of a torn sheet, what happened, what to do, and the button
// that tries again, drawn with the library's own components.
function Recovery({ variant, onRestart }: { variant: ErrorBoundaryVariant; onRestart: () => void }) {
  const { colors } = useTheme();
  const strings = useUIStrings();

  useEffect(() => {
    // Android and the browser read a live region out by themselves. An iPhone
    // has to be told that the screen it was reading is gone.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(strings.errorTitle);
  }, [strings.errorTitle]);

  return (
    <View
      aria-live="polite"
      style={variant === 'screen' ? [styles.screen, { backgroundColor: colors.ground }] : undefined}>
      <EmptyState
        variant={variant}
        // The brand's own drawing for this moment, in ink like the rest: the
        // words beside it say what happened, so it stays silent.
        illustration={<SomethingBrokeIllustration size={variant === 'screen' ? 'md' : 'sm'} />}
        title={strings.errorTitle}
        body={strings.errorBody}
        action={{ label: strings.errorAction, onPress: onRestart }}
      />
    </View>
  );
}

// The recovery view by itself, for a boundary that is not this one. The
// router wraps every route in a boundary of its own and draws whatever the
// route file exports under the name ErrorBoundary (with the router's own
// props, `error` and `retry`). Hand it this view and a crash inside a route
// looks the same as a crash anywhere else:
//   export function ErrorBoundary({ error, retry }: RouteErrorProps) {
//     useEffect(() => reportError(error), [error]);
//     return <ErrorRecovery onRestart={() => void retry()} />;
//   }
// It carries the same last resort as the boundary below.
export function ErrorRecovery({ variant = 'screen', onRestart }: ErrorRecoveryProps) {
  return (
    <LastResort plain={<PlainRecovery variant={variant} onRestart={onRestart} />}>
      <Recovery variant={variant} onRestart={onRestart} />
    </LastResort>
  );
}

// A component of its own, so that a `fallback` that throws is caught by
// LastResort like any other failing view.
function OwnRecovery({
  draw,
  error,
  restart,
}: ErrorBoundaryRecovery & { draw: (recovery: ErrorBoundaryRecovery) => ReactNode }) {
  return <>{draw({ error, restart })}</>;
}

// --- The boundary ----------------------------------------------------------------

type BoundaryState = { failed: boolean; error: unknown };

// `failed` is kept apart from `error`: a thrown value can be anything,
// null included.
const WORKING: BoundaryState = { failed: false, error: null };

function keysChanged(before: readonly unknown[] | undefined, after: readonly unknown[] | undefined): boolean {
  if (before === after) return false;
  if (before === undefined || after === undefined || before.length !== after.length) return true;
  return before.some((key, at) => !Object.is(key, after[at]));
}

// A class, because only a class can catch what its children throw while
// they draw.
export class ErrorBoundary extends Component<ErrorBoundaryProps, BoundaryState> {
  state: BoundaryState = WORKING;

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { failed: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    try {
      this.props.onError?.(error, { componentStack: info.componentStack ?? null });
    } catch {
      // A reporter that fails must never take the recovery view down with it.
    }
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.failed && keysChanged(previous.resetKeys, this.props.resetKeys)) this.setState(WORKING);
  }

  restart = (): void => {
    try {
      this.props.onRestart?.();
    } catch {
      // Trying again must still happen when the app's own clean-up fails.
    }
    this.setState(WORKING);
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    const { fallback, variant = 'screen' } = this.props;
    if (fallback === undefined) return <ErrorRecovery variant={variant} onRestart={this.restart} />;
    return (
      <LastResort plain={<PlainRecovery variant={variant} onRestart={this.restart} />}>
        <OwnRecovery draw={fallback} error={this.state.error} restart={this.restart} />
      </LastResort>
    );
  }
}

const styles = StyleSheet.create({
  // Covers what was there. It grows to fill its parent (and is never
  // squeezed under its own content), and what it holds sits in the middle,
  // clear of the phone's own bars at the top and bottom.
  screen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: rhythm.screenEdge },
  plain: { gap: space.lg, paddingVertical: space.xl },
  centredWords: { textAlign: 'center', alignSelf: 'stretch' },
  // The main button (brand spec, section 6): at least 52 high, a pill. It
  // grows with its words.
  plainButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    minHeight: sizes.control,
    paddingHorizontal: space.xxl,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
});
