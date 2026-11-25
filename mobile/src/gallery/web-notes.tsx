import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { pickFile, type PickedFile, type PickFileResult } from '@/data/pick-file';
import {
  MAX_FONT_SCALE,
  border,
  radius,
  rhythm,
  sizes,
  space,
  useIsRTL,
  useReducedMotion,
  useTheme,
  type Palette,
} from '@/theme';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Press } from '@/ui/press';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// The gallery's page for the web-preview group. The app runs in a desktop
// browser at phone size for quick looks (expo web), and this says plainly
// what such a look cannot show, so nobody signs off a phone from a browser.
// It also lets a reviewer try the one thing that works differently there and
// can be pressed: picking a file (see @/data/pick-file and its .web twin).
//
// Developer-facing: the words are plain English on purpose and are not in the
// app's translations. Nothing here ships in a screen.

// --- The notes ---------------------------------------------------------------

export type WebNote = {
  // What it is about, in a few words.
  title: string;
  // What is missing in a browser, and where to look instead.
  body: string;
};

// What a browser cannot show of the phone app. Each note names the thing and
// says where to judge it instead.
export const WEB_NOTES: readonly WebNote[] = [
  {
    title: "The phone's own bars",
    body: 'The tab bar, the header and the slide from one screen to the next are drawn by Android or iOS. A browser shows stand-ins, and has no status bar or notch to leave room for. Judge them on a phone.',
  },
  {
    title: 'Sheets and messages the phone draws',
    body: "The file picker, the share sheet and the keyboard belong to the phone. A browser shows its own. A message the app hands to the phone's own alert box does not appear in a browser at all.",
  },
  {
    title: 'Taps in the hand',
    body: 'Haptics are switched off in a browser. How a press, a choice or a checked answer feels can only be judged with the phone in your hand.',
  },
  {
    title: 'Text size',
    body: `The phone's text size setting does not reach a browser: text here stays at its normal size. Check the largest size the app allows, ${MAX_FONT_SCALE} times, on a phone, in Hindi.`,
  },
  {
    title: 'Speed',
    body: 'A desktop computer is many times faster than a low-cost phone. How smooth a movement is, how fast the app opens and how long a big file takes cannot be read from this page. Measure them on a phone.',
  },
  {
    title: 'Fonts',
    body: 'Here the fonts are fetched from the web when the page opens. A phone draws letters with its own engine, and shows its own font until the brand fonts are added to the app. Check wrapped text on a phone.',
  },
  {
    title: 'Right to left',
    body: "Choosing Hebrew turns this page right to left at once, where a phone restarts once. The mirroring is the browser's, not the phone's, and may miss things. Check edges, paddings and icons that point on a phone.",
  },
  {
    title: 'Where files are kept',
    body: "Files and settings are kept in this browser's own storage for this address, not in the app's folder on a phone. A file too big for it opens and works, then is gone when the page is reloaded. Clearing the browser's data for this address empties the app.",
  },
];

