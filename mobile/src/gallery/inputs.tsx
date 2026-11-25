import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { border, radius, rhythm, sizes, space, useTheme } from '@/theme';
import { Field } from '@/ui/field';
import { Icon } from '@/ui/icon';
import { SearchBar } from '@/ui/search-bar';
import { Slider } from '@/ui/slider';
import { HStack, VStack } from '@/ui/stack';
import { Stepper } from '@/ui/stepper';
import { Txt } from '@/ui/text';

// The gallery's page for the input group: Field, SearchBar, Stepper and
// Slider, each in every size and state it has, so a reviewer can type in,
// press and drag all of them.
//
// Developer-facing: the captions and the sample words are plain English (and
// sample Hindi) on purpose and are not in the app's translations. Nothing
// here ships in a screen.

// How long the sample search waits after the last key. It says how the sample
// behaves, not how anything moves, so it is not a motion token.
const SEARCH_WAIT = 300;

const TAKEN_NAME = 'March sales';

// What the live error example says about a name, or nothing when it is fine.
// An error says what happened and what to do next.
function nameProblem(name: string): string | undefined {
  const typed = name.trim();
  if (typed === '') return 'A report needs a name. Type one.';
  if (typed.toLowerCase() === TAKEN_NAME.toLowerCase()) {
    return 'A report with this name already exists. Type a different name.';
  }
  return undefined;
}

// A change in percent, written with its sign.
function signedPercent(change: number): string {
  return `${change > 0 ? '+' : ''}${change}%`;
}

// For the samples that only show a state and are not meant to change.
const still = (): void => {};

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

