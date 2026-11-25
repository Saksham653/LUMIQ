import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { sizes, space } from '@/theme';
import { Button } from '@/ui/button';
import { Dialog, DialogProvider, useDialog, type DialogOption } from '@/ui/dialog';
import { Field } from '@/ui/field';
import { List, ListRow } from '@/ui/list';
import { useOverlayHosted } from '@/ui/overlay-host';
import { RadioGroup, type RadioOption } from '@/ui/radio-group';
import { Sheet } from '@/ui/sheet';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';
import { Toast, ToastProvider, useToast, type ToastTone } from '@/ui/toast';

// The gallery's page of the overlays group: OverlayHost, Sheet, Dialog and
// Toast, each in every variant and state, so a reviewer can open, drag, swipe
// and answer them all.
//
// Developer-facing: the captions are plain English on purpose and are not in
// the app's translations. The Hindi lines are sample content, there to show
// long Devanagari text wrapping. Nothing here ships in a screen.
//
// Everything here is drawn in the OverlayHost, so the gallery page (like the
// app) must have one round it. Without one this section says so and shows
// nothing else. It brings its own DialogProvider and ToastProvider.

// --- Sample content ----------------------------------------------------------

// How long the pretend work takes. Not motion: it stands in for a slow answer
// from somewhere, so it is not a motion token.
const PRETEND_WORK_MS = 1500;

// The room a floating tab bar would take at the foot of a screen: the 64 of
// the bar and the 12 under it (brand spec, section 6), on the spacing scale.
const TAB_BAR_ROOM = sizes.row + space.xl;

type NumberStyle = 'indian' | 'western' | 'short';
// The option rows of the sheet on the brand board.
const NUMBER_STYLES: readonly RadioOption<NumberStyle>[] = [
  { value: 'indian', label: '12,34,567 (lakh and crore)' },
  { value: 'western', label: '1,234,567 (million)' },
  { value: 'short', label: '12.3 lakh (short)' },
];
const NUMBER_STYLES_HINDI: readonly RadioOption<NumberStyle>[] = [
  {
    value: 'indian',
    label: '12,34,567 की तरह, लाख और करोड़ में',
    description: 'भारत में बड़ी संख्याएँ आम तौर पर इसी तरह लिखी और बोली जाती हैं।',
  },
  {
    value: 'western',
    label: '1,234,567 की तरह, मिलियन और बिलियन में',
    description: 'दूसरे देशों की रिपोर्टों और बैंक के काग़ज़ों में यही तरीक़ा चलता है।',
  },
  {
    value: 'short',
    label: '12.3 लाख की तरह, छोटे रूप में',
    description: 'जब जगह कम हो और मोटा अंदाज़ा काफ़ी हो।',
  },
];
const NUMBER_STYLE_NAME: Record<NumberStyle, string> = {
  indian: 'lakh and crore',
  western: 'million',
  short: 'short',
};

const HINDI = {
  sheetTitle: 'बड़ी संख्याएँ किस तरह लिखी जाएँ, यह यहाँ से चुनिए',
  sheetAbout:
    'यह चुनाव पूरे ऐप में लागू होगा: जवाबों में, चार्ट में और हर रिपोर्ट में। आप इसे बाद में कभी भी बदल सकते हैं।',
  done: 'हो गया',
  dialogTitle: 'क्या आप इस फ़ाइल को सूची से हटाना चाहते हैं?',
  dialogMessage:
    'इसके साथ बने जवाब और रिपोर्ट भी सूची से हट जाएँगे। आपकी असली फ़ाइल जहाँ रखी है, वहीं रहेगी।',
  dialogConfirm: 'हाँ, सूची से हटाएँ',
  dialogCancel: 'नहीं, इसे रहने दें',
  toast: 'फ़ाइल सूची से हटा दी गई है। ग़लती से हट गई हो तो इसे अभी वापस ला सकते हैं।',
  toastAction: 'वापस लाएँ',
} as const;

// Enough rows to be taller than any phone.
const COLUMN_ROWS: readonly string[] = Array.from({ length: 28 }, (_, index) => `Column ${index + 1}`);

