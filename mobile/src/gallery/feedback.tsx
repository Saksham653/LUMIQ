import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { border, duration, numeralLine, radius, rhythm, sizes, space, useReducedMotion, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { ErrorBoundary, type ErrorBoundaryRecovery } from '@/ui/error-boundary';
import { ErrorNote } from '@/ui/error-note';
import * as haptics from '@/ui/haptics';
import { Icon } from '@/ui/icon';
import { AllCheckedIllustration, EmptyChatIllustration, NoFilesIllustration } from '@/ui/illustrations';
import { Notice, type NoticeTone } from '@/ui/notice';
import { Progress, ProgressBar, ProgressRing, type ProgressSize, type ProgressTone } from '@/ui/progress';
import { Skeleton, SkeletonBlock, SkeletonCard, SkeletonChart, SkeletonRow, SkeletonText } from '@/ui/skeleton';
import { HStack, VStack } from '@/ui/stack';
import { UIStringsProvider } from '@/ui/strings';
import { Txt } from '@/ui/text';

// The gallery's page for the feedback group: what the app shows while it
// waits (Skeleton, Progress), when it has nothing (EmptyState), when it has
// something to say (Notice), when something fails (ErrorNote) and when a part
// of it crashes (ErrorBoundary). Every variant, size and state is here, and
// everything that can be pressed does something.
//
// Developer-facing: the captions and the sample words are plain English (and
// a little Hindi, to show long text) on purpose and are not in the app's
// translations. Nothing here ships in a screen.

// How long a pretend load, retry or wait lasts here. Nothing is really
// loading; the time only has to be long enough to look at.
const PRETEND_WAIT = duration.launch;
// One press of "More" or "Less".
const STEP = 0.2;
// The room a pretend screen is given: eight list rows high.
const SCREEN = sizes.row * 8;

const TONES: readonly NoticeTone[] = ['info', 'good', 'warn', 'bad'];
const SIZES: readonly ProgressSize[] = ['sm', 'md', 'lg'];
const BAR_TONES: readonly ProgressTone[] = ['ink', 'action'];

const TONE_LINE: Record<NoticeTone, string> = {
  info: 'Info: large files take a little longer',
  good: 'Good: no empty cells in the eight columns',
  warn: 'Warn: two dates are written as text',
  bad: 'Bad: this file could not be opened',
};

// Sample failures, one for each kind ErrorNote can sort.
const OFFLINE = { code: 'offline', message: 'No internet connection.' };
const TIMED_OUT = { code: 'NETWORK_TIMEOUT', message: 'This is taking longer than usual.' };
const UNVERIFIED = { code: 'could-not-verify', message: 'Two numbers in this answer could not be checked.' };
const OUT_OF_QUESTIONS = { code: 'device_limit', message: 'No questions left today.' };
const LOCKED = { code: 'file_locked', message: 'This file is locked with a password.' };
const THROWN = new Error("ENOENT: no such file or directory, open '/data/user/0/cache/picked-file/sales.csv'");
// What a phone throws when a request cannot leave it.
const NO_NETWORK = new TypeError('Network request failed');
// A server's answer with nothing but its number: asked too often.
const ASKED_TOO_OFTEN = { status: 429 };
// A failure inside a failure, the way a server hands one back.
const WRAPPED = { error: { code: 'NETWORK_TIMEOUT' } };

// Long Hindi, to see that every piece grows with its words.
const HINDI = {
  emptyTitle: 'अभी कोई फ़ाइल नहीं है',
  emptyBody: 'अपनी Excel या CSV फ़ाइल खोलें और आसान शब्दों में जवाब पाएं। आपकी फ़ाइल आपके फ़ोन में ही रहती है।',
  emptyAction: 'फ़ाइल जोड़ें (Excel या CSV)',
  errorTitle: 'इंटरनेट कनेक्शन नहीं है।',
  errorBody: 'कनेक्ट करके फिर कोशिश करें। इंटरनेट लौटते ही आप यहीं से अपना सवाल दोबारा भेज सकते हैं।',
  noticeTitle: 'ऊपर की दो संख्याएँ हिसाब से मेल नहीं खा सकीं।',
  noticeBody: 'इस्तेमाल से पहले इन्हें खुद जाँच लें। बाकी सभी संख्याएँ आपके फ़ोन पर जाँची जा चुकी हैं।',
  retry: 'फिर कोशिश करें',
  remove: 'हटाएँ',
  close: 'बंद करें',
  progress: 'फ़ाइल की पंक्तियाँ पढ़ी जा रही हैं',
};

// The recovery screen's words as the app will pass them. Without a provider
// the library says its own English.
const BROKE_WORDS = {
  errorTitle: 'Something broke',
  errorBody: 'Your files are safe on this phone. Try again. If it keeps happening, close LUMIQ and open it again.',
  errorAction: 'Try again',
};
// The same three in Hindi, to see the recovery screen grow with its words.
const BROKE_WORDS_HINDI = {
  errorTitle: 'कुछ गड़बड़ हो गई',
  errorBody:
    'आपकी फ़ाइलें इस फ़ोन पर सुरक्षित हैं। फिर कोशिश करें। अगर ऐसा बार-बार हो, तो LUMIQ बंद करके दोबारा खोलें।',
  errorAction: 'फिर कोशिश करें',
};

// --- Small pieces of the page ---------------------------------------------------

function Part({ title, about, children }: { title: string; about: string; children: ReactNode }) {
  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Txt variant="heading" accessibilityRole="header">
          {title}
        </Txt>
        <Txt variant="small" tone="soft">
          {about}
        </Txt>
      </VStack>
      {children}
    </VStack>
  );
}