function Part({ title, about, children }: { title: string; about: string; children: ReactNode }) {
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

// A number beside the control that sets it: the words at the start, the
// number at the end, wrapping when the text is large.
function Readout({ words, number }: { words: string; number: string }) {
  return (
    <HStack gap="sm" justify="between" wrap>
      <Txt tone="soft" style={styles.shrink}>
        {words}
      </Txt>
      <Txt weight="600">{number}</Txt>
    </HStack>
  );
}

// --- Field -------------------------------------------------------------------

function FieldExamples() {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [taken, setTaken] = useState(TAKEN_NAME);
  const [rows, setRows] = useState('25');
  const [note, setNote] = useState('');
  const [marked, setMarked] = useState('');
  const [question, setQuestion] = useState('');
  const [onCard, setOnCard] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [hindiTaken, setHindiTaken] = useState('मार्च महीने की दुकान की बिक्री');
  const [hindiNote, setHindiNote] = useState(
    'ये आँकड़े सिर्फ़ जयपुर और कोटा की दुकानों के हैं। अप्रैल की बिक्री अभी इसमें जोड़ी नहीं गई है, इसलिए कुल जोड़ कम दिखेगा।',
  );
  const [hindiQuestion, setHindiQuestion] = useState('');

  return (
    <Part
      title="Field"
      about="A labelled text field. The label is always above it and stays there while you type; a placeholder never stands in for a label.">
      <Example caption="Default, with a hint. Tap it: a 2 edge of the action blue eases in over the 1.5 edge of faint ink, and the text does not move. A press on the padding puts the cursor in too.">
        <Field
          label="Report name"
          placeholder="March sales"
          hint="Shown at the top of the report."
          value={name}
          onChangeText={setName}
        />
      </Example>

      <Example caption="Error, live. The name below is taken. Change it and the note goes; clear the field and another one comes. The note is an icon and words that say what to do next, the edge turns red, and a screen reader is told.">
        <Field
          label="Report name"
          hint="Any name that is not used yet."
          error={nameProblem(taken)}
          value={taken}
          onChangeText={setTaken}
        />
      </Example>

      <Example caption="Prefix and suffix. Every TextInput prop passes through: this one asks for the number pad and stops at three digits.">
        <Field
          label="Rows to show"
          keyboardType="number-pad"
          maxLength={3}
          value={rows}
          onChangeText={setRows}
          prefix={<Icon name="row" size={sizes.iconSmall} color={colors.inkSoft} />}
          suffix={
            <Txt variant="label" tone="soft" snug>
              rows
            </Txt>
          }
        />
      </Example>

      <Example caption="multiline: several lines from the start. The corner is 14, not a pill, and the field grows as you type.">
        <Field
          label="Note for the reader"
          multiline
          maxLength={500}
          placeholder="What should someone know before they read these numbers?"
          hint="Up to 500 characters."
          value={note}
          onChangeText={setNote}
        />
      </Example>

      <Example caption="multiline with a prefix: the icon stays level with the first line however far the field grows.">
        <Field
          label="What to look for"
          multiline
          placeholder="Late bills, missing dates, a city spelt two ways"
          value={marked}
          onChangeText={setMarked}
          prefix={<Icon name="file-check" size={sizes.iconSmall} color={colors.inkSoft} />}
        />
      </Example>

      <Example caption="grows: for a sentence. One line and a pill to begin with; it takes a new line as the text needs one and keeps its 26 corner. After five lines it scrolls inside. The label is spoken, not drawn.">
        <Field
          label="Your question"
          labelHidden
          grows
          placeholder="Type your question…"
          value={question}
          onChangeText={setQuestion}
        />
      </Example>

      <Example caption="Disabled: plain paper and faint ink, never a faded blue. With text, empty, several lines, and growing.">
        <Field label="Report name" disabled value="March sales" hint="A report that has been shared keeps its name." />
        <Field label="Report name" disabled placeholder="March sales" />
        <Field label="Note for the reader" disabled multiline value="Jaipur and Kota only. April is not in yet." />
        <Field label="Your question" labelHidden disabled grows placeholder="Type your question…" />
      </Example>

      <Example caption="On a card. The field is the same paper as the card; its edge is what marks it.">
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Field
            label="Report name"
            placeholder="March sales"
            hint="Shown at the top of the report."
            value={onCard}
            onChangeText={setOnCard}
          />
        </View>
      </Example>

      <Example caption="Long Hindi. The label, the hint and the error wrap onto as many lines as they need, the placeholder is cut at the edge of the field, and no letter is clipped above or below. Check this at the largest text size on a phone.">
        <Field
          label="इस रिपोर्ट को जिस नाम से सहेजना है, वह नाम यहाँ लिखें"
          placeholder="जैसे: मार्च महीने की दुकान की बिक्री और बचा हुआ माल"
          hint="नाम छोटा रखें, ताकि वह फ़ाइलों की सूची में पूरा दिखे और आप उसे बाद में आसानी से ढूँढ सकें।"
          value={hindiName}
          onChangeText={setHindiName}
        />
        <Field
          label="रिपोर्ट का नाम"
          error="इस नाम की रिपोर्ट पहले से मौजूद है। कोई दूसरा नाम लिखें, या पुरानी रिपोर्ट को हटाकर फिर कोशिश करें।"
          value={hindiTaken}
          onChangeText={setHindiTaken}
        />
        <Field
          label="पढ़ने वाले के लिए टिप्पणी"
          multiline
          hint="यह टिप्पणी रिपोर्ट में सबसे ऊपर, नाम के ठीक नीचे दिखाई देगी।"
          value={hindiNote}
          onChangeText={setHindiNote}
        />
        <Field
          label="अपना सवाल लिखें"
          labelHidden
          grows
          placeholder="अपना सवाल लिखें…"
          value={hindiQuestion}
          onChangeText={setHindiQuestion}
        />
      </Example>
    </Part>
  );
}

// --- SearchBar ---------------------------------------------------------------

function SearchBarExamples() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState<string | null>(null);
  const [city, setCity] = useState('Jaipur');
  const [working, setWorking] = useState('Jaipur');
  const [hindi, setHindi] = useState('');
  const [hindiCity, setHindiCity] = useState('जयपुर');

  return (
    <Part
      title="SearchBar"
      about="A pill with a magnifier and, once there is text, a button that clears it. A Field underneath: the same edge, the same blue edge with the cursor in it.">
      <Example caption="Type something. onChangeText follows every key; onSearch waits 300 ms after the last one. The search key and the clear button do not wait.">
        <SearchBar
          label="Search this file"
          placeholder="Customer, city or bill number"
          value={query}
          onChangeText={setQuery}
          debounce={SEARCH_WAIT}
          onSearch={setSearched}
        />
        <View aria-live="polite">
          <Txt variant="small" tone="faint">
            {searched === null
              ? 'onSearch has not been called yet.'
              : searched === ''
                ? 'onSearch was last called with nothing: the bar was cleared.'
                : `onSearch was last called with: ${searched}`}
          </Txt>
        </View>
      </Example>

      <Example caption="With text: the clear button, a cross that keeps its whole 48 target inside the pill. It empties the bar and leaves the cursor in it.">
        <SearchBar label="Search this file" placeholder="Customer, city or bill number" value={city} onChangeText={setCity} />
      </Example>

      <Example caption="Busy: the working mark takes the magnifier's place. Nothing changes size, the bar can still be typed in and cleared, and a screen reader hears that it is busy. With less motion the three dots stand still.">
        <SearchBar
          label="Search this file"
          placeholder="Customer, city or bill number"
          busy
          value={working}
          onChangeText={setWorking}
        />
      </Example>

      <Example caption="Disabled, with text and empty: plain paper, faint ink, no clear button.">
        <SearchBar label="Search this file" disabled value="Jaipur" onChangeText={still} />
        <SearchBar
          label="Search this file"
          disabled
          placeholder="Customer, city or bill number"
          value=""
          onChangeText={still}
        />
      </Example>

      <Example caption="Long Hindi placeholder: one line, cut at the edge of the pill, never squeezed. And a search in Hindi, in the Devanagari face.">
        <SearchBar
          label="इस फ़ाइल में खोजें"
          placeholder="ग्राहक का नाम, शहर या बिल नंबर लिखकर इस फ़ाइल की पंक्तियों में खोजें"
          value={hindi}
          onChangeText={setHindi}
        />
        <SearchBar
          label="इस फ़ाइल में खोजें"
          placeholder="ग्राहक का नाम, शहर या बिल नंबर"
          value={hindiCity}
          onChangeText={setHindiCity}
        />
      </Example>
    </Part>
  );
}