// The top of a sheet, every way it can be drawn.
type Top = 'both' | 'title' | 'grabber' | 'bare' | 'close';
const TOPS: readonly { kind: Top; label: string }[] = [
  { kind: 'both', label: 'Grabber and title' },
  { kind: 'title', label: 'Title only' },
  { kind: 'grabber', label: 'Grabber only' },
  { kind: 'bare', label: 'Neither' },
  { kind: 'close', label: 'With a close button' },
];

type ShareAs = 'picture' | 'text' | 'pdf' | 'delete';
const SHARE_OPTIONS: readonly DialogOption<ShareAs>[] = [
  { label: 'As a picture', value: 'picture', icon: 'share' },
  { label: 'As text', value: 'text', icon: 'copy' },
  { label: 'As a PDF (not ready yet)', value: 'pdf', icon: 'report', disabled: true },
  { label: 'Delete this answer', value: 'delete', icon: 'delete', tone: 'destructive' },
];

const TONES: readonly { tone: ToastTone; label: string; message: string }[] = [
  { tone: 'info', label: 'info', message: 'Answer copied' },
  { tone: 'good', label: 'good', message: 'Report saved' },
  { tone: 'warn', label: 'warn', message: '2 numbers could not be checked. Look at them before you use them.' },
  {
    tone: 'bad',
    label: 'bad',
    message: 'The file could not be opened. Check that it is a CSV or an Excel file, then try again.',
  },
];

// --- The page's own pieces ---------------------------------------------------

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

function Group({ title, about, children }: { title: string; about: string; children: ReactNode }) {
  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Txt variant="heading" accessibilityRole="header">
          {title}
        </Txt>
        <Txt tone="soft">{about}</Txt>
      </VStack>
      {children}
    </VStack>
  );
}

// The buttons that open things. A row, so each button is as wide as its words,
// and it wraps at large text sizes.
function Openers({ children }: { children: ReactNode }) {
  return (
    <HStack gap="sm" wrap>
      {children}
    </HStack>
  );
}

// What came back: the answer of a dialog, how often a callback ran.
function Said({ children }: { children: string }) {
  return (
    <Txt variant="small" tone="faint" aria-live="polite">
      {children}
    </Txt>
  );
}

// Work that takes a moment: `start()` begins it, and `done` is called when it
// ends by itself.
function usePretendWork(done: () => void): [working: boolean, start: () => void] {
  const [working, setWorking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(done);

  useEffect(() => {
    latest.current = done;
  });

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const start = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    setWorking(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setWorking(false);
      latest.current();
    }, PRETEND_WORK_MS);
  };

  return [working, start];
}

// --- The host ------------------------------------------------------------------

// The rows of a sheet, as a component of their own. They are drawn in the
// host, outside this page's providers, and still ask and tell by themselves:
// the dialog and toast controllers travel with the sheet.
function FileActions({ onDone }: { onDone: () => void }) {
  const dialog = useDialog();
  const toast = useToast();

  const remove = async () => {
    const yes = await dialog.confirm({
      title: 'Remove this file?',
      message: 'It is taken off this list. The file itself stays where you keep it.',
      confirmLabel: 'Remove',
      tone: 'destructive',
    });
    if (!yes) return;
    onDone();
    toast.show({
      message: 'File removed',
      onAction: () => toast.show({ message: 'File put back', tone: 'good' }),
    });
  };

  return (
    <List variant="flat">
      <ListRow size="sm" icon="copy" title="Copy its name" onPress={() => toast.show({ message: 'Name copied' })} />
      <ListRow
        size="sm"
        icon="delete"
        title="Remove this file"
        variant="destructive"
        onPress={() => {
          void remove();
        }}
      />
    </List>
  );
}