export type WebNotesProps = {
  // Defaults to WEB_NOTES.
  notes?: readonly WebNote[];
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// A card of plain notes, one under another with a hairline between: a title
// in ink and, in smaller soft ink, what it means. Every row grows with its
// words.
//   <WebNotes />
//   <WebNotes notes={[{ title: 'Speed', body: 'Measure it on a phone.' }]} />
export function WebNotes({ notes = WEB_NOTES, style }: WebNotesProps) {
  const { colors } = useTheme();
  // Nothing to say: no card at all, never an empty box.
  if (notes.length === 0) return null;

  return (
    <View role="list" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>
      {notes.map((note, at) => (
        <View
          key={note.title}
          role="listitem"
          style={[styles.note, at > 0 && { borderTopWidth: border.hairline, borderTopColor: colors.line }]}>
          <Txt variant="label">{note.title}</Txt>
          <Txt variant="small" tone="soft">
            {note.body}
          </Txt>
        </View>
      ))}
    </View>
  );
}

// --- Picking a file ----------------------------------------------------------

// What the try-out row has to say for itself.
type PickOutcome =
  | { kind: 'ready' }
  | { kind: 'busy' }
  | { kind: 'picked'; name: string; type: string; bytes: number; characters: number }
  | { kind: 'cancelled' }
  | { kind: 'failed' };

const READY: PickOutcome = { kind: 'ready' };
const BUSY: PickOutcome = { kind: 'busy' };
const CANCELLED: PickOutcome = { kind: 'cancelled' };
const FAILED: PickOutcome = { kind: 'failed' };

const PICK_TITLE = 'Pick a file';
const PICK_DETAIL = "Opens the browser's own file window here, and the phone's own picker on a phone.";

// Something not known is shown as a dash, never as zero or a guess.
const DASH = '—';

type LineTone = 'soft' | 'good' | 'bad';
// The icon takes the colour of the words beside it.
const LINE_INK: Record<LineTone, keyof Palette> = { soft: 'inkSoft', good: 'good', bad: 'bad' };

type Line = { icon: IconName; tone: LineTone; words: string };

// Never colour alone: every answer is an icon and words, and a failure says
// what happened and what to do next.
function lineFor(outcome: PickOutcome): Line {
  switch (outcome.kind) {
    case 'ready':
      return { icon: 'info', tone: 'soft', words: 'Nothing picked yet. Press the row above.' };
    case 'busy':
      return { icon: 'file', tone: 'soft', words: 'Reading the file.' };
    case 'picked':
      return {
        icon: 'check',
        tone: 'good',
        words: `Read ${outcome.name}. Type: ${outcome.type === '' ? DASH : outcome.type}. ${outcome.bytes} bytes, ${outcome.characters} characters as text.`,
      };
    case 'cancelled':
      return { icon: 'info', tone: 'soft', words: 'The picker was closed without a file. Nothing changed.' };
    case 'failed':
      return { icon: 'error', tone: 'bad', words: 'The file could not be read. Pick it again, or pick another file.' };
  }
}

// A phone may refuse to say what kind of file it is.
function typeOf(file: PickedFile): string {
  try {
    return file.type ?? '';
  } catch {
    return '';
  }
}

function PickLine({ outcome }: { outcome: PickOutcome }) {
  const { colors } = useTheme();
  const line = lineFor(outcome);
  return (
    <HStack gap="sm" align="start">
      <Icon name={line.icon} size={sizes.iconSmall} color={colors[LINE_INK[line.tone]]} />
      <Txt variant="small" tone={line.tone} style={styles.grow}>
        {line.words}
      </Txt>
    </HStack>
  );
}

// The row that opens the picker. While a file is being read it is switched
// off: plain paper and faint ink, and exactly the size it was.
function PickRow({ busy, onPress }: { busy: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const title = busy ? colors.disabledInk : colors.ink;
  const detail = busy ? colors.disabledInk : colors.inkSoft;
  return (
    <Press feedback="highlight" weight="lg" disabled={busy} aria-busy={busy} onPress={onPress} style={styles.pickRow}>
      <View style={[styles.tile, { backgroundColor: busy ? colors.disabledFill : colors.surfaceSunk }]}>
        <Icon name="add" color={detail} />
      </View>
      <VStack gap="xs" style={styles.grow}>
        <Txt variant="label" color={title}>
          {PICK_TITLE}
        </Txt>
        <Txt variant="small" color={detail}>
          {PICK_DETAIL}
        </Txt>
      </VStack>
    </Press>
  );
}

// --- The section ---------------------------------------------------------------

const SAMPLE_OUTCOMES: readonly { caption: string; outcome: PickOutcome }[] = [
  { caption: 'Ready', outcome: READY },
  { caption: 'Busy: a file is being read', outcome: BUSY },
  {
    caption: 'Picked',
    outcome: { kind: 'picked', name: 'shop-stock-march.csv', type: 'text/csv', bytes: 20480, characters: 20311 },
  },
  {
    caption: 'Picked, when nothing says what kind of file it is: a dash, never a guess',
    outcome: { kind: 'picked', name: 'sales', type: '', bytes: 913, characters: 913 },
  },
  {
    caption: 'Picked, with a long Hindi file name',
    outcome: {
      kind: 'picked',
      name: 'मार्च-महीने-की-दुकान-की-बिक्री-और-बचे-हुए-माल-का-पूरा-हिसाब.csv',
      type: 'text/csv',
      bytes: 48211,
      characters: 31904,
    },
  },
  { caption: 'Closed without a file', outcome: CANCELLED },
  { caption: 'Error: what happened, and what to do next', outcome: FAILED },
];

// The first note, put loosely into Hindi with two Latin names left in it: the
// hardest thing a row has to hold. Sample text for this page only; no Hindi
// speaker has checked it and it is not one of the app's translations.
const HINDI_NOTES: readonly WebNote[] = [
  {
    title: 'फ़ोन का अपना टैब बार',
    body: 'नीचे का टैब बार, ऊपर का शीर्षक और एक स्क्रीन से दूसरी स्क्रीन पर जाने की चाल Android या iOS खुद बनाते हैं। ब्राउज़र में इनकी जगह मिलते-जुलते रूप दिखते हैं, इसलिए इनका रूप, इनकी ऊँचाई और इनकी चाल हमेशा असली फ़ोन पर ही जाँचें।',
  },
];

// Where this page is running, in words.
function runningIn(): WebNote {
  if (Platform.OS === 'web') {
    return { title: 'This is a browser', body: 'Not a phone. Read the list below before you judge anything here.' };
  }
  const onPhone = 'The list below is about browsers. On an emulator, speed and taps in the hand still need a real phone.';
  if (Platform.OS === 'android') return { title: 'This is Android', body: onPhone };
  if (Platform.OS === 'ios') return { title: 'This is iOS', body: onPhone };
  return { title: 'This is neither a phone nor a browser', body: 'Nothing here has been checked on it.' };
}

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

// The notes themselves: what this page is running on right now, the list,
// and the list's hardest case.
function Limits() {
  const rtl = useIsRTL();
  const reduced = useReducedMotion();

  const facts: WebNote[] = [
    runningIn(),
    {
      title: rtl ? 'Reading right to left' : 'Reading left to right',
      body: 'Follows the language chosen in the app. Hebrew is the one that runs right to left.',
    },
    {
      title: reduced ? 'Less motion is on' : 'Less motion is off',
      body:
        Platform.OS === 'web'
          ? "Follows this computer's setting, read when the page opens."
          : "Follows the phone's setting, read when the app starts.",
    },
  ];

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>What a browser cannot show</Heading>
        <Txt tone="soft">
          Each note names one thing and says where to judge it instead. Read them before signing anything off from a
          browser window.
        </Txt>
      </VStack>

      <Example caption="Right now. These three lines are read from the app as it runs.">
        <WebNotes notes={facts} />
      </Example>

      <Example caption="The notes.">
        <WebNotes />
      </Example>

      <Example caption="Long Hindi text. A row grows with its words: nothing is cut and no letter is clipped.">
        <WebNotes notes={HINDI_NOTES} />
      </Example>
    </VStack>
  );
}

// The picker, to press. The same row opens the browser's file window in a
// browser and the phone's own picker on a phone.
function Picking() {
  const { colors } = useTheme();
  const [outcome, setOutcome] = useState<PickOutcome>(READY);
  const paper = { backgroundColor: colors.surface, borderColor: colors.line };

  // The picker opens first, before anything is awaited: a browser only opens
  // a file window in answer to a press.
  const pick = async () => {
    let answer: PickFileResult;
    try {
      answer = await pickFile();
    } catch {
      setOutcome(FAILED);
      return;
    }
    if (answer.canceled || answer.result === null) {
      setOutcome(CANCELLED);
      return;
    }
    const file = answer.result;
    setOutcome(BUSY);
    try {
      // The two ways the importer reads a file: bytes for Excel, text for CSV.
      const bytes = (await file.arrayBuffer()).byteLength;
      const characters = (await file.text()).length;
      setOutcome({ kind: 'picked', name: file.name, type: typeOf(file), bytes, characters });
    } catch {
      setOutcome(FAILED);
    }
  };

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Picking a file</Heading>
        <Txt tone="soft">
          The one thing here that works differently in a browser and can be pressed. Pick a file, or close the picker
          without one. This page only reads the file: it sends nothing and keeps nothing.
        </Txt>
      </VStack>

      <Example caption="Press the row. The line under it says what came back.">
        <View style={[styles.panel, paper]}>
          <PickRow
            busy={outcome.kind === 'busy'}
            onPress={() => {
              void pick();
            }}
          />
          <View aria-live="polite" style={styles.answer}>
            <PickLine outcome={outcome} />
          </View>
        </View>
      </Example>

      <Example caption="Busy: the same row while a file is being read. Switched off, plain paper, the same size.">
        <View style={[styles.panel, paper]}>
          <PickRow busy />
        </View>
      </Example>

      <Example caption="Every answer the line can give.">
        <View style={[styles.panel, paper]}>
          {SAMPLE_OUTCOMES.map((sample) => (
            <VStack key={sample.caption} gap="xs" style={styles.answer}>
              <Txt variant="small" tone="faint">
                {sample.caption}
              </Txt>
              <PickLine outcome={sample.outcome} />
            </VStack>
          ))}
        </View>
      </Example>
    </VStack>
  );
}