function Example({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <VStack gap="sm">
      <Txt variant="small" tone="soft">
        {caption}
      </Txt>
      {children}
    </VStack>
  );
}

// What the last press did. The line is shown in three parts of the page, so
// only one of them (`spoken`) says it to a screen reader.
function Pressed({ words, spoken = false }: { words: string; spoken?: boolean }) {
  return (
    <Txt variant="small" tone="faint" aria-live={spoken ? 'polite' : undefined}>
      {words}
    </Txt>
  );
}

// A card, to show a piece the way it sits inside one.
function Paper({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.paper, { backgroundColor: colors.surface, borderColor: colors.line }]}>{children}</View>
  );
}

// A pretend screen: the ground colour inside an edge, with the screen's own
// 16 at the sides. It is at least as high as a small phone screen and grows
// with what it holds.
function PretendScreen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.ground, borderColor: colors.line }]}>{children}</View>
  );
}

// --- Skeleton ---------------------------------------------------------------------

function SampleRow({ title, detail }: { title: string; detail: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: colors.surfaceSunk }]}>
        <Icon name="file" color={colors.inkSoft} />
      </View>
      <VStack style={styles.grow}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="small" tone="soft">
          {detail}
        </Txt>
      </VStack>
    </View>
  );
}

// The content the placeholder below stands in for, piece for piece.
function LoadedSample() {
  return (
    <VStack gap="md">
      <Paper>
        <Txt variant="small" tone="soft">
          sales-2025.xlsx
        </Txt>
        <Txt variant="heading">December was your best month</Txt>
        <Txt tone="soft">
          Grocery brought in the most revenue, and February was the quietest month of the year. Open Insights to see
          every month side by side.
        </Txt>
      </Paper>
      <SampleRow title="shop-stock-march.csv" detail="Added last week" />
      <SampleRow title="school-fees-2025.xlsx" detail="Added in March" />
    </VStack>
  );
}

function LoadingDemo() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setLoading(false), PRETEND_WAIT);
    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <VStack gap="md">
      <Button
        variant="quiet"
        size="sm"
        label="Load again"
        busy={loading}
        onPress={() => setLoading(true)}
        style={styles.start}
      />
      {loading ? (
        <Skeleton label="Loading the sample" style={styles.stack}>
          <SkeletonCard>
            <SkeletonText lines={1} variant="small" width="40%" />
            <SkeletonText lines={1} variant="heading" width="82%" />
            <SkeletonText lines={3} />
          </SkeletonCard>
          <SkeletonRow />
          <SkeletonRow />
        </Skeleton>
      ) : (
        <LoadedSample />
      )}
    </VStack>
  );
}

// --- ErrorNote --------------------------------------------------------------------

type FailPhase = 'fine' | 'failed' | 'retrying';