// --- Stepper -----------------------------------------------------------------

function StepperExamples() {
  const [copies, setCopies] = useState(1);
  const [count, setCount] = useState(3);
  const [change, setChange] = useState(10);
  const [share, setShare] = useState(0.3);
  const [top, setTop] = useState(10);
  const [rows, setRows] = useState(25);

  return (
    <Part
      title="Stepper"
      about="A number with a key on each side. Press a key to take one step; hold it and it keeps stepping. Every step is felt once in the hand, and the number is read out as it changes.">
      <Example caption="sm, from 1 to 9: 48 high, to sit in a row of a list. Its keys are drawn 44 and still take a 48 touch.">
        <Stepper
          size="sm"
          value={copies}
          onValueChange={setCopies}
          min={1}
          max={9}
          accessibilityLabel="Copies"
          decreaseLabel="One copy fewer"
          increaseLabel="One copy more"
        />
      </Example>

      <Example caption="md, from 0 to 10: as high as a field. At 0 the minus key switches off, and a held key stops there.">
        <Stepper
          value={count}
          onValueChange={setCount}
          min={0}
          max={10}
          accessibilityLabel="Charts on a page"
          decreaseLabel="One less"
          increaseLabel="One more"
        />
      </Example>

      <Example caption="lg, in steps of 5 from -50 to 50: for a number that is the point of the screen. valueText is the number as the app writes it.">
        <Stepper
          size="lg"
          value={change}
          onValueChange={setChange}
          min={-50}
          max={50}
          step={5}
          valueText={signedPercent(change)}
          accessibilityLabel="Change in sales"
          decreaseLabel="Five less"
          increaseLabel="Five more"
        />
      </Example>

      <Example caption="Steps of 0.1. The number stays clean: 0.1 and 0.2 make 0.3, with no dust behind it.">
        <Stepper
          value={share}
          onValueChange={setShare}
          min={0}
          max={1}
          step={0.1}
          valueText={share.toFixed(1)}
          accessibilityLabel="Share kept"
          decreaseLabel="A tenth less"
          increaseLabel="A tenth more"
        />
      </Example>

      <Example caption="At the top of its range: the plus key is off.">
        <Stepper
          value={top}
          onValueChange={setTop}
          min={0}
          max={10}
          accessibilityLabel="Charts on a page"
          decreaseLabel="One less"
          increaseLabel="One more"
        />
      </Example>

      <Example caption="Disabled, sm, md and lg: plain paper and faint ink.">
        <Stepper
          size="sm"
          value={1}
          onValueChange={still}
          disabled
          accessibilityLabel="Copies"
          decreaseLabel="One copy fewer"
          increaseLabel="One copy more"
        />
        <Stepper
          value={3}
          onValueChange={still}
          disabled
          accessibilityLabel="Charts on a page"
          decreaseLabel="One less"
          increaseLabel="One more"
        />
        <Stepper
          size="lg"
          value={10}
          onValueChange={still}
          disabled
          valueText={signedPercent(10)}
          accessibilityLabel="Change in sales"
          decreaseLabel="Five less"
          increaseLabel="Five more"
        />
      </Example>

      <Example caption="Not known: a number that is not a number shows a dash, never zero, and both keys are off.">
        <Stepper
          value={Number.NaN}
          onValueChange={still}
          accessibilityLabel="Charts on a page"
          decreaseLabel="One less"
          increaseLabel="One more"
        />
      </Example>

      <Example caption="Children in place of the plain number, stretched to the full width: the number with its words, in long Hindi. The words wrap between the keys and the pill grows.">
        <Stepper
          value={rows}
          onValueChange={setRows}
          min={5}
          max={500}
          step={5}
          accessibilityLabel="एक साथ दिखाई जाने वाली पंक्तियाँ"
          decreaseLabel="पाँच पंक्तियाँ कम दिखाएँ"
          increaseLabel="पाँच पंक्तियाँ और दिखाएँ"
          style={styles.stretch}>
          <Txt variant="label" align="center" style={styles.stretch}>
            {`${rows} पंक्तियाँ एक साथ दिखाएँ`}
          </Txt>
        </Stepper>
      </Example>
    </Part>
  );
}

