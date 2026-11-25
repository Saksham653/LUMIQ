import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { border, launchTimeline, palettes, radius, sizes, space, useReducedMotion, useTheme } from '@/theme';
import { Icon } from '@/ui/icon';
import { ICONS, ICON_NAMES, type IconDef } from '@/ui/icon-set';
import {
  AllCheckedIllustration,
  DailyLimitIllustration,
  EmptyChatIllustration,
  ILLUSTRATION_NAMES,
  Illustration,
  NoFilesIllustration,
  OfflineIllustration,
  SomethingBrokeIllustration,
  type IllustrationName,
  type IllustrationSize,
} from '@/ui/illustrations';
import { LaunchMoment, type LaunchMomentMode } from '@/ui/launch-moment';
import { Lockup, Logo, Mark, Wordmark, type LogoSize } from '@/ui/logo';
import { Press } from '@/ui/press';
import { HStack, VStack } from '@/ui/stack';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

// The gallery's page for the brand group: the logo (Mark, Wordmark, Lockup and
// the one name Logo), the launch moment, the six spot drawings and the icon
// family. Every form, size and state is here to be looked at and pressed.
//
// Developer-facing: the captions are plain English on purpose and the sample
// words are not in the app's translations. Nothing here ships in a screen.

// Not a motion value: how long a demo button pretends to work.
const PRETEND_WORK_MS = 1600;

// The tile of the launch moment (launch-moment.tsx), shown beside the three
// named sizes, and a smaller one to show that its picture keeps its
// proportions.
const LAUNCH_TILE = 112;
const SMALL_LAUNCH_TILE = 80;

const LOGO_SIZES: readonly LogoSize[] = ['sm', 'md', 'lg'];
const TILE_NOTE: Record<LogoSize, string> = {
  sm: 'sm, 24: the 16 drawing',
  md: 'md, 32: the 24 drawing',
  lg: 'lg, 48: the 48 drawing',
};
const WORD_NOTE: Record<LogoSize, string> = {
  sm: 'sm, letters 16 high: the smallest, as in the app header',
  md: 'md, letters 24 high: as in lockup.svg',
  lg: 'lg, letters 32 high: as drawn, as in the launch',
};
const LOCKUP_NOTE: Record<LogoSize, string> = {
  sm: 'sm: the tile alone at 24. A name beside it would have letters 12 high, under the 16 the brand allows',
  md: 'md, the app header: tile 32, 9 apart, the name 75 by 20',
  lg: 'lg, lockup.svg: tile 48, 14 apart, the name 112.5 by 30',
};
// The one colour mark at the side of its box, and the drawing each box takes
// (brand spec, section 2): small sizes are redrawn, not shrunk.
const MONO_BOXES: readonly { side: number; note: string }[] = [
  { side: 48, note: '48: the 48 drawing' },
  { side: 32, note: '32: the 24 drawing' },
  { side: 24, note: '24: the 24 drawing' },
  { side: 16, note: '16: the 16 drawing' },
];

const DRAWING_SIZES: readonly IllustrationSize[] = ['sm', 'md', 'lg'];
const DRAWING_SIZE_NOTE: Record<IllustrationSize, string> = { sm: 'sm, 72', md: 'md, 96', lg: 'lg, 120' };
const DRAWING_USE: Record<IllustrationName, string> = {
  'no-files': 'No files yet: Home before the first file.',
  'empty-chat': 'Empty chat: Ask before the first question.',
  offline: 'Offline: something needs the internet.',
  'daily-limit': "Daily limit reached: today's free questions are used up.",
  'something-broke': 'Something broke: a screen or a file could not be shown.',
  'all-checked': 'All checked: nothing left to fix.',
};

// Sizes under the brand's smallest (tile 24, one colour mark 16, letters 16),
// to show that the logo refuses them.
const TOO_SMALL = { tile: 12, mark: 8, letters: 6, lockup: 20 } as const;

// Hindi samples, the longest thing each piece has to sit beside.
const HINDI = {
  title: 'देखिए आपकी फ़ाइल क्या कहती है',
  emptyTitle: 'अभी कोई फ़ाइल नहीं है',
  emptyBody: 'अपनी Excel या CSV फ़ाइल खोलें और आसान शब्दों में जवाब पाएं। आपकी फ़ाइल आपके फ़ोन में ही रहती है।',
  emptyAction: 'फ़ाइल जोड़ें (Excel या CSV)',
  datesLong: 'इस कॉलम की 2 तारीखें टेक्स्ट के रूप में लिखी हैं, इसलिए इन्हें जोड़ा नहीं जा सका',
  checkedLine: '7 कार्ड, 31 में से 31 संख्याएँ आपके फ़ोन पर जाँची गईं',
} as const;