function FailDemo() {
  const [phase, setPhase] = useState<FailPhase>('fine');

  useEffect(() => {
    if (phase !== 'retrying') return undefined;
    const timer = setTimeout(() => setPhase('fine'), PRETEND_WAIT);
    return () => clearTimeout(timer);
  }, [phase]);

  const fail = () => {
    // One error tap in the hand, at the moment the failure is known, together
    // with the words that say why. The note itself never fires one.
    haptics.error();
    setPhase('failed');
  };

  return (
    <VStack gap="sm">
      <Button
        variant="quiet"
        size="sm"
        label="Make it fail"
        disabled={phase !== 'fine'}
        onPress={fail}
        style={styles.start}
      />
      <ErrorNote
        error={phase === 'fine' ? null : OFFLINE}
        onRetry={() => setPhase('retrying')}
        retrying={phase === 'retrying'}>
        Connect and try again.
      </ErrorNote>
      {phase === 'fine' ? (
        <Txt variant="small" tone="faint">
          Nothing has failed: error is null, so the note draws nothing at all.
        </Txt>
      ) : null}
    </VStack>
  );
}

// --- Notice -----------------------------------------------------------------------

function DismissDemo() {
  const [shown, setShown] = useState(true);
  return shown ? (
    <Notice title="Large files take a little longer" onDismiss={() => setShown(false)}>
      You can leave this screen. LUMIQ keeps going.
    </Notice>
  ) : (
    <Button variant="quiet" size="sm" label="Show it again" onPress={() => setShown(true)} style={styles.start} />
  );
}

// --- Progress ---------------------------------------------------------------------

function ValueDemo() {
  // null is "the amount is not known".
  const [value, setValue] = useState<number | null>(0.4);
  const outOf = value === null ? undefined : `${Math.round(value * 100)} out of 100`;

  // Kept to whole tenths, so the presses of Less end exactly on nothing.
  const move = (by: number) => {
    setValue((now) => Math.min(Math.max(Math.round(((now ?? 0) + by) * 10) / 10, 0), 1));
  };

  return (
    <VStack gap="lg">
      <HStack gap="sm" wrap>
        <Button
          variant="quiet"
          size="sm"
          label="Less"
          disabled={value === null || value <= 0}
          onPress={() => move(-STEP)}
        />
        <Button
          variant="quiet"
          size="sm"
          label="More"
          disabled={value !== null && value >= 1}
          onPress={() => move(STEP)}
        />
        <Button variant="plain" size="sm" label="Not known" disabled={value === null} onPress={() => setValue(null)} />
      </HStack>
      <Txt variant="small" tone="faint" aria-live="polite">
        {outOf === undefined ? 'value is null: the amount is not known' : `value is ${outOf}`}
      </Txt>

      {SIZES.map((size) => (
        <Example key={size} caption={`ProgressBar, size ${size}`}>
          <ProgressBar value={value} size={size} label="Reading rows" valueText={outOf} />
        </Example>
      ))}

      <Example caption="ProgressRing, sizes sm, md and lg. Nothing yet is the empty track; not known is a ring of dashes that breathes and never spins.">
        <HStack gap="xl" wrap>
          {SIZES.map((size) => (
            <ProgressRing key={size} value={value} size={size} label="Reading rows" valueText={outOf} />
          ))}
        </HStack>
      </Example>

      <Example caption="ProgressRing, lg, with an icon in its middle, in both tones">
        <HStack gap="xl" wrap>
          {BAR_TONES.map((tone) => (
            <ProgressRing key={tone} value={value} size="lg" tone={tone} label="Opening the file" valueText={outOf}>
              <Icon name="file" />
            </ProgressRing>
          ))}
        </HStack>
      </Example>

      {BAR_TONES.map((tone) => (
        <Example key={tone} caption={`ProgressBar, tone ${tone}`}>
          <ProgressBar value={value} tone={tone} label="Reading rows" valueText={outOf} />
        </Example>
      ))}

      <Example caption="Progress, the one name for both shapes: variant bar (the default) and variant ring">
        <HStack gap="lg">
          <Progress value={value} label="Reading rows" valueText={outOf} style={styles.grow} />
          <Progress variant="ring" value={value} size="sm" label="Reading rows" valueText={outOf} />
        </HStack>
      </Example>
    </VStack>
  );
}