// --- Slider ------------------------------------------------------------------

function SliderExamples() {
  const [level, setLevel] = useState(40);
  const [change, setChange] = useState(15);
  const [leftAt, setLeftAt] = useState<number | null>(null);
  const [score, setScore] = useState(3);
  const [share, setShare] = useState(0.5);
  const [hindi, setHindi] = useState(-20);

  return (
    <Part
      title="Slider"
      about="A track, the chosen part of it in the action blue, and a thumb. Drag the thumb or press the track, with a finger or a mouse. A drag starts after a few dp sideways, so this page still scrolls when a finger lands on a slider. With a keyboard: the arrow keys, Page Up and Page Down, Home and End.">
      {/* A gesture needs this once above it. The app's root layout will hold it; the gallery
          brings its own here so the sliders work wherever this page is shown. */}
      <GestureHandlerRootView style={styles.sliders}>
        <Example caption="No detents: the thumb moves freely and the number moves in hundredths of the range, silently.">
          <Readout words="Level" number={String(level)} />
          <Slider accessibilityLabel="Level" value={level} onValueChange={setLevel} />
        </Example>

        <Example caption="Detents every 5 from -50 to +50. Each one crossed is felt once in the hand. Let go between two and the thumb settles on the nearer one. onValueCommit is called once, when the finger lets go.">
          <Readout words="Change in sales" number={signedPercent(change)} />
          <Slider
            accessibilityLabel="Change in sales"
            valueText={signedPercent(change)}
            min={-50}
            max={50}
            step={5}
            value={change}
            onValueChange={setChange}
            onValueCommit={setLeftAt}
          />
          <View aria-live="polite">
            <Txt variant="small" tone="faint">
              {leftAt === null ? 'Not let go of yet.' : `Last let go at ${signedPercent(leftAt)}.`}
            </Txt>
          </View>
        </Example>

        <Example caption="marks: five places, 1 to 5. Few detents, far apart, each with a dot on the track; the dots already passed are under the blue.">
          <Readout words="Score" number={`${score} of 5`} />
          <Slider
            accessibilityLabel="Score"
            valueText={`${score} of 5`}
            min={1}
            max={5}
            step={1}
            marks
            value={score}
            onValueChange={setScore}
          />
        </Example>

        <Example caption="Steps of 0.1 from 0 to 1. The number stays clean, and a screen reader is given it as written, not cut to a whole number.">
          <Readout words="Share kept" number={share.toFixed(1)} />
          <Slider
            accessibilityLabel="Share kept"
            valueText={share.toFixed(1)}
            min={0}
            max={1}
            step={0.1}
            value={share}
            onValueChange={setShare}
          />
        </Example>

        <Example caption="Disabled: faint ink on the same track, never a faded blue. It takes no touch. Plain, with detents, and with marks.">
          <Slider accessibilityLabel="Level" disabled value={30} />
          <Slider accessibilityLabel="Change in sales" disabled min={-50} max={50} step={5} value={-25} />
          <Slider accessibilityLabel="Score" valueText="2 of 5" disabled min={1} max={5} step={1} marks value={2} />
        </Example>

        <Example caption="Long Hindi beside it. The slider itself has no words: what is read out comes from accessibilityLabel and valueText.">
          <Readout words="बिक्री में कितना बदलाव मानकर हिसाब दोबारा देखना है" number={signedPercent(hindi)} />
          <Slider
            accessibilityLabel="बिक्री में कितना बदलाव मानकर हिसाब दोबारा देखना है"
            valueText={`${hindi} प्रतिशत`}
            min={-50}
            max={50}
            step={5}
            value={hindi}
            onValueChange={setHindi}
          />
        </Example>
      </GestureHandlerRootView>
    </Part>
  );
}