// --- Small pieces of the page ----------------------------------------------------

function Heading({ children }: { children: string }) {
  return (
    <Txt variant="heading" accessibilityRole="header">
      {children}
    </Txt>
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

// A card, to show a piece the way it sits on one. `fill` is a palette colour
// for the pieces that are shown on another surface.
function Paper({ fill, children }: { fill?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.paper, { backgroundColor: fill ?? colors.surface, borderColor: colors.line }]}>{children}</View>
  );
}

// A piece with a short note under it. `ink` is a palette colour for a note
// that sits on another surface.
function Specimen({ note, ink, children }: { note: string; ink?: string; children: ReactNode }) {
  return (
    <VStack gap="xs" align="center">
      {children}
      <Txt variant="small" tone="faint" color={ink} snug>
        {note}
      </Txt>
    </VStack>
  );
}

// What the last press did, said to a screen reader too.
function Said({ words }: { words: string }) {
  return (
    <Txt variant="small" tone="faint" aria-live="polite">
      {words}
    </Txt>
  );
}

type KeyProps = {
  label: string;
  onPress: () => void;
  // main: the one filled button of a screen. quiet: everything else here.
  tone?: 'main' | 'quiet';
  disabled?: boolean;
  // Working: it keeps its words and its size and cannot be pressed again.
  busy?: boolean;
};

// A button for this page, built on Press alone so the page needs nothing from
// the other groups. Disabled is plain paper and faint ink, never a faded blue.
function Key({ label, onPress, tone = 'quiet', disabled = false, busy = false }: KeyProps) {
  const { colors } = useTheme();
  const main = tone === 'main';
  const fill = disabled ? colors.disabledFill : main ? colors.action : colors.actionSoft;
  const ink = disabled ? colors.disabledInk : main ? colors.onAction : colors.onActionSoft;
  return (
    <Press
      onPress={onPress}
      disabled={disabled || busy}
      aria-disabled={disabled}
      aria-busy={busy}
      haptic={main ? 'tap' : 'none'}
      style={[styles.key, { backgroundColor: fill }]}>
      <Txt variant="label" color={ink} snug>
        {label}
      </Txt>
    </Press>
  );
}

// A demo of work that takes a moment: `work()` starts it, and it ends by
// itself.
function useWork(): [working: boolean, work: () => void] {
  const [working, setWorking] = useState(false);
  useEffect(() => {
    if (!working) return undefined;
    const timer = setTimeout(() => setWorking(false), PRETEND_WORK_MS);
    return () => clearTimeout(timer);
  }, [working]);
  return [working, () => setWorking(true)];
}

// --- Logo ------------------------------------------------------------------------