// --- ErrorBoundary ----------------------------------------------------------------

// Draws, or throws while drawing, as it is told.
function Fragile({ broken }: { broken: boolean }) {
  if (broken) throw new Error('The gallery broke this part on purpose.');
  return <Notice tone="good" title="This part is working" />;
}

// section      the library's compact recovery view
// screen       the library's full recovery view, with the app's own words
// screenHindi  the same, with the words in Hindi
// own          a recovery view given by the caller
// lastResort   a recovery view that fails itself, so the plain one takes over
type BoundaryMode = 'section' | 'screen' | 'screenHindi' | 'own' | 'lastResort';

function BoundaryDemo({ mode }: { mode: BoundaryMode }) {
  const [broken, setBroken] = useState(false);
  const [reports, setReports] = useState(0);
  const whole = mode === 'screen' || mode === 'screenHindi';

  const fallback =
    mode === 'own'
      ? ({ restart }: ErrorBoundaryRecovery) => (
          <Notice
            tone="bad"
            title="This chart could not be drawn"
            action={{ label: 'Draw it again', onPress: restart }}
          />
        )
      : mode === 'lastResort'
        ? () => <Fragile broken />
        : undefined;

  const boundary = (
    <ErrorBoundary
      variant={whole ? 'screen' : 'section'}
      fallback={fallback}
      onError={() => setReports((count) => count + 1)}
      onRestart={() => setBroken(false)}>
      <Fragile broken={broken} />
    </ErrorBoundary>
  );

  return (
    <VStack gap="sm">
      <HStack gap="md" wrap>
        <Button variant="quiet" size="sm" label="Break this part" disabled={broken} onPress={() => setBroken(true)} />
        <Txt variant="small" tone="faint" aria-live="polite" style={styles.grow}>
          {`onError has been called ${reports} ${reports === 1 ? 'time' : 'times'}`}
        </Txt>
      </HStack>
      {whole ? (
        <PretendScreen>
          <UIStringsProvider strings={mode === 'screenHindi' ? BROKE_WORDS_HINDI : BROKE_WORDS}>
            {boundary}
          </UIStringsProvider>
        </PretendScreen>
      ) : (
        <Paper>{boundary}</Paper>
      )}
    </VStack>
  );
}

// --- The section --------------------------------------------------------------------