function HostExamples() {
  const [open, setOpen] = useState(false);

  return (
    <Group
      title="OverlayHost"
      about="One host, mounted round the app, draws every sheet, dialog and toast. They stack by where they are written in the host (sheets, then dialogs, then toasts), never by a zIndex.">
      <Example caption="All three at once. Open the sheet, press Copy its name: the toast is above the sheet and its dimming. Press Remove this file: the question is above the sheet. Say Remove: the sheet leaves and a toast with Undo arrives. Android back answers the top one first.">
        <Openers>
          <Button variant="quiet" label="Open the file's sheet" onPress={() => setOpen(true)} />
        </Openers>
        <Sheet visible={open} title="shop-stock-march.csv" closeButton onClose={() => setOpen(false)}>
          <FileActions onDone={() => setOpen(false)} />
        </Sheet>
      </Example>
    </Group>
  );
}

// --- Sheet ---------------------------------------------------------------------

function SheetExamples() {
  const [board, setBoard] = useState(false);
  const [written, setWritten] = useState<NumberStyle>('indian');
  const [closed, setClosed] = useState(0);

  const [top, setTop] = useState<Top>('both');
  const [topOpen, setTopOpen] = useState(false);
  const [shared, setShared] = useState('Nothing chosen yet.');

  const [tall, setTall] = useState(false);
  const [own, setOwn] = useState(false);

  const [locked, setLocked] = useState(false);
  const [saving, save] = usePretendWork(() => setLocked(false));

  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);

  const [hindi, setHindi] = useState(false);
  const [hindiWritten, setHindiWritten] = useState<NumberStyle>('indian');

  const [still, setStill] = useState(false);

  const openTop = (kind: Top) => {
    setTop(kind);
    setTopOpen(true);
  };
  const share = (how: string) => {
    setShared(`Chosen: ${how}.`);
    setTopOpen(false);
  };

  const nameless = name.trim() === '';
  const saveName = () => {
    if (nameless) {
      setTried(true);
      return;
    }
    setNaming(false);
  };

  const topHasTitle = top === 'both' || top === 'title' || top === 'close';
  const topHasGrabber = top === 'both' || top === 'grabber' || top === 'close';

  return (
    <Group
      title="Sheet"
      about="One question, asked from the bottom of the screen. It measures itself, comes up from its own height on the sheet spring, and the dimming follows where it is. It leaves on the exit curve, faster than it came.">
      <Example caption="As on the brand board: a grabber, a title, the choices and a button that closes it. Drag it down past 110 or flick it and it leaves; let go sooner and it returns with the speed of your finger. Pull it up and it resists. A tap outside, Android back and Done close it too. A light tap in the hand as it comes to rest.">
        <Openers>
          <Button variant="quiet" label="Open the sheet" onPress={() => setBoard(true)} />
        </Openers>
        <Said>
          {`Numbers are written as ${NUMBER_STYLE_NAME[written]}. onClosed has run ${closed} times, each time after the sheet had gone.`}
        </Said>
        <Sheet
          visible={board}
          title="Write big numbers as"
          onClose={() => setBoard(false)}
          onClosed={() => setClosed((now) => now + 1)}>
          <RadioGroup
            options={NUMBER_STYLES}
            value={written}
            onChange={setWritten}
            accessibilityLabel="Write big numbers as"
          />
          <Button fullWidth label="Done" onPress={() => setBoard(false)} />
        </Sheet>
      </Example>

      <Example caption="The top, every way: grabber and title (the default), title only, grabber only, neither, and with the close button. A sheet with no title takes an accessibilityLabel as its spoken name. A drag is never the only way out, so each has a button that can be seen: Cancel in the content, or closeButton.">
        <Openers>
          {TOPS.map((one) => (
            <Button key={one.kind} variant="quiet" size="sm" label={one.label} onPress={() => openTop(one.kind)} />
          ))}
        </Openers>
        <Said>{shared}</Said>
        <Sheet
          visible={topOpen}
          title={topHasTitle ? 'Share this answer' : undefined}
          grabber={topHasGrabber}
          closeButton={top === 'close'}
          accessibilityLabel="Share this answer"
          onClose={() => setTopOpen(false)}>
          <List variant="flat">
            <ListRow size="sm" icon="share" title="As a picture" onPress={() => share('as a picture')} />
            <ListRow size="sm" icon="copy" title="As text" onPress={() => share('as text')} />
          </List>
          {top === 'close' ? null : <Button variant="plain" label="Cancel" onPress={() => setTopOpen(false)} />}
        </Sheet>
      </Example>

      <Example caption="Taller than 85 percent of the screen: it stops there and scrolls inside. Then only its top drags it, so a finger on the rows scrolls the rows. With scrollable off the content brings its own scroller instead.">
        <Openers>
          <Button variant="quiet" label="A long sheet" onPress={() => setTall(true)} />
          <Button variant="quiet" label="Its own scroller" onPress={() => setOwn(true)} />
        </Openers>
        <Sheet visible={tall} title="Columns in this file" closeButton onClose={() => setTall(false)}>
          {COLUMN_ROWS.map((column) => (
            <ListRow key={column} size="sm" icon="column" title={column} />
          ))}
        </Sheet>
        <Sheet
          visible={own}
          scrollable={false}
          title="Columns in this file"
          closeButton
          onClose={() => setOwn(false)}>
          <ScrollView style={styles.ownScroller}>
            {COLUMN_ROWS.map((column) => (
              <ListRow key={column} size="sm" icon="column" title={column} />
            ))}
          </ScrollView>
        </Sheet>
      </Example>

      <Example caption="Not dismissable, and busy. A tap outside, Android back and a drag do nothing (it resists both ways); only its own buttons close it. Press Save: the button shows the working mark and keeps its size, Not now turns to plain paper, and the sheet closes when the pretend work ends.">
        <Openers>
          <Button variant="quiet" label="A sheet that must be answered" onPress={() => setLocked(true)} />
        </Openers>
        <Sheet visible={locked} dismissable={false} grabber={false} title="Save this report?">
          <Txt tone="soft">It is saved with the file it was made from.</Txt>
          <Button fullWidth busy={saving} label="Save" onPress={save} />
          <Button variant="plain" disabled={saving} label="Not now" onPress={() => setLocked(false)} />
        </Sheet>
      </Example>

      <Example caption="A field inside, and an error. Put the cursor in the field: the sheet stays above the keyboard. Press Save with the field empty: the field says what is wrong and what to do.">
        <Openers>
          <Button variant="quiet" label="Name a report" onPress={() => setNaming(true)} />
        </Openers>
        <Sheet
          visible={naming}
          title="Name this report"
          onClose={() => setNaming(false)}
          onClosed={() => setTried(false)}>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            hint="Shown at the top of the report."
            error={tried && nameless ? 'The report has no name yet. Type a name, then press Save.' : undefined}
          />
          <Button fullWidth label="Save" onPress={saveName} />
        </Sheet>
      </Example>

      <Example caption="Long Hindi words. The title wraps, the rows grow, and the sheet is measured again before it moves.">
        <Openers>
          <Button variant="quiet" label="Open in Hindi" onPress={() => setHindi(true)} />
        </Openers>
        <Sheet visible={hindi} title={HINDI.sheetTitle} onClose={() => setHindi(false)}>
          <Txt tone="soft">{HINDI.sheetAbout}</Txt>
          <RadioGroup
            options={NUMBER_STYLES_HINDI}
            value={hindiWritten}
            onChange={setHindiWritten}
            accessibilityLabel={HINDI.sheetTitle}
          />
          <Button fullWidth label={HINDI.done} onPress={() => setHindi(false)} />
        </Sheet>
      </Example>

      <Example caption="Reduced motion, asked for with the reduceMotion prop (a phone set to reduce motion does the same everywhere): it fades in where it rests and fades out. No slide. The tap in the hand stays.">
        <Openers>
          <Button variant="quiet" label="Open with reduced motion" onPress={() => setStill(true)} />
        </Openers>
        <Sheet visible={still} reduceMotion title="Write big numbers as" onClose={() => setStill(false)}>
          <RadioGroup
            options={NUMBER_STYLES}
            value={written}
            onChange={setWritten}
            accessibilityLabel="Write big numbers as"
          />
          <Button fullWidth label="Done" onPress={() => setStill(false)} />
        </Sheet>
      </Example>
    </Group>
  );
}