function Logos() {
  const { colors } = useTheme();

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Logo</Heading>
        <Txt tone="soft">
          An L and a sun, and the name in five drawn letters. Nothing here is a font or an image, so it looks the same
          on the first frame. It never mirrors, it is never drawn under its smallest size, and its sun is yellow only
          on the blue tile.
        </Txt>
      </VStack>

      <Example caption="Mark on its tile, the form the app uses in both themes. sm 24, md 32 (the header), lg 48, and 112 as in the launch moment. Small tiles hold the small drawings, never the 48 drawing shrunk. On a tile the art sits a little right and up of centre, where it looks centred.">
        <Paper>
          <HStack gap="xl" wrap align="end">
            {LOGO_SIZES.map((size) => (
              <Specimen key={size} note={TILE_NOTE[size]}>
                <Mark size={size} />
              </Specimen>
            ))}
            <Specimen note={`${LAUNCH_TILE}: the 48 drawing`}>
              <Mark size={LAUNCH_TILE} />
            </Specimen>
          </HStack>
        </Paper>
      </Example>

      <Example caption="Mark in one colour (tone mono), for where the tile cannot go: ink by default, or the blue as text. Its size is the side of its box, and the box picks the drawing. There is no yellow sun without the tile.">
        <Paper>
          <HStack gap="xl" wrap align="end">
            {MONO_BOXES.map(({ side, note }) => (
              <Specimen key={side} note={note}>
                <Mark tone="mono" size={side} />
              </Specimen>
            ))}
            <Specimen note="actionText">
              <Mark tone="mono" size="lg" color={colors.actionText} />
            </Specimen>
          </HStack>
        </Paper>
      </Example>

      <Example caption="Reversed, one colour: ground on ink.">
        <Paper fill={colors.ink}>
          <HStack gap="xl" wrap>
            <Mark tone="mono" size="lg" color={colors.ground} />
            <Lockup tone="mono" size="lg" color={colors.ground} />
          </HStack>
        </Paper>
      </Example>

      <Example caption="Name: always one colour, its dot included, so it never reads as LUMIO with a spot beside it. Ink by default; any one palette colour through `color`.">
        <Paper>
          <VStack gap="lg" align="start">
            {LOGO_SIZES.map((size) => (
              <VStack key={size} gap="xs" align="start">
                <Wordmark size={size} />
                <Txt variant="small" tone="faint">
                  {WORD_NOTE[size]}
                </Txt>
              </VStack>
            ))}
            <VStack gap="xs" align="start">
              <Wordmark color={colors.actionText} />
              <Txt variant="small" tone="faint">
                color: actionText
              </Txt>
            </VStack>
          </VStack>
        </Paper>
      </Example>

      <Example caption="Lockup: the tile, a gap, the name with letters half as high as the tile. One ratio at every size.">
        <Paper>
          <VStack gap="lg" align="start">
            {LOGO_SIZES.map((size) => (
              <VStack key={size} gap="xs" align="start">
                <Lockup size={size} />
                <Txt variant="small" tone="faint">
                  {LOCKUP_NOTE[size]}
                </Txt>
              </VStack>
            ))}
            <VStack gap="xs" align="start">
              <Lockup size={sizes.row} />
              <Txt variant="small" tone="faint">
                {`a number: tile ${sizes.row}, the same ratio`}
              </Txt>
            </VStack>
            <VStack gap="xs" align="start">
              <Lockup tone="mono" size="lg" />
              <Txt variant="small" tone="faint">
                mono: one colour and no tile
              </Txt>
            </VStack>
          </VStack>
        </Paper>
      </Example>

      <Example caption="On each ground, whatever the theme is now. The tile is the same blue on both; the name takes the ink of the ground it stands on.">
        <HStack gap="sm" wrap>
          <Paper fill={palettes.light.ground}>
            <Specimen note="light ground" ink={palettes.light.inkFaint}>
              <Lockup size="lg" color={palettes.light.ink} />
            </Specimen>
          </Paper>
          <Paper fill={palettes.dark.ground}>
            <Specimen note="dark ground" ink={palettes.dark.inkFaint}>
              <Lockup size="lg" color={palettes.dark.ink} />
            </Specimen>
          </Paper>
        </HStack>
      </Example>

      <Example caption="The one name, Logo: variant lockup (the default), mark, wordmark.">
        <Paper>
          <HStack gap="xl" wrap>
            <Logo />
            <Logo variant="mark" />
            <Logo variant="wordmark" />
          </HStack>
        </Paper>
      </Example>

      <Example caption="With a label the logo is one image to a screen reader, which says the label. Without one it is silent, which is right beside a screen title that already speaks. Turn the screen reader on and move across these two.">
        <Paper>
          <HStack gap="xl" wrap>
            <Specimen note="label: LUMIQ">
              <Lockup label="LUMIQ" />
            </Specimen>
            <Specimen note="no label, silent">
              <Lockup />
            </Specimen>
          </HStack>
        </Paper>
      </Example>

      <Example
        caption={`Asked for smaller than the brand allows (a tile of ${TOO_SMALL.tile}, a one colour mark of ${TOO_SMALL.mark}, letters ${TOO_SMALL.letters} high, a lockup on a tile of ${TOO_SMALL.lockup}): each is drawn at its smallest size instead, tile 24, mark 16, letters 16, and the lockup as its tile alone.`}>
        <Paper>
          <HStack gap="xl" wrap>
            <Mark size={TOO_SMALL.tile} />
            <Mark tone="mono" size={TOO_SMALL.mark} />
            <Wordmark size={TOO_SMALL.letters} />
            <Lockup size={TOO_SMALL.lockup} />
          </HStack>
        </Paper>
      </Example>

      <Example caption="In a header beside a long Hindi title. The logo keeps its size at any text size and the title wraps under itself. Set the phone's text to its largest to check.">
        <Paper>
          <HStack gap="md" align="start">
            <Lockup />
            <Txt variant="heading" style={styles.grow}>
              {HINDI.title}
            </Txt>
          </HStack>
        </Paper>
      </Example>

      <Example caption="Inside a right-to-left row. The row runs from the right, so the logo sits at the right; the logo itself does not mirror: mark first, then name.">
        <Paper>
          <View style={styles.fromRight}>
            <Lockup />
            <Txt variant="small" tone="soft" style={styles.grow}>
              This row starts at the right.
            </Txt>
          </View>
        </Paper>
      </Example>
    </VStack>
  );
}