export type FeedbackGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the feedback group:
//   <FeedbackGallery />
// It needs AppStateProvider above it (its text reads the app language), sets
// no outer margin and does not scroll by itself: the gallery page spaces it
// and scrolls it.
export function FeedbackGallery({ style }: FeedbackGalleryProps) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState('Nothing pressed yet.');

  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Feedback
        </Txt>
        <Txt tone="soft">
          What the app shows while it waits, when it has nothing to show, when it has something to say, when something
          fails and when a part of it crashes. Every state is honest: loading has the shape of what is coming, unknown
          is never drawn as zero, and a failure says what happened and what to do next.
        </Txt>
        <Notice icon={reduced ? 'pause' : 'play'} title={reduced ? 'Less motion is on' : 'Less motion is off'}>
          {reduced
            ? 'Placeholders stand still, bars and rings jump to their value, a bar with no value shows its words where it would sweep, and a ring with no value keeps its dashes still.'
            : 'Placeholders breathe, bars and rings ease to their value, a bar with no value sweeps and a ring with no value breathes. Turn on less motion in the phone settings and open the app again to see the still forms.'}
        </Notice>
      </VStack>

      <Part
        title="Skeleton"
        about="Placeholders in the shape of what is coming. The outermost piece says Loading once to a screen reader and breathes for everything inside it, by opacity only. Each waits a moment before it shows, so a quick load never flashes one.">
        <Example caption="A whole screen while it loads, as one group. Press the button: the placeholder takes exactly the room of the content that follows.">
          <LoadingDemo />
        </Example>

        <Example caption="SkeletonText: one heading line at half width, three lines of body, two lines of small text. A line takes the room a real line of that step takes, at the phone's text size.">
          <Skeleton style={styles.stack}>
            <SkeletonText lines={1} variant="heading" width="50%" />
            <SkeletonText lines={3} />
            <SkeletonText lines={2} variant="small" />
          </Skeleton>
        </Example>

        <Example caption="SkeletonText for the two big steps: display and title">
          <Skeleton style={styles.stack}>
            <SkeletonText lines={1} variant="display" width="70%" />
            <SkeletonText lines={1} variant="title" width="56%" />
          </Skeleton>
        </Example>

        <Example caption="SkeletonBlock: a big number (the hero numeral's line), then a chip and a button as pills, then a picture with the card's corner">
          <Skeleton style={styles.stack}>
            <SkeletonBlock width={sizes.row * 3} height={numeralLine.hero} />
            <HStack gap="sm">
              <SkeletonBlock width={sizes.row * 2} height={sizes.target} radius="pill" />
              <SkeletonBlock width={sizes.row * 3} height={sizes.control} radius="pill" />
            </HStack>
            <SkeletonBlock height={sizes.row * 2} radius="card" />
          </Skeleton>
        </Example>

        <Example caption="SkeletonRow: with its icon tile and two lines, with one line, and without the tile">
          <Skeleton>
            <SkeletonRow />
            <SkeletonRow lines={1} />
            <SkeletonRow leading={false} />
          </Skeleton>
        </Example>

        <Example caption="SkeletonCard: a heading and three lines by default, a heading alone, and one holding its own pieces">
          <Skeleton style={styles.stack}>
            <SkeletonCard />
            <SkeletonCard lines={0} />
            <SkeletonCard>
              <SkeletonText lines={1} variant="label" width="44%" />
              <SkeletonChart />
            </SkeletonCard>
          </Skeleton>
        </Example>

        <Example caption="SkeletonChart: six bars by default, and twelve. It does not mirror in right-to-left languages, like the chart it stands in for.">
          <Skeleton style={styles.stack}>
            <SkeletonChart />
            <SkeletonChart bars={12} />
          </Skeleton>
        </Example>

        <Example caption="A piece used by itself is its own group. With delay 0 it is there in the very first frame (the app opening); with its own label a screen reader hears what is loading.">
          <SkeletonText lines={2} delay={0} label="Opening your file" />
        </Example>
      </Part>

      <Part
        title="EmptyState"
        about="What a screen shows when it has nothing to show: a drawing, one line, why, and one thing to do about it. An empty screen is an invitation to act.">
        <Pressed words={pressed} spoken />

        <Example caption="variant screen (the default): the opening line in display, the screen's one filled button with an icon, and a quieter second way on under it">
          <PretendScreen>
            <EmptyState
              illustration={<NoFilesIllustration />}
              title="No file yet"
              body="Add an Excel or CSV file to see what it says. Your file stays on your phone."
              action={{ label: 'Add a file', icon: 'add', onPress: () => setPressed('Add a file was pressed.') }}>
              <Button
                variant="plain"
                label="See it with the sample"
                onPress={() => setPressed('See it with the sample was pressed.')}
              />
            </EmptyState>
          </PretendScreen>
        </Example>

        <Example caption="variant section, inside a card: a heading line and a quiet button, so the screen's own main button stays the only filled one">
          <Paper>
            <EmptyState
              variant="section"
              illustration={<EmptyChatIllustration size="sm" />}
              title="No saved conversations yet"
              body="A conversation is saved here when you ask a question about this file."
              action={{ label: 'Ask a question', onPress: () => setPressed('Ask a question was pressed.') }}
            />
          </Paper>
        </Example>

        <Example caption="align start, for a card whose other content starts at the reading edge">
          <Paper>
            <EmptyState
              variant="section"
              align="start"
              illustration={<AllCheckedIllustration size="sm" />}
              title="Nothing worth a look"
              body="No value in this file is far from the rest."
            />
          </Paper>
        </Example>

        <Example caption="Words only: no drawing and no action">
          <Paper>
            <EmptyState variant="section" title="This file has no rows yet" />
          </Paper>
        </Example>

        <Example caption="Busy: the action is working, keeps its size and cannot be pressed again">
          <Paper>
            <EmptyState
              variant="section"
              title="No file yet"
              action={{ label: 'See it with the sample', busy: true, onPress: () => setPressed('This cannot happen.') }}
            />
          </Paper>
        </Example>

        <Example caption="Disabled: the action cannot be used, stays in view on plain paper, and a line under it says why">
          <Paper>
            <EmptyState
              variant="section"
              title="No file yet"
              action={{ label: 'Add a file', icon: 'add', disabled: true, onPress: () => setPressed('This cannot happen.') }}>
              <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
                This phone has no app to choose files with. Install a files app and try again.
              </Txt>
            </EmptyState>
          </Paper>
        </Example>

        <Example caption="Long Hindi text: the display line wraps, nothing is cut, and the button grows with its words">
          <PretendScreen>
            <EmptyState
              illustration={<NoFilesIllustration />}
              title={HINDI.emptyTitle}
              body={HINDI.emptyBody}
              action={{ label: HINDI.emptyAction, icon: 'add', onPress: () => setPressed('The Hindi button was pressed.') }}
            />
          </PretendScreen>
        </Example>
      </Part>

      <Part
        title="ErrorNote"
        about="Takes whatever was thrown and says what happened and what to do next. Amber for not yet (offline, too slow, could not be checked, no questions left), red for a failure or a refusal. A stack or an Error's own message is never shown; a code goes in one small faint line.">
        <Example caption="A failure arriving. Press the button: the note appears (a screen reader is told), with one error tap in the hand fired by the caller. Try again shows the busy state, then the failure clears.">
          <FailDemo />
        </Example>

        <Example caption="Amber, kind offline: an object with code 'offline' and a message. Its own icon, the message as the title, the code in the faint line.">
          <ErrorNote error={OFFLINE} live={false} onRetry={() => setPressed('Try again was pressed.')}>
            Connect and try again.
          </ErrorNote>
        </Example>

        <Example caption="Amber, kind timeout: code 'NETWORK_TIMEOUT'">
          <ErrorNote error={TIMED_OUT} live={false} onRetry={() => setPressed('Try again was pressed.')}>
            Wait a moment and try again.
          </ErrorNote>
        </Example>

        <Example caption="Amber, kind unverified: code 'could-not-verify'">
          <ErrorNote error={UNVERIFIED} live={false}>
            Check them yourself before you use them.
          </ErrorNote>
        </Example>

        <Example caption="Amber, kind quota: code 'device_limit'. No retry: trying again now cannot work.">
          <ErrorNote error={OUT_OF_QUESTIONS} live={false}>
            Your free questions come back tomorrow.
          </ErrorNote>
        </Example>

        <Example caption="Red, a refusal: a code the note does not know is a failure. Another way on in place of a retry.">
          <ErrorNote
            error={LOCKED}
            live={false}
            action={{ label: 'Choose another file', onPress: () => setPressed('Choose another file was pressed.') }}>
            Remove the password in Excel, save the file and add it again.
          </ErrorNote>
        </Example>

        <Example caption="Red, a thrown Error with a path in its message: the message is never shown. Without a title the note falls back to the library's own words.">
          <ErrorNote error={THROWN} live={false} />
        </Example>

        <Example caption="The same Error with the app's words: a title, what to do next, a retry and a second way on">
          <ErrorNote
            error={THROWN}
            live={false}
            title="LUMIQ could not read this file."
            onRetry={() => setPressed('Try again was pressed.')}
            action={{ label: 'Choose another file', onPress: () => setPressed('Choose another file was pressed.') }}>
            Open it in Excel, save it again and add it again.
          </ErrorNote>
        </Example>

        <Example caption="A string the app wrote: shown as it is, red. The phone's own sentence as a string ('Network request failed') is in no language the person chose: it sorts the note amber and is never shown.">
          <VStack gap="sm">
            <ErrorNote error="The picture could not be made." live={false}>
              You can share the words instead.
            </ErrorNote>
            <ErrorNote error="Network request failed" live={false} />
          </VStack>
        </Example>

        <Example caption="Sorted without a code of its own: the TypeError a phone throws when a request cannot leave (offline), a server's bare 429 (quota), and a failure wrapped in another, { error: { code } } (timeout, with the inner code in the faint line)">
          <VStack gap="sm">
            <ErrorNote error={NO_NETWORK} live={false} title="No internet connection.">
              Connect and try again.
            </ErrorNote>
            <ErrorNote error={ASKED_TOO_OFTEN} live={false} title="No questions left for now.">
              Wait a little and ask again.
            </ErrorNote>
            <ErrorNote error={WRAPPED} live={false} title="This is taking longer than usual.">
              Wait a moment and try again.
            </ErrorNote>
          </VStack>
        </Example>

        <Example caption="Values with nothing to read (the number 404, an empty object): red, with the library's own words">
          <VStack gap="sm">
            <ErrorNote error={404} live={false} />
            <ErrorNote error={{}} live={false} />
          </VStack>
        </Example>

        <Example caption="Busy: retrying is true, so the retry button shows the working mark, keeps its size and cannot be pressed again">
          <ErrorNote error={TIMED_OUT} live={false} retrying onRetry={() => setPressed('This cannot happen.')}>
            Wait a moment and try again.
          </ErrorNote>
        </Example>

        <Example caption="tone set by the caller (amber for a failure the note would have made red), and code null to leave the faint line out">
          <ErrorNote error={LOCKED} live={false} tone="warn" code={null} title="You stopped this question.">
            Ask it again whenever you like.
          </ErrorNote>
        </Example>

        <Example caption="Long Hindi text, with the retry and close words coming from UIStringsProvider">
          <UIStringsProvider strings={{ retry: HINDI.retry, close: HINDI.close }}>
            <ErrorNote
              error={OFFLINE}
              live={false}
              title={HINDI.errorTitle}
              onRetry={() => setPressed('The Hindi retry was pressed.')}
              action={{ label: HINDI.remove, onPress: () => setPressed('The Hindi second button was pressed.') }}>
              {HINDI.errorBody}
            </ErrorNote>
          </UIStringsProvider>
        </Example>

        <Pressed words={pressed} />
      </Part>

      <Part
        title="Notice"
        about="A note inside the page: an icon and words on a soft fill, with at most two ways on and a close button. Status is never told by colour alone.">
        <Example caption="The four tones, one line each: info, good, warn, bad">
          <VStack gap="sm">
            {TONES.map((tone) => (
              <Notice key={tone} tone={tone} title={TONE_LINE[tone]} />
            ))}
          </VStack>
        </Example>

        <Example caption="A title and a smaller line under it, in each tone">
          <VStack gap="sm">
            {TONES.map((tone) => (
              <Notice key={tone} tone={tone} title={TONE_LINE[tone]}>
                The icon and the close button stay on the first line however long the words under it run.
              </Notice>
            ))}
          </VStack>
        </Example>

        <Example caption="Words only, no title: a quiet hint">
          <Notice>Tip: save one month or one sheet as its own file.</Notice>
        </Example>

        <Example caption="An icon of its own in place of the tone's">
          <VStack gap="sm">
            <Notice icon="lock" title="Your file stays on your phone." />
            <Notice tone="warn" icon="offline" title="You are offline. Ask needs the internet." />
          </VStack>
        </Example>

        <Example caption="One action, and two actions side by side (they wrap when the words are long)">
          <VStack gap="sm">
            <Notice
              tone="info"
              title="Update LUMIQ to add or change files"
              action={{ label: 'Update', onPress: () => setPressed('Update was pressed.') }}
            />
            <Notice
              tone="warn"
              title="The last file did not finish opening."
              action={{ label: 'Try again', onPress: () => setPressed('Try again was pressed.') }}
              secondAction={{ label: 'Remove', onPress: () => setPressed('Remove was pressed.') }}
            />
          </VStack>
        </Example>

        <Example caption="Busy: the action is working and keeps its place">
          <Notice
            tone="warn"
            title="The last file did not finish opening."
            action={{ label: 'Try again', busy: true, onPress: () => setPressed('This cannot happen.') }}
            secondAction={{ label: 'Remove', onPress: () => setPressed('Remove was pressed.') }}
          />
        </Example>

        <Example caption="A close button. The note does not hide itself: the page takes it away, and here offers to bring it back.">
          <DismissDemo />
        </Example>

        <Example caption="Everything at once in long Hindi: a title, a line under it, two actions and the close button">
          <UIStringsProvider strings={{ close: HINDI.close }}>
            <Notice
              tone="warn"
              title={HINDI.noticeTitle}
              action={{ label: HINDI.retry, onPress: () => setPressed('The Hindi first button was pressed.') }}
              secondAction={{ label: HINDI.remove, onPress: () => setPressed('The Hindi second button was pressed.') }}
              onDismiss={() => setPressed('The Hindi close button was pressed.')}>
              {HINDI.noticeBody}
            </Notice>
          </UIStringsProvider>
        </Example>

        <Pressed words={pressed} />
      </Part>

      <Part
        title="Progress"
        about="How far along a piece of real work is. With a value the bar fills from the reading edge and the ring fills clockwise from the top. Without one the bar sweeps and the ring is drawn in dashes: unknown is never drawn as zero.">
        <Example caption="Press More and Less to see the fill ease to each new value, and Not known to see the forms without one.">
          <ValueDemo />
        </Example>

        <Example caption="No value, the three sizes: the sweep (or, with less motion, the label as a still line)">
          <VStack gap="lg">
            {SIZES.map((size) => (
              <ProgressBar key={size} size={size} label="Copying into LUMIQ" />
            ))}
          </VStack>
        </Example>

        <Example caption="No value, the ring in its three sizes and both tones: dashes say not known by their shape, so with less motion they simply stand still. Beside them, nothing yet: the empty track.">
          <HStack gap="xl" wrap>
            {SIZES.map((size) => (
              <ProgressRing key={size} size={size} label="Copying into LUMIQ" />
            ))}
            <ProgressRing size="lg" tone="action" label="Copying into LUMIQ">
              <Icon name="file" />
            </ProgressRing>
            <ProgressRing value={0} size="lg" label="Copying into LUMIQ" />
          </HStack>
        </Example>

        <Example caption="Done: the bar is full, the ring is closed, and a screen reader no longer hears busy">
          <HStack gap="lg">
            <ProgressBar value={1} label="Reading rows" style={styles.grow} />
            <ProgressRing value={1} size="sm" label="Reading rows" />
          </HStack>
        </Example>

        <Example caption="A long Hindi label. It is spoken; it is drawn only as the still line of a bar with no value when less motion is on.">
          <ProgressBar label={HINDI.progress} />
        </Example>
      </Part>

      <Part
        title="ErrorBoundary"
        about="When a part of the app throws while drawing, a recovery view takes its place, the failure goes to onError, and one button tries again. ErrorRecovery is that same view by itself, for the router's own boundary. In a development build the phone also shows its own error banner: close it to see the recovery view.">
        <Example caption="variant section, with the library's own English: a compact view where the part was. Try again calls onRestart and draws the part again.">
          <BoundaryDemo mode="section" />
        </Example>

        <Example caption="variant screen (the default), with the app's own words passed through UIStringsProvider: the view fills the screen on the ground colour">
          <BoundaryDemo mode="screen" />
        </Example>

        <Example caption="The same screen with long Hindi words: the display line wraps, nothing is cut, and the button grows with its words">
          <BoundaryDemo mode="screenHindi" />
        </Example>

        <Example caption="A recovery view of the caller's own (fallback), given the failure and the restart function">
          <BoundaryDemo mode="own" />
        </Example>

        <Example caption="The recovery view fails too: the plain last-resort view takes over, drawn with nothing but the bare platform, so there is always a button to press">
          <BoundaryDemo mode="lastResort" />
        </Example>
      </Part>
    </VStack>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  // A card: surface, a 1 line edge, radius 20, 16 inside, no shadow. Colour
  // is added at render because it changes with the theme.
  paper: {
    borderWidth: border.hairline,
    borderRadius: radius.card,
    padding: rhythm.cardPadding,
    gap: space.sm,
  },
  // At least as high as a small phone screen. What it holds sits in the
  // middle and may grow past it.
  screen: {
    minHeight: SCREEN,
    justifyContent: 'center',
    borderWidth: border.hairline,
    borderRadius: radius.card,
    paddingHorizontal: rhythm.screenEdge,
    overflow: 'hidden',
  },
  // A list row, with the same measures as SkeletonRow.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: sizes.row,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  // Holds an icon, never text, so it may have a fixed size.
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Takes the room that is left, so long words wrap inside it.
  grow: { flex: 1 },
  // A button in a column would stretch across it; this keeps it as wide as
  // its own words, at the reading edge.
  start: { alignSelf: 'flex-start' },
  // Centred words get their width from their parent.
  stretch: { alignSelf: 'stretch' },
});