// --- Dialog --------------------------------------------------------------------

// A dialog whose answer takes a moment to act on, written out as a component:
// busy while the pretend work runs, then a toast says how it went.
function WorkingDialog() {
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [fails, setFails] = useState(false);

  const ask = (willFail: boolean) => {
    setFails(willFail);
    setAsking(true);
  };

  const [working, remove] = usePretendWork(() => {
    setAsking(false);
    if (fails) {
      toast.show({
        tone: 'bad',
        message: 'The file could not be removed. It is still on the list. Try again.',
        actionLabel: 'Try again',
        onAction: () => ask(false),
      });
    } else {
      toast.show({ tone: 'good', message: 'File removed' });
    }
  });

  return (
    <>
      <Openers>
        <Button variant="quiet" label="Remove, and it works" onPress={() => ask(false)} />
        <Button variant="quiet" label="Remove, and it fails" onPress={() => ask(true)} />
      </Openers>
      <Dialog
        visible={asking}
        title="Remove this file?"
        message="It is taken off this list. The file itself stays where you keep it."
        tone="destructive"
        confirmLabel="Remove"
        busy={working}
        onConfirm={remove}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}

function DialogExamples() {
  const dialog = useDialog();
  const [answer, setAnswer] = useState('Nothing asked yet.');
  const [renaming, setRenaming] = useState(false);
  const [fileName, setFileName] = useState('shop-stock-march');
  const [still, setStill] = useState(false);

  const askPlain = async () => {
    const yes = await dialog.confirm({
      title: 'Use the first row as column names?',
      message: 'The first row of this file looks like names, not values.',
    });
    setAnswer(yes ? 'confirm answered true: OK.' : 'confirm answered false: Cancel, a tap outside, or back.');
  };

  const askDestructive = async () => {
    const yes = await dialog.confirm({
      title: 'Remove this file?',
      message: 'It is taken off this list. The file itself stays where you keep it.',
      confirmLabel: 'Remove',
      cancelLabel: 'Keep it',
      tone: 'destructive',
    });
    setAnswer(yes ? 'confirm answered true: Remove.' : 'confirm answered false: Keep it, a tap outside, or back.');
  };

  const askWhich = async () => {
    const how = await dialog.choose({ title: 'Share this answer', options: SHARE_OPTIONS });
    setAnswer(how === null ? 'choose answered null: nothing was chosen.' : `choose answered "${how}".`);
  };

  const askHindi = async () => {
    const yes = await dialog.confirm({
      title: HINDI.dialogTitle,
      message: HINDI.dialogMessage,
      confirmLabel: HINDI.dialogConfirm,
      cancelLabel: HINDI.dialogCancel,
      tone: 'destructive',
    });
    setAnswer(yes ? 'confirm answered true.' : 'confirm answered false.');
  };

  const askTwo = async () => {
    const [first, second] = await Promise.all([
      dialog.confirm({ title: 'First question', message: 'Asked first, shown first.' }),
      dialog.confirm({ title: 'Second question', message: 'Asked at the same moment. It waited until the first had gone.' }),
    ]);
    setAnswer(`The first answered ${String(first)}, the second ${String(second)}.`);
  };

  return (
    <Group
      title="Dialog"
      about="A question in the middle of the screen, drawn by the app. The card pops in from 96 percent with its opacity and leaves on the exit curve. useDialog() asks and waits: confirm gives true or false, choose gives the chosen value or null, and neither ever rejects.">
      <Example caption="confirm, default tone: the confirm button is the filled main button. With no labels given it uses the library's OK and Cancel. Cancel, a tap outside the card and Android back all answer false.">
        <Openers>
          <Button variant="quiet" label="Ask yes or no" onPress={() => void askPlain()} />
        </Openers>
        <Said>{answer}</Said>
      </Example>

      <Example caption="confirm, destructive tone: the confirm button is written in the failure red, so the safe answer is never the one that shouts. Its own words on both buttons.">
        <Openers>
          <Button variant="quiet" label="Ask before removing" onPress={() => void askDestructive()} />
        </Openers>
      </Example>

      <Example caption="choose: a row for each choice, with Cancel under them. One row is destructive and one is disabled (faint ink, takes no press). It answers the value of the chosen row, or null.">
        <Openers>
          <Button variant="quiet" label="Ask which one" onPress={() => void askWhich()} />
        </Openers>
      </Example>

      <Example caption="Long Hindi words. The title and the message wrap, and the two buttons stack, confirm on top, when they no longer fit side by side.">
        <Openers>
          <Button variant="quiet" label="Ask in Hindi" onPress={() => void askHindi()} />
        </Openers>
      </Example>

      <Example caption="Two questions asked at the same moment: one at a time, in the order asked.">
        <Openers>
          <Button variant="quiet" label="Ask two at once" onPress={() => void askTwo()} />
        </Openers>
      </Example>

      <Example caption="Busy, then how it went. Say Remove: the button shows the working mark and keeps its size, Cancel turns to plain paper, and a tap outside or back no longer closes the card. Then a toast says it worked, or says what went wrong and what to do next.">
        <WorkingDialog />
      </Example>

      <Example caption="Written out as a component, with content of its own between the message and the buttons. Put the cursor in the field: the card stays clear of the keyboard.">
        <Openers>
          <Button variant="quiet" label="Rename the file" onPress={() => setRenaming(true)} />
        </Openers>
        <Dialog
          visible={renaming}
          title="Rename this file"
          confirmLabel="Rename"
          onConfirm={() => setRenaming(false)}
          onCancel={() => setRenaming(false)}>
          <Field label="Name" value={fileName} onChangeText={setFileName} />
        </Dialog>
      </Example>

      <Example caption="Reduced motion, asked for with the reduceMotion prop: the card and the dimming fade, and nothing scales.">
        <Openers>
          <Button variant="quiet" label="Ask with reduced motion" onPress={() => setStill(true)} />
        </Openers>
        <Dialog
          visible={still}
          reduceMotion
          title="Use the first row as column names?"
          message="The first row of this file looks like names, not values."
          onConfirm={() => setStill(false)}
          onCancel={() => setStill(false)}
        />
      </Example>
    </Group>
  );
}

// --- Toast ---------------------------------------------------------------------

// A button under a provider of its own, so its toasts arrive at the top.
function TopToastButton() {
  const toast = useToast();
  return <Button variant="quiet" label="Show at the top" onPress={() => toast.show({ message: 'Answer copied' })} />;
}

function ToastExamples() {
  const toast = useToast();
  const [undone, setUndone] = useState(0);
  const [retried, setRetried] = useState(0);
  const [lifted, setLifted] = useState(false);
  const [still, setStill] = useState(false);
  // Takes the long toast away before its time.
  const takeAway = useRef<(() => void) | null>(null);

  const showThree = () => {
    toast.show({ message: 'First: report saved', tone: 'good' });
    toast.show({ message: 'Second: answer copied' });
    toast.show({ message: 'Third: 2 numbers could not be checked.', tone: 'warn' });
  };

  const showLong = () => {
    takeAway.current = toast.show({ message: 'This one stays for 12 seconds.', duration: 12000 });
  };

  return (
    <Group
      title="Toast"
      about="A short message at the edge of the screen that leaves by itself. One at a time, the rest wait their turn. It arrives from 90 percent with its opacity on the settle spring, a bar along its foot drains as its time runs out, and it is read out when it arrives.">
      <Example caption="The four tones: info, good, warn and bad. Each has its own icon beside the words, in its own ink: never colour alone. bad says what happened and what to do next. Hold a finger on one and its clock stops. Swipe it sideways, or flick it, to send it away.">
        <Openers>
          {TONES.map((one) => (
            <Button
              key={one.tone}
              variant="quiet"
              size="sm"
              label={one.label}
              onPress={() => toast.show({ message: one.message, tone: one.tone })}
            />
          ))}
        </Openers>
      </Example>

      <Example caption="With an action. Give onAction and the toast shows a text button, Undo unless you name it; pressing it runs the action and closes the toast. It stays 7 seconds, not 4, and longer still with a screen reader on.">
        <Openers>
          <Button
            variant="quiet"
            label="Remove, with Undo"
            onPress={() => toast.show({ message: 'File removed', onAction: () => setUndone((now) => now + 1) })}
          />
          <Button
            variant="quiet"
            label="Fail, with Try again"
            onPress={() =>
              toast.show({
                tone: 'bad',
                message: 'The report could not be saved. Try again.',
                actionLabel: 'Try again',
                onAction: () => setRetried((now) => now + 1),
              })
            }
          />
        </Openers>
        <Said>{`Undo pressed ${undone} times. Try again pressed ${retried} times.`}</Said>
      </Example>

      <Example caption="A queue. Three are asked for at once and shown one after another, in the order asked. Clear takes away the one on screen and every one still waiting.">
        <Openers>
          <Button variant="quiet" label="Show three" onPress={showThree} />
          <Button variant="plain" label="Clear" onPress={() => toast.clear()} />
        </Openers>
      </Example>

      <Example caption="Its own duration: 2 seconds, and 12. show() gives back a function that takes that toast away early.">
        <Openers>
          <Button
            variant="quiet"
            label="2 seconds"
            onPress={() => toast.show({ message: 'This one stays for 2 seconds.', duration: 2000 })}
          />
          <Button variant="quiet" label="12 seconds" onPress={showLong} />
          <Button variant="plain" label="Take it away now" onPress={() => takeAway.current?.()} />
        </Openers>
      </Example>

      <Example caption="Long Hindi words with an action. The words wrap, the card grows, and the action moves under the words when the two no longer fit side by side.">
        <Openers>
          <Button
            variant="quiet"
            label="Show in Hindi"
            onPress={() => toast.show({ message: HINDI.toast, actionLabel: HINDI.toastAction, onAction: () => {} })}
          />
        </Openers>
      </Example>

      <Example caption="Placement. ToastProvider takes placement and offset for every toast it shows: the first button sits under a provider of its own, set to the top. The second shows a Toast written out as a component, at the bottom with the offset of a floating tab bar.">
        <Openers>
          <ToastProvider placement="top">
            <TopToastButton />
          </ToastProvider>
          <Button variant="quiet" label="Above a tab bar" onPress={() => setLifted(true)} />
        </Openers>
        <Toast
          visible={lifted}
          message="Lifted clear of where a tab bar would be."
          offset={TAB_BAR_ROOM}
          onClose={() => setLifted(false)}
        />
      </Example>

      <Example caption="Reduced motion, asked for with the reduceMotion prop: it fades in and out, nothing scales, and the draining bar is not drawn. Its time still runs.">
        <Openers>
          <Button variant="quiet" label="Show with reduced motion" onPress={() => setStill(true)} />
        </Openers>
        <Toast
          visible={still}
          reduceMotion
          tone="good"
          message="Report saved"
          onClose={() => setStill(false)}
        />
      </Example>
    </Group>
  );
}

// --- The section ---------------------------------------------------------------

export type OverlaysGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the overlays group:
//   <OverlaysGallery />
// It needs AppStateProvider above it (its text reads the app language) and an
// OverlayHost round the gallery page (everything here is drawn in it). It
// sets no outer margin: the gallery page spaces it.
export function OverlaysGallery({ style }: OverlaysGalleryProps) {
  const hosted = useOverlayHosted();

  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Overlays
        </Txt>
        <Txt tone="soft">
          What is drawn over a screen: a sheet from the bottom, a question in the middle, a short message at the
          edge. One at a time. Each arrives on a spring, leaves on the exit curve, closes on Android back, and has a
          reduced-motion form that only fades.
        </Txt>
      </VStack>

      {hosted ? (
        <DialogProvider>
          <ToastProvider>
            <HostExamples />
            <SheetExamples />
            <DialogExamples />
            <ToastExamples />
          </ToastProvider>
        </DialogProvider>
      ) : (
        <Txt weight="600">
          Nothing here can be shown yet: there is no OverlayHost above this page. Mount one OverlayHost round the
          gallery page (and round the app), and this section fills in.
        </Txt>
      )}
    </VStack>
  );
}

const styles = StyleSheet.create({
  // A scroller that is its sheet's own must be able to shrink: the sheet stops
  // at 85 percent of the screen and the rows scroll inside what is left.
  ownScroller: { flexShrink: 1 },
});