// --- Launch moment ---------------------------------------------------------------

type RunOptions = {
  drawMark?: boolean;
  reduced?: boolean;
  // Held on its first frame, as it is while the phone's start screen is up.
  held?: boolean;
  tileSize?: number;
};

type Run = {
  // A new number for every play, so the moment is mounted afresh.
  id: number;
  mode: LaunchMomentMode;
  drawMark: boolean;
  reduced: boolean;
  held: boolean;
  tileSize: number;
};

function Launch() {
  const { colors } = useTheme();
  const reducedByPhone = useReducedMotion();
  const [run, setRun] = useState<Run | null>(null);
  const [said, setSaid] = useState('Nothing played yet. Home is shown, as it is after every launch.');
  const plays = useRef(0);
  const startedAt = useRef(0);

  const play = (mode: LaunchMomentMode, options: RunOptions = {}) => {
    plays.current += 1;
    startedAt.current = Date.now();
    const held = options.held === true;
    setSaid(held ? 'Held on the first frame: the same picture as the start screen. The layer takes every touch.' : 'Playing.');
    setRun({
      id: plays.current,
      mode,
      drawMark: options.drawMark === true,
      reduced: options.reduced === true,
      held,
      tileSize: options.tileSize ?? LAUNCH_TILE,
    });
  };

  const release = () => {
    startedAt.current = Date.now();
    setSaid('Playing.');
    setRun((now) => (now === null ? now : { ...now, held: false }));
  };

  const done = () => {
    setSaid(`onDone was called ${Date.now() - startedAt.current} ms after it began to play. The layer is gone and Home takes touches again.`);
    setRun(null);
  };

  const firstOpen = launchTimeline.first + launchTimeline.leave;
  const laterOpen = launchTimeline.later + launchTimeline.leave;

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Launch moment</Heading>
        <Txt tone="soft">
          A layer over the app that turns the phone&apos;s start screen into Home. Its first frame is the start
          screen&apos;s own picture: the ground, the tile and the still L. Only the sun bounces. No ring, no rays, no
          sound, no tap in the hand.
        </Txt>
        {reducedByPhone ? (
          <Txt tone="warn">
            This phone asks for less motion, so every button below shows the still form: the last frame, then a fade.
          </Txt>
        ) : null}
      </VStack>

      <Example
        caption={`The stage. The first open plays ${launchTimeline.first} ms and leaves in ${launchTimeline.leave}, so onDone comes after about ${firstOpen} ms. A later open plays only the sun: about ${laterOpen} ms. With less motion: the last frame and a ${launchTimeline.leave} ms fade.`}>
        <View style={[styles.stage, { backgroundColor: colors.ground, borderColor: colors.line }]}>
          {/* What is underneath: Home, with the sun already on. */}
          <VStack gap="sm" align="center" p="lg">
            <Lockup size="lg" />
            <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
              Home is underneath.
            </Txt>
          </VStack>
          {run === null ? null : (
            <LaunchMoment
              key={run.id}
              mode={run.mode}
              drawMark={run.drawMark}
              reduced={run.reduced}
              tileSize={run.tileSize}
              playing={!run.held}
              onDone={done}
            />
          )}
        </View>
        <Said words={said} />
      </Example>

      <Example caption="full: the first open. The name rises under the tile letter by letter, the Q and its dot as one. The highlight crosses it and leaves: it is the band of a checked number itself, with its line at the foot and the letters in onLight. Then the sun rises out of the corner of the L and settles with the one bounce. In a right-to-left language the highlight comes from the right; nothing else mirrors.">
        <HStack gap="sm" wrap>
          <Key tone="main" label="Play the first open" onPress={() => play('full')} />
        </HStack>
      </Example>

      <Example caption="short: every later open. Only the last beat: the sun comes on. No name.">
        <HStack gap="sm" wrap>
          <Key label="Play a later open" onPress={() => play('short')} />
        </HStack>
      </Example>

      <Example caption="Held, then let go. `playing` is false while the phone's start screen is still up: the first frame waits, and nothing is missed behind the start screen. This is the loading state of the launch. The second button is disabled until something is held.">
        <HStack gap="sm" wrap>
          <Key label="Hold the first frame" onPress={() => play('full', { held: true })} />
          <Key label="Let it play" disabled={run === null || !run.held} onPress={release} />
        </HStack>
      </Example>

      <Example caption="Less motion. Nothing moves: the last frame is shown, the sun already on, and the layer fades. This is what plays whenever the phone asks for less motion.">
        <HStack gap="sm" wrap>
          <Key label="First open, still" onPress={() => play('full', { reduced: true })} />
          <Key label="Later open, still" onPress={() => play('short', { reduced: true })} />
        </HStack>
      </Example>

      <Example caption="drawMark: the L draws itself in one stroke, top to corner to right, while the name rises. Off by default: the start screen already shows the whole L, so this is only for places with no start screen before them (the browser preview, a replay on the welcome screen).">
        <HStack gap="sm" wrap>
          <Key label="First open, the L drawn" onPress={() => play('full', { drawMark: true })} />
        </HStack>
      </Example>

      <Example
        caption={`tileSize: the picture keeps its proportions under another tile. Here ${SMALL_LAUNCH_TILE}; the app uses ${LAUNCH_TILE}, the tile of the phone's start screen.`}>
        <HStack gap="sm" wrap>
          <Key label={`First open, tile ${SMALL_LAUNCH_TILE}`} onPress={() => play('full', { tileSize: SMALL_LAUNCH_TILE })} />
        </HStack>
      </Example>
    </VStack>
  );
}

