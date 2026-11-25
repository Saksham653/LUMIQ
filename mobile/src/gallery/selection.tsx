import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { border, radius, space, useTheme } from '@/theme';
import { Checkbox } from '@/ui/checkbox';
import { RadioGroup, type RadioOption } from '@/ui/radio-group';
import { Segmented, type SegmentedOption } from '@/ui/segmented';
import { HStack, VStack } from '@/ui/stack';
import { Switch } from '@/ui/switch';
import { Txt } from '@/ui/text';

// The gallery's page of the selection group: Switch, Segmented, RadioGroup
// and Checkbox, each in every size and state, so a reviewer can press them
// all.
//
// Developer-facing: the captions are plain English on purpose and are not in
// the app's translations. The Hindi lines are sample content, there to show
// long Devanagari text wrapping. Nothing here ships in a screen.

// --- Sample content ----------------------------------------------------------

type Look = 'phone' | 'light' | 'dark';
const LOOKS: readonly SegmentedOption<Look>[] = [
  { value: 'phone', label: 'Phone' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const LOOKS_HINDI: readonly SegmentedOption<Look>[] = [
  { value: 'phone', label: 'फ़ोन जैसा' },
  { value: 'light', label: 'उजला' },
  { value: 'dark', label: 'गहरा' },
];

type Paper = 'light' | 'dark';
const PAPERS: readonly SegmentedOption<Paper>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type Span = 'day' | 'week' | 'month' | 'year';
const SPANS: readonly SegmentedOption<Span>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];
// Short forms on the segments, whole words for a screen reader.
const SPANS_SHORT: readonly SegmentedOption<Span>[] = [
  { value: 'week', label: '1W', accessibilityLabel: 'One week' },
  { value: 'month', label: '1M', accessibilityLabel: 'One month' },
  { value: 'year', label: '1Y', accessibilityLabel: 'One year' },
];

type Shown = 'chart' | 'table';
const SHOWN: readonly SegmentedOption<Shown>[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];
const SHOWN_WORDS: Record<Shown, string> = {
  chart: 'The chart would be shown here.',
  table: 'The table would be shown here.',
};

type Drawing = 'bars' | 'line' | 'table';
const DRAWINGS: readonly SegmentedOption<Drawing>[] = [
  { value: 'bars', label: 'Bars' },
  { value: 'line', label: 'Line', disabled: true },
  { value: 'table', label: 'Table' },
];

// Words of very different lengths, so the pill has to change width as it goes.
type Which = 'all' | 'checked' | 'unmatched';
const WHICH: readonly SegmentedOption<Which>[] = [
  { value: 'all', label: 'All' },
  { value: 'checked', label: 'Checked' },
  { value: 'unmatched', label: 'Not matched' },
];
// One long word that cannot break (German), beside two short ones.
const LOOKS_GERMAN: readonly SegmentedOption<Look>[] = [
  { value: 'phone', label: 'Automatisch' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
];

type NumberStyle = 'indian' | 'western' | 'short';
// The option rows of the sheet on the brand board.
const NUMBER_STYLES: readonly RadioOption<NumberStyle>[] = [
  { value: 'indian', label: '12,34,567 (lakh and crore)' },
  { value: 'western', label: '1,234,567 (million)' },
  { value: 'short', label: '12.3 lakh (short)' },
];
const NUMBER_STYLES_SEGMENTS_HINDI: readonly SegmentedOption<NumberStyle>[] = [
  { value: 'indian', label: 'लाख और करोड़' },
  { value: 'western', label: 'मिलियन और बिलियन' },
  { value: 'short', label: 'छोटा रूप' },
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

const LOOKS_WITH_DETAIL: readonly RadioOption<Look>[] = [
  { value: 'phone', label: 'Same as the phone', description: 'Light or dark, whichever the phone is set to.' },
  { value: 'light', label: 'Light', description: 'Paper white, for daylight and bright rooms.' },
  { value: 'dark', label: 'Dark', description: 'Easier on the eyes at night.' },
];

type Kind = 'csv' | 'excel' | 'pdf';
const KINDS: readonly RadioOption<Kind>[] = [
  { value: 'csv', label: 'CSV file' },
  { value: 'excel', label: 'Excel file' },
  { value: 'pdf', label: 'PDF', description: 'Cannot be made from this file.', disabled: true },
];

const COLUMNS: readonly string[] = ['Revenue', 'Orders', 'Discount'];

const HINDI_SWITCH = 'हर जाँचे गए जवाब पर फ़ोन में हल्का कंपन महसूस हो, ताकि बिना देखे भी पता चल जाए';
const HINDI_CHECKBOX = 'रिपोर्ट में हर महीने की कुल बिक्री और पिछले साल से उसकी तुलना भी शामिल करें';

// For the samples that only show a state and are not meant to change.
const still = (): void => {};

// How long the pretend save of the busy switch takes. Not motion: it stands
// in for a slow answer from somewhere, so it is not a motion token.
const PRETEND_SAVE_MS = 1500;

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

// The surface the controls will live on: a card, so every state is judged on
// paper and not on the ground.
function Panel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>{children}</View>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack gap="lg">
      <Txt variant="heading" accessibilityRole="header">
        {title}
      </Txt>
      {children}
    </VStack>
  );
}

// --- Switch --------------------------------------------------------------------

// A switch whose change takes a moment to save: it moves at once, shows the
// working mark, and takes no press until the pretend save is over.
function SavingSwitch() {
  const [on, setOn] = useState(false);
  const [saving, setSaving] = useState(false);

  // The pretend save ends by itself, and is dropped if the page goes away.
  useEffect(() => {
    if (!saving) return undefined;
    const timer = setTimeout(() => setSaving(false), PRETEND_SAVE_MS);
    return () => clearTimeout(timer);
  }, [saving]);

  const change = (next: boolean) => {
    setOn(next);
    setSaving(true);
  };

  return (
    <Switch checked={on} onChange={change} busy={saving}>
      Open the last file when the app starts
    </Switch>
  );
}

function SwitchExamples() {
  const [bare, setBare] = useState(false);
  const [bareOn, setBareOn] = useState(true);
  const [small, setSmall] = useState(true);
  const [medium, setMedium] = useState(false);
  const [large, setLarge] = useState(true);
  const [detailed, setDetailed] = useState(true);
  const [hindi, setHindi] = useState(false);

  return (
    <Group title="Switch">
      <Example caption="Bare, off and on. Press either. The thumb crosses on the settle spring. A bare switch has no words, so each has an accessibilityLabel.">
        <Panel>
          <HStack gap="xl" px="sm">
            <Switch checked={bare} onChange={setBare} accessibilityLabel="Taps in the hand" />
            <Switch checked={bareOn} onChange={setBareOn} accessibilityLabel="Rolling numbers" />
          </HStack>
        </Panel>
      </Example>

      <Example caption="With words, the whole row is the switch. Sizes sm, md and lg: sm sets the words in small type, lg is 56 high like a list row. The switch itself is one size.">
        <Panel>
          <Switch size="sm" checked={small} onChange={setSmall}>
            Small: taps in the hand
          </Switch>
          <Switch checked={medium} onChange={setMedium}>
            Medium: taps in the hand
          </Switch>
          <Switch size="lg" checked={large} onChange={setLarge} label="Large: taps in the hand" />
        </Panel>
      </Example>

      <Example caption="Your own words in place of a label: a title over a line of detail.">
        <Panel>
          <Switch size="lg" checked={detailed} onChange={setDetailed}>
            <Txt variant="label" selectable={false}>
              Taps in the hand
            </Txt>
            <Txt variant="small" tone="soft" selectable={false}>
              A light tap when a choice changes or an answer is checked.
            </Txt>
          </Switch>
        </Panel>
      </Example>

      <Example caption="Disabled, off and on: plain paper and faint ink, never a faded blue. Which is which is told by the thumb's place and size.">
        <Panel>
          <Switch disabled checked={false} onChange={still}>
            Off, and cannot be changed
          </Switch>
          <Switch disabled checked onChange={still}>
            On, and cannot be changed
          </Switch>
          <HStack gap="xl" px="sm">
            <Switch disabled checked={false} onChange={still} accessibilityLabel="Off, and cannot be changed" />
            <Switch disabled checked onChange={still} accessibilityLabel="On, and cannot be changed" />
          </HStack>
        </Panel>
      </Example>

      <Example caption="Busy: press it. It moves at once, shows the working mark while a pretend save runs, and takes no press until that ends. The row keeps its size.">
        <Panel>
          <SavingSwitch />
        </Panel>
      </Example>

      <Example caption="Busy, held still for a look: off and on. With reduced motion the three dots stand still.">
        <Panel>
          <Switch busy checked={false} onChange={still}>
            Saving, off
          </Switch>
          <Switch busy checked onChange={still}>
            Saving, on
          </Switch>
        </Panel>
      </Example>

      <Example caption="Long Hindi words wrap. The row grows with them and the switch stays level with their middle.">
        <Panel>
          <Switch checked={hindi} onChange={setHindi}>
            {HINDI_SWITCH}
          </Switch>
        </Panel>
      </Example>
    </Group>
  );
}

// --- Segmented -------------------------------------------------------------------

function SegmentedExamples() {
  const [paper, setPaper] = useState<Paper>('light');
  const [look, setLook] = useState<Look>('phone');
  const [span, setSpan] = useState<Span>('month');
  const [sized, setSized] = useState<Look>('light');
  const [shown, setShown] = useState<Shown>('chart');
  const [short, setShort] = useState<Span>('month');
  const [drawing, setDrawing] = useState<Drawing>('bars');
  const [which, setWhich] = useState<Which>('all');
  const [german, setGerman] = useState<Look>('phone');
  const [hindi, setHindi] = useState<Look>('phone');
  const [longHindi, setLongHindi] = useState<NumberStyle>('indian');

  return (
    <Group title="Segmented">
      <Example caption="Two choices, as on the brand board. In a column it takes the full width: each segment is as wide as its words need, and they share what is left over. One pill slides between them on the settle spring, and the letters turn white exactly where the blue is under them.">
        <Panel>
          <Segmented options={PAPERS} value={paper} onChange={setPaper} accessibilityLabel="Light or dark" />
        </Panel>
      </Example>

      <Example caption="Three choices. role radiogroup (the default): it picks a value, and each segment is a radio.">
        <Panel>
          <Segmented options={LOOKS} value={look} onChange={setLook} accessibilityLabel="Look" />
        </Panel>
      </Example>

      <Example caption="Four choices, the most it takes.">
        <Panel>
          <Segmented options={SPANS} value={span} onChange={setSpan} accessibilityLabel="Span" />
        </Panel>
      </Example>

      <Example caption="Sizes sm, md and lg. sm is drawn 44 high in small type and still takes a 48 touch; md is 48; lg is 52, to stand beside a field or a main button.">
        <Panel>
          <Segmented size="sm" options={LOOKS} value={sized} onChange={setSized} accessibilityLabel="Look, small" />
          <Segmented options={LOOKS} value={sized} onChange={setSized} accessibilityLabel="Look, medium" />
          <Segmented size="lg" options={LOOKS} value={sized} onChange={setSized} accessibilityLabel="Look, large" />
        </Panel>
      </Example>

      <Example caption="role tablist: it switches what is shown under it, and each segment is a tab.">
        <Panel>
          <Segmented role="tablist" options={SHOWN} value={shown} onChange={setShown} accessibilityLabel="Show as" />
          <View style={styles.inset}>
            <Txt tone="soft">{SHOWN_WORDS[shown]}</Txt>
          </View>
        </Panel>
      </Example>

      <Example caption="In a row it is only as wide as its words, the form on the brand board. Short labels keep a segment at least 68 wide, and here each has a whole word for a screen reader.">
        <Panel>
          <HStack gap="md" justify="between" wrap px="sm">
            <Txt variant="label">Revenue</Txt>
            <Segmented options={SPANS_SHORT} value={short} onChange={setShort} accessibilityLabel="Span" />
          </HStack>
        </Panel>
      </Example>

      <Example caption="Words of unequal length, in a row and at full width. The pill takes the width of the segment it goes to, on the same spring as the slide.">
        <Panel>
          <HStack px="sm" wrap>
            <Segmented options={WHICH} value={which} onChange={setWhich} accessibilityLabel="Show, in a row" />
          </HStack>
          <Segmented options={WHICH} value={which} onChange={setWhich} accessibilityLabel="Show, at full width" />
        </Panel>
      </Example>

      <Example caption="One long word that cannot break (German). It gets the room it needs and the short ones give way; equal thirds would have cut it in two.">
        <Panel>
          <Segmented options={LOOKS_GERMAN} value={german} onChange={setGerman} accessibilityLabel="Look, in German" />
        </Panel>
      </Example>

      <Example caption="One choice switched off: Line is in faint ink and takes no press.">
        <Panel>
          <Segmented options={DRAWINGS} value={drawing} onChange={setDrawing} accessibilityLabel="Draw as" />
        </Panel>
      </Example>

      <Example caption="The whole control disabled: plain paper and faint ink. The chosen segment keeps a ring, so it is still told by form.">
        <Panel>
          <Segmented disabled options={LOOKS} value="light" onChange={still} accessibilityLabel="Look" />
        </Panel>
      </Example>

      <Example caption="Hindi labels.">
        <Panel>
          <Segmented options={LOOKS_HINDI} value={hindi} onChange={setHindi} accessibilityLabel="Look" />
        </Panel>
      </Example>

      <Example caption="Long Hindi labels: too wide together, so each segment gives way in step with its words and they wrap. The track grows with them and the pill is as tall as the track.">
        <Panel>
          <Segmented
            options={NUMBER_STYLES_SEGMENTS_HINDI}
            value={longHindi}
            onChange={setLongHindi}
            accessibilityLabel="Write big numbers as"
          />
        </Panel>
      </Example>
    </Group>
  );
}

// --- RadioGroup ------------------------------------------------------------------

function RadioGroupExamples() {
  const [written, setWritten] = useState<NumberStyle | null>('indian');
  const [look, setLook] = useState<Look | null>('phone');
  const [small, setSmall] = useState<NumberStyle | null>('western');
  const [large, setLarge] = useState<NumberStyle | null>('short');
  const [kind, setKind] = useState<Kind | null>('csv');
  const [unset, setUnset] = useState<NumberStyle | null>(null);
  const [hindi, setHindi] = useState<NumberStyle | null>('indian');

  return (
    <Group title="RadioGroup">
      <Example caption="The option rows of a sheet, as on the brand board. The whole row is the target, at least 48 high. The dot scales in, and the chosen row is set in the heavier weight.">
        <Panel>
          <RadioGroup
            options={NUMBER_STYLES}
            value={written}
            onChange={setWritten}
            accessibilityLabel="Write big numbers as"
          />
        </Panel>
      </Example>

      <Example caption="With a line of detail under each label.">
        <Panel>
          <RadioGroup options={LOOKS_WITH_DETAIL} value={look} onChange={setLook} accessibilityLabel="Look" />
        </Panel>
      </Example>

      <Example caption="Size sm: the words in small type. The rows are still 48 high.">
        <Panel>
          <RadioGroup
            size="sm"
            options={NUMBER_STYLES}
            value={small}
            onChange={setSmall}
            accessibilityLabel="Write big numbers as, small"
          />
        </Panel>
      </Example>

      <Example caption="Size lg: every row 56 high, to stand in a list of rows.">
        <Panel>
          <RadioGroup
            size="lg"
            options={NUMBER_STYLES}
            value={large}
            onChange={setLarge}
            accessibilityLabel="Write big numbers as, large"
          />
        </Panel>
      </Example>

      <Example caption="One choice switched off: PDF is in faint ink and takes no press.">
        <Panel>
          <RadioGroup options={KINDS} value={kind} onChange={setKind} accessibilityLabel="Save as" />
        </Panel>
      </Example>

      <Example caption="The whole group disabled: plain paper and faint ink. The chosen row keeps its dot and its weight.">
        <Panel>
          <RadioGroup
            disabled
            options={NUMBER_STYLES}
            value="western"
            onChange={still}
            accessibilityLabel="Write big numbers as"
          />
        </Panel>
      </Example>

      <Example caption="Error: nothing is chosen yet. The line says what is wrong and what to do, with the error icon, and the rings turn red. Choose a row and it clears.">
        <Panel>
          <RadioGroup
            options={NUMBER_STYLES}
            value={unset}
            onChange={setUnset}
            error={unset === null ? 'Nothing is chosen yet. Choose how big numbers are written to go on.' : undefined}
            accessibilityLabel="Write big numbers as"
          />
        </Panel>
      </Example>

      <Example caption="Long Hindi labels and details wrap. Each row grows with its words and the radio stays level with their middle.">
        <Panel>
          <RadioGroup
            options={NUMBER_STYLES_HINDI}
            value={hindi}
            onChange={setHindi}
            accessibilityLabel="Write big numbers as"
          />
        </Panel>
      </Example>
    </Group>
  );
}

// --- Checkbox --------------------------------------------------------------------

// The "some, not all" box over a short list: ticked when every column is,
// a dash when only some are.
function ColumnPicker() {
  const [picked, setPicked] = useState<readonly string[]>(['Revenue']);
  const all = picked.length === COLUMNS.length;
  const some = picked.length > 0 && !all;

  return (
    <View>
      <Checkbox checked={all} indeterminate={some} onChange={(next) => setPicked(next ? COLUMNS : [])}>
        All columns
      </Checkbox>
      <VStack ps="xxl">
        {COLUMNS.map((column) => (
          <Checkbox
            key={column}
            checked={picked.includes(column)}
            onChange={(next) => setPicked(next ? [...picked, column] : picked.filter((one) => one !== column))}>
            {column}
          </Checkbox>
        ))}
      </VStack>
    </View>
  );
}

function CheckboxExamples() {
  const [chart, setChart] = useState(true);
  const [small, setSmall] = useState(false);
  const [medium, setMedium] = useState(true);
  const [large, setLarge] = useState(false);
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(true);
  const [names, setNames] = useState(false);
  const [hindi, setHindi] = useState(true);

  return (
    <Group title="Checkbox">
      <Example caption="A yes or no that stands by itself. Press it: the box fills and the tick strokes itself in; pressed again, the fill fades and the tick leaves.">
        <Panel>
          <Checkbox checked={chart} onChange={setChart}>
            Put the chart in the report
          </Checkbox>
        </Panel>
      </Example>

      <Example caption="Some, not all: the dash. Tick and untick the columns, then press the top box.">
        <Panel>
          <ColumnPicker />
        </Panel>
      </Example>

      <Example caption="Sizes sm, md and lg: sm sets the words in small type, lg is 56 high like a list row. The box is always 22.">
        <Panel>
          <Checkbox size="sm" checked={small} onChange={setSmall}>
            Small: do not ask again
          </Checkbox>
          <Checkbox checked={medium} onChange={setMedium}>
            Medium: put the chart in the report
          </Checkbox>
          <Checkbox size="lg" checked={large} onChange={setLarge} label="Large: put the chart in the report" />
        </Panel>
      </Example>

      <Example caption="Bare boxes, for a row of a table. Each is 48 by 48 to a finger around its 22 drawing, and each has an accessibilityLabel.">
        <Panel>
          <HStack gap="sm">
            <Checkbox checked={first} onChange={setFirst} accessibilityLabel="Row 1" />
            <Checkbox checked={second} onChange={setSecond} accessibilityLabel="Row 2" />
          </HStack>
        </Panel>
      </Example>

      <Example caption="Disabled: not ticked, ticked, and some. Plain paper and faint ink; the tick and the dash stay, so the state is still told by form.">
        <Panel>
          <Checkbox disabled checked={false} onChange={still}>
            Not ticked, and cannot be changed
          </Checkbox>
          <Checkbox disabled checked onChange={still}>
            Ticked, and cannot be changed
          </Checkbox>
          <Checkbox disabled checked={false} indeterminate onChange={still}>
            Some, and cannot be changed
          </Checkbox>
        </Panel>
      </Example>

      <Example caption="Error: the box must be ticked. The line says what is wrong and what to do, with the error icon, and the edge of the box turns red. Tick it and it clears.">
        <Panel>
          <Checkbox
            checked={names}
            onChange={setNames}
            error={names ? undefined : 'This is not ticked yet. Tick it to go on, or go back and choose the row that holds the names.'}>
            The first row of my file holds the column names
          </Checkbox>
        </Panel>
      </Example>

      <Example caption="Long Hindi words wrap. The row grows with them and the box stays level with their middle.">
        <Panel>
          <Checkbox checked={hindi} onChange={setHindi}>
            {HINDI_CHECKBOX}
          </Checkbox>
        </Panel>
      </Example>
    </Group>
  );
}

// --- The section ---------------------------------------------------------------

export type SelectionGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the selection group:
//   <SelectionGallery />
// It needs AppStateProvider above it (its text reads the app language) and
// sets no outer margin: the gallery page spaces it.
export function SelectionGallery({ style }: SelectionGalleryProps) {
  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Selection
        </Txt>
        <Txt tone="soft">
          The four controls that hold a choice. What is chosen is filled with the action blue and marked by form as
          well: a thumb at the far end, a pill, a dot, a tick. Every one answers at contact, changes on release with
          one selection tap in the hand, and is at least 48 to a finger.
        </Txt>
      </VStack>

      <SwitchExamples />
      <SegmentedExamples />
      <RadioGroupExamples />
      <CheckboxExamples />
    </VStack>
  );
}

const styles = StyleSheet.create({
  // A card: surface, a 1 line edge, radius 20, no shadow. Colour is added at
  // render because it changes with the theme.
  panel: {
    borderWidth: border.hairline,
    borderRadius: radius.card,
    padding: space.sm,
    gap: space.sm,
  },
  // Lines words up with the rows of a panel, which keep 8 at their ends.
  inset: { paddingHorizontal: space.sm, paddingVertical: space.xs },
});