export type WebPreviewGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the web-preview group:
//   <WebPreviewGallery />
// It needs AppStateProvider above it (its text reads the app language) and
// sets no outer margin: the gallery page spaces it.
export function WebPreviewGallery({ style }: WebPreviewGalleryProps) {
  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Browser preview
        </Txt>
        <Txt tone="soft">
          The app can run in a desktop browser at phone size for a quick look. That is a preview, not a phone. This
          page says what a browser cannot show, and lets you try picking a file.
        </Txt>
      </VStack>
      <Limits />
      <Picking />
    </VStack>
  );
}

const styles = StyleSheet.create({
  // A card: surface, a 1 line edge, radius 20, no shadow. Colour is added at
  // render because it changes with the theme.
  card: {
    borderWidth: border.hairline,
    borderRadius: radius.card,
    paddingHorizontal: rhythm.cardPadding,
    paddingVertical: space.xs,
  },
  note: { paddingVertical: space.md, gap: space.xs },
  // The same card, holding a pressable row: the row sits inside it with its
  // own corners.
  panel: {
    borderWidth: border.hairline,
    borderRadius: radius.card,
    padding: space.sm,
    gap: space.sm,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: sizes.row,
    padding: space.sm,
    borderRadius: radius.control,
  },
  // Holds an icon, never text, so it may have a fixed size.
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answer: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  // Takes the room that is left, so long words wrap inside it.
  grow: { flex: 1 },
});