// --- Illustrations ---------------------------------------------------------------

// The shape of an empty screen, for showing a drawing where it will live: the
// drawing, one opening line, why, and the way forward.
function Screen({
  drawing,
  title,
  body,
  children,
}: {
  drawing: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.paper, styles.screen, { backgroundColor: colors.ground, borderColor: colors.line }]}>
      <View aria-hidden>{drawing}</View>
      {/* The words take the full width, so centred lines wrap without being cut. */}
      <VStack gap="sm" style={styles.stretch}>
        <Txt variant="display" align="center" accessibilityRole="header">
          {title}
        </Txt>
        <Txt tone="soft" align="center">
          {body}
        </Txt>
      </VStack>
      {children}
    </View>
  );
}

function Drawings() {
  const { colors } = useTheme();
  const strings = useUIStrings();
  const [said, setSaid] = useState('Nothing pressed yet.');
  const [working, work] = useWork();

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Illustrations</Heading>
        <Txt tone="soft">
          Six spot drawings for the screens that have nothing else to show. One line and one dot, as in the icons. A
          dashed line means not here yet. Never the yellow, the checked one included: the light belongs under an
          answer.
        </Txt>
        <Said words={said} />
      </VStack>

      <Example caption="All six at md, 96. The line is soft ink and the dot is ink.">
        <Paper>
          <HStack gap="lg" wrap align="start">
            {ILLUSTRATION_NAMES.map((name) => (
              <VStack key={name} gap="xs" align="center" style={styles.half}>
                <Illustration name={name} />
                <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
                  {DRAWING_USE[name]}
                </Txt>
                <Txt variant="small" tone="faint" align="center" style={styles.stretch}>
                  {name}
                </Txt>
              </VStack>
            ))}
          </HStack>
        </Paper>
      </Example>

      <Example caption="Sizes: sm 72, md 96 (the default), lg 120. The line scales with the drawing: 2 at 96, as on an icon.">
        <Paper>
          <HStack gap="lg" wrap align="end">
            {DRAWING_SIZES.map((size) => (
              <Specimen key={size} note={DRAWING_SIZE_NOTE[size]}>
                <NoFilesIllustration size={size} />
              </Specimen>
            ))}
          </HStack>
        </Paper>
      </Example>

      <Example caption="On other surfaces. On the sunk surface the default inks hold. On a tinted fill the drawing takes the colour of the text on that fill. The dot may take the blue as text where the drawing sits above the screen's one filled button.">
        <HStack gap="sm" wrap>
          <Paper fill={colors.surfaceSunk}>
            <Specimen note="surfaceSunk">
              <EmptyChatIllustration size="sm" />
            </Specimen>
          </Paper>
          <Paper fill={colors.actionSoft}>
            <Specimen note="actionSoft" ink={colors.onActionSoft}>
              <EmptyChatIllustration size="sm" color={colors.onActionSoft} dotColor={colors.onActionSoft} />
            </Specimen>
          </Paper>
          <Paper fill={colors.warnSoft}>
            <Specimen note="warnSoft" ink={colors.warn}>
              <OfflineIllustration size="sm" color={colors.warn} dotColor={colors.warn} />
            </Specimen>
          </Paper>
          <Paper>
            <Specimen note="dot: actionText">
              <NoFilesIllustration size="sm" dotColor={colors.actionText} />
            </Specimen>
          </Paper>
        </HStack>
      </Example>

      <Example caption="With a label a drawing is one image to a screen reader. Without one it is silent, which is right whenever words beside it say the same thing.">
        <Paper>
          <HStack gap="xl" wrap align="end">
            <Specimen note="label: All checked">
              <AllCheckedIllustration size="sm" label="All checked" />
            </Specimen>
            <Specimen note="no label, silent">
              <AllCheckedIllustration size="sm" />
            </Specimen>
          </HStack>
        </Paper>
      </Example>

      <Example caption="In use: no files yet. The drawing, one opening line in display, why, and the one filled button.">
        <Screen
          drawing={<NoFilesIllustration />}
          title="No file yet"
          body="Add an Excel or CSV file to see what it says. Your file stays on your phone.">
          <Key tone="main" label="Add a file" onPress={() => setSaid('Add a file was pressed.')} />
        </Screen>
      </Example>

      <Example caption="The same in Hindi, the longest it has to hold: taller lines, the title wraps, and nothing is cut. The drawing does not change with the language.">
        <Screen drawing={<NoFilesIllustration />} title={HINDI.emptyTitle} body={HINDI.emptyBody}>
          <Key tone="main" label={HINDI.emptyAction} onPress={() => setSaid('The Hindi button was pressed.')} />
        </Screen>
      </Example>

      <Example caption="Empty chat, before the first question.">
        <Screen
          drawing={<EmptyChatIllustration />}
          title="Ask your data anything"
          body="Type a question about your file. Every number in the answer is checked on your phone.">
          <Key label="Ask about this" onPress={() => setSaid('Ask about this was pressed.')} />
        </Screen>
      </Example>

      <Example caption="Offline, with a button that is busy while it tries again: it keeps its words and its size, says busy to a screen reader, and cannot be pressed twice.">
        <Screen drawing={<OfflineIllustration />} title="You are offline" body="Connect to the internet and try again.">
          <Key
            label={strings.retry}
            busy={working}
            onPress={() => {
              setSaid('Trying again.');
              work();
            }}
          />
          {working ? (
            <Txt variant="small" tone="soft" aria-live="polite">
              {strings.loading}
            </Txt>
          ) : null}
        </Screen>
      </Example>

      <Example caption="Daily limit reached, with a disabled button: plain paper and faint ink, never a faded blue, and a line that says why.">
        <Screen
          drawing={<DailyLimitIllustration />}
          title="No free questions left today"
          body="More free questions come tomorrow.">
          <Key disabled label="Ask about this" onPress={() => setSaid('This must never be said: the button is disabled.')} />
          <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
            Asking is switched off until then.
          </Txt>
        </Screen>
      </Example>

      <Example caption="Something broke: the error state. The words say what happened and what to do next; they are the library's own, through useUIStrings.">
        <Screen drawing={<SomethingBrokeIllustration />} title={strings.errorTitle} body={strings.errorBody}>
          <Key tone="main" label={strings.errorAction} onPress={() => setSaid(`${strings.errorAction} was pressed.`)} />
        </Screen>
      </Example>

      <Example caption="All checked: nothing left to fix. Drawn in ink, not in the light.">
        <Screen drawing={<AllCheckedIllustration />} title="Nothing to fix" body={strings.allChecked} />
      </Example>
    </VStack>
  );
}