// --- The section ---------------------------------------------------------------

export type InputsGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the inputs group:
//   <InputsGallery />
// It needs AppStateProvider above it (its text and its fields read the app
// language) and sets no outer margin: the gallery page spaces it. Put it in a
// scroller with keyboardShouldPersistTaps="handled", so a clear button can be
// pressed while the keyboard is up.
export function InputsGallery({ style }: InputsGalleryProps) {
  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Inputs
        </Txt>
        <Txt tone="soft">
          Where a person gives the app something: words in a field, a search, a number stepped or slid. Disabled is
          plain paper everywhere, an error is always an icon and words, and nothing a finger presses is under 48.
        </Txt>
      </VStack>
      <FieldExamples />
      <SearchBarExamples />
      <StepperExamples />
      <SliderExamples />
    </VStack>
  );
}

const styles = StyleSheet.create({
  // A card: surface, a 1 line edge, radius 20, no shadow. Colour is added at
  // render because it changes with the theme.
  card: {
    borderWidth: border.hairline,
    borderRadius: radius.card,
    padding: rhythm.cardPadding,
  },
  // The sliders, spaced like the examples of the other parts. Not a flex box:
  // it is as tall as what is in it.
  sliders: { gap: space.lg },
  // Takes the whole width of its parent.
  stretch: { alignSelf: 'stretch' },
  // Gives way to the number beside it, so long words wrap.
  shrink: { flexShrink: 1 },
});