// --- Icons -----------------------------------------------------------------------

function Icons() {
  const { colors } = useTheme();
  const pointing = ICON_NAMES.filter((name) => {
    const icon: IconDef = ICONS[name];
    return icon.directional === true;
  });

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>{`Icons (${ICON_NAMES.length})`}</Heading>
        <Txt tone="soft">
          One family for both kinds of phone: a 24 grid, a 2 line with round ends, and one solid dot where it helps.
          The brand names 41; minus was added for the stepper. No emoji and no sparkles anywhere.
        </Txt>
      </VStack>

      <Example caption="Every icon at 24, in ink. The ones marked mirror in right-to-left languages; nothing else flips.">
        <Paper>
          <HStack gap="sm" wrap align="start">
            {ICON_NAMES.map((name) => (
              <VStack key={name} gap="xs" align="center" py="sm" style={styles.third}>
                <Icon name={name} />
                <Txt variant="small" tone="soft" align="center" style={styles.stretch}>
                  {name}
                </Txt>
                {pointing.includes(name) ? (
                  <Txt variant="small" tone="faint" align="center" style={styles.stretch}>
                    mirrors
                  </Txt>
                ) : null}
              </VStack>
            ))}
          </HStack>
        </Paper>
      </Example>

      <Example caption="At 20, beside label and small text, on the surface and on the sunk surface. Compare the weight of neighbours: no icon should look heavier or bigger than the next.">
        <Paper>
          <HStack gap="md" wrap>
            {ICON_NAMES.map((name) => (
              <Icon key={name} name={name} size={sizes.iconSmall} color={colors.inkSoft} />
            ))}
          </HStack>
        </Paper>
        <Paper fill={colors.surfaceSunk}>
          <HStack gap="md" wrap>
            {ICON_NAMES.map((name) => (
              <Icon key={name} name={name} size={sizes.iconSmall} color={colors.inkSoft} />
            ))}
          </HStack>
        </Paper>
      </Example>

      <Example caption="An icon takes the colour of the text beside it and never speaks: the words do. Status is never colour alone.">
        <Paper>
          <VStack gap="md">
            <HStack gap="sm">
              <Icon name="lock" size={sizes.iconSmall} color={colors.inkSoft} />
              <Txt variant="small" tone="soft" style={styles.grow}>
                Your file stays on your phone.
              </Txt>
            </HStack>
            <HStack gap="sm">
              <Icon name="chevron" size={sizes.iconSmall} color={colors.actionText} />
              <Txt variant="label" tone="action" style={styles.grow}>
                See insights
              </Txt>
            </HStack>
            <HStack gap="sm">
              <Icon name="file-check" color={colors.good} />
              <Txt tone="good" style={styles.grow}>
                No empty cells in 8 columns
              </Txt>
            </HStack>
            <HStack gap="sm">
              <Icon name="warning" color={colors.warn} />
              <Txt tone="warn" style={styles.grow}>
                2 dates are written as text
              </Txt>
            </HStack>
            <HStack gap="sm">
              <Icon name="error" color={colors.bad} />
              <Txt tone="bad" style={styles.grow}>
                This file could not be opened
              </Txt>
            </HStack>
          </VStack>
        </Paper>
      </Example>

      <Example caption="One tick in the whole family. check is the full drawing; checked-stamp holds it at two thirds inside a ring; file-check holds it at half on a sheet. The 28 stamp under an answer holds the same tick at five sixths.">
        <Paper>
          <HStack gap="xl" wrap align="end">
            <Specimen note="check">
              <Icon name="check" />
            </Specimen>
            <Specimen note="checked-stamp">
              <Icon name="checked-stamp" />
            </Specimen>
            <Specimen note="file-check">
              <Icon name="file-check" />
            </Specimen>
          </HStack>
        </Paper>
      </Example>

      <Example caption="checked-stamp has one use: in a row or a line that points to checked words somewhere else and gives their count, and only when every number matched. It is a ring with the tick and no fill, in the colour of that line, always with the words. Never under an answer, never beside a number the phone simply worked out, never yellow. Here in English and in Hindi.">
        <Paper>
          <VStack gap="md">
            <HStack gap="sm" align="start">
              <Icon name="checked-stamp" size={sizes.iconSmall} color={colors.inkSoft} />
              <Txt variant="small" tone="soft" style={styles.grow}>
                7 cards, 31 of 31 numbers checked on your phone
              </Txt>
            </HStack>
            <HStack gap="sm" align="start">
              <Icon name="checked-stamp" size={sizes.iconSmall} color={colors.inkSoft} />
              <Txt variant="small" tone="soft" style={styles.grow}>
                {HINDI.checkedLine}
              </Txt>
            </HStack>
          </VStack>
        </Paper>
      </Example>

      <Example caption="On fills. On the action blue the icon is onAction; on the quiet fill, onActionSoft; on a sunk tile, soft ink; on a status fill, the status colour. Disabled is disabledInk on disabledFill, never a faded blue.">
        <Paper>
          <HStack gap="md" wrap>
            <View style={[styles.tile, { backgroundColor: colors.action }]}>
              <Icon name="send" color={colors.onAction} />
            </View>
            <View style={[styles.tile, { backgroundColor: colors.actionSoft }]}>
              <Icon name="add" color={colors.onActionSoft} />
            </View>
            <View style={[styles.tile, { backgroundColor: colors.surfaceSunk }]}>
              <Icon name="file" color={colors.inkSoft} />
            </View>
            <View style={[styles.tile, { backgroundColor: colors.goodSoft }]}>
              <Icon name="check" color={colors.good} />
            </View>
            <View style={[styles.tile, { backgroundColor: colors.disabledFill }]}>
              <Icon name="share" color={colors.disabledInk} />
            </View>
          </HStack>
        </Paper>
      </Example>

      <Example
        caption={`The ${pointing.length} that are flagged as pointing: ${pointing.join(', ')}. First as drawn here, then as they are drawn in Hebrew (this second row is mirrored by the page, to show it in any language). Send points up, so it looks the same.`}>
        <Paper>
          <VStack gap="md">
            <HStack gap="lg">
              {pointing.map((name) => (
                <Icon key={name} name={name} />
              ))}
            </HStack>
            <HStack gap="lg">
              {pointing.map((name) => (
                <View key={name} style={styles.mirrored}>
                  <Icon name={name} />
                </View>
              ))}
            </HStack>
          </VStack>
        </Paper>
      </Example>

      <Example caption="Beside a long Hindi line that wraps: the icon stays at the top of the first line and keeps its size; the words take the room that is left.">
        <Paper>
          <HStack gap="sm" align="start">
            <Icon name="warning" color={colors.warn} />
            <Txt tone="warn" style={styles.grow}>
              {HINDI.datesLong}
            </Txt>
          </HStack>
        </Paper>
      </Example>
    </VStack>
  );
}

// --- The section -----------------------------------------------------------------

export type BrandGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the brand group:
//   <BrandGallery />
// It needs AppStateProvider above it (its text reads the app language) and
// sets no outer margin: the gallery page spaces it.
export function BrandGallery({ style }: BrandGalleryProps) {
  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Brand
        </Txt>
        <Txt tone="soft">
          What makes the app LUMIQ before a word is read: the logo, the moment the app opens, the drawings for empty
          screens and the icon family. All of it is drawn in code from the locked brand.
        </Txt>
      </VStack>
      <Logos />
      <Launch />
      <Drawings />
      <Icons />
    </VStack>
  );
}

const styles = StyleSheet.create({
  paper: { padding: space.lg, borderWidth: border.hairline, borderRadius: radius.card },
  // An empty screen in small: everything in the middle, the words full width.
  screen: { alignItems: 'center', gap: space.lg, paddingVertical: space.xxl },
  // A piece of a screen for the launch layer to cover. Six rows high: room
  // for the 112 tile in the middle with the name under it. The layer fills it
  // and is cut at its corners.
  stage: {
    minHeight: sizes.row * 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: border.hairline,
    borderRadius: radius.card,
  },
  key: {
    minHeight: sizes.target,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  // Two and three to a line, whatever the width of the page.
  half: { flexBasis: '45%', flexGrow: 1 },
  third: { flexBasis: '30%', flexGrow: 1 },
  // A row that runs from the right, as every row does in Hebrew.
  fromRight: { flexDirection: 'row', alignItems: 'center', gap: space.md, direction: 'rtl' },
  // How a pointing icon looks in a right-to-left language, shown in any.
  mirrored: { transform: [{ scaleX: -1 }] },
});
