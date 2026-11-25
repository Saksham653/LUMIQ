import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useNumbers } from '@/state/app-state';
import {
  border,
  cascadeMax,
  checkedTimeline,
  duration,
  radius,
  rhythm,
  sizes,
  space,
  useReducedMotion,
  useTheme,
} from '@/theme';
import { Appear } from '@/ui/appear';
import { Button } from '@/ui/button';
import { AnswerText, CheckedNumber, type CheckedNumberState } from '@/ui/checked-number';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Numeral, countFrame, type NumeralAlign, type NumeralSize } from '@/ui/numeral';
import { ProofStamp } from '@/ui/proof-stamp';
import { HStack, VStack } from '@/ui/stack';
import { UIStringsProvider } from '@/ui/strings';
import { Txt } from '@/ui/text';

// The gallery's page for the numbers group: Numeral, CheckedNumber (with
// AnswerText, the sentence it sits in), ProofStamp and Appear. Every size and
// state is here, and everything that plays can be played again.
//
// Developer-facing: the captions and the sample words are plain English (and
// some Hindi, to show long text) on purpose and are not in the app's
// translations. Nothing here ships in a screen.

// --- Sample content ----------------------------------------------------------------

type StandingSize = Exclude<NumeralSize, 'inline'>;

const STANDING: readonly { size: StandingSize; note: string }[] = [
  { size: 'hero', note: 'hero: 56 on a 60 line' },
  { size: 'large', note: 'large: 40 on a 44 line (the default)' },
  { size: 'medium', note: 'medium: 28 on a 32 line' },
];

const ALIGNS: readonly NumeralAlign[] = ['start', 'center', 'end'];

// The two numbers the brand board rolls between.
const ROLLS: readonly { value: string; prefix?: string; unit: string; spoken: string }[] = [
  { value: '4.68', unit: 'M', spoken: '4.68 million' },
  { value: '46.8', prefix: '₹', unit: 'लाख', spoken: '46.8 lakh rupees' },
];

// What the count-up counts to.
const COUNT_TO = 1234567;

// The same number, one digit longer each time, to watch it step down the
// ladder.
const GROWING: readonly string[] = [
  '712',
  '7,120',
  '71,200',
  '7,12,000',
  '71,20,000',
  '7,12,00,000',
  '71,20,00,000',
  '7,12,00,00,000',
  '71,20,00,00,000',
];

// Small figures in a table: the one place the lighter weight is used.
const TABLE: readonly { month: string; value: string }[] = [
  { month: 'October', value: '4,48,200' },
  { month: 'November', value: '5,91,750' },
  { month: 'December', value: '7,12,000' },
];

const STATES: readonly { state: CheckedNumberState; note: string }[] = [
  { state: 'checked', note: 'checked: the band of light and a solid line under it' },
  { state: 'unmatched', note: 'unmatched: a dashed line in the warning colour, no band' },
  { state: 'pending', note: 'pending: a dashed line in faint ink, while the phone has not reached it' },
  { state: 'plain', note: 'plain: a number in a sentence that is not being checked' },
];

// The three numbers of the answer that is checked on this page.
const SIGNATURE_NUMBERS = 3;

// A line of an answer, for a footer to stand under.
const ANSWER = 'Total Revenue is 4.68 M across 12 months.';

const HINDI = {
  unit: 'लाख',
  longUnit: 'रुपये हर महीने',
  spoken: '46.8 लाख रुपये',
  allChecked: 'ऊपर की हर संख्या आपके फ़ोन पर किए गए हिसाब से मेल खाती है।',
  checkedCount: '{total} में से {checked} संख्याएँ आपके फ़ोन पर जाँची गईं',
  note: 'ऊपर की 1 संख्या हिसाब से मेल नहीं खा सकी। इस्तेमाल करने से पहले इसे खुद जाँच लें।',
  noneNote: 'ऊपर की कोई भी संख्या हिसाब से मेल नहीं खा सकी। इस्तेमाल करने से पहले इन्हें खुद जाँच लें।',
  checking: 'हर संख्या जाँची जा रही है',
  answer: 'इस साल की कुल बिक्री ₹46.8 लाख रही, जो पूरे 12 महीनों में फैली है।',
  rows: [
    'किराना की बिक्री सबसे ज़्यादा रही, और दिसंबर में यह पिछले साल से दोगुनी हो गई',
    'इस साल कुल बिक्री पिछले साल से 129.7% बढ़ी',
    'छूट वाले कॉलम में एक संख्या बाकी सबसे बहुत अलग है',
  ],
} as const;

const ROWS: readonly { icon: IconName; words: string }[] = [
  { icon: 'chart-bar', words: 'Grocery has the most Revenue' },
  { icon: 'chart-line', words: 'Revenue went up 129.7%' },
  { icon: 'info', words: 'Unusual number in Discount' },
  { icon: 'file-check', words: 'No empty cells in 8 columns' },
  { icon: 'calendar', words: 'December is the best month' },
  { icon: 'currency', words: 'Average order is 1,240' },
  { icon: 'column', words: 'Two columns move together' },
  { icon: 'report', words: 'The report is ready' },
];

// Writes one frame of a count-up in the app's own grouping. The function it
// returns is a worklet: Numeral calls it on the UI thread.
function frameWriter(group: string, decimal: string, indian: boolean) {
  return (value: number): string => {
    'worklet';
    return countFrame(value, 0, group, decimal, indian);
  };
}

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

// A card, to show a piece the way it sits inside one.
function Paper({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.paper, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>{children}</View>
  );
}

// What the last press did.
function Pressed({ words }: { words: string }) {
  return (
    <Txt variant="small" tone="faint" aria-live="polite">
      {words}
    </Txt>
  );
}

// --- Numeral ---------------------------------------------------------------------

function RollAgain() {
  const [run, setRun] = useState(0);
  const sample = ROLLS[run % ROLLS.length];
  return (
    <Example caption="entrance roll: every digit is its own column. The last digit moves first and the others follow 60 ms apart, on the roll spring, with no bounce. A screen reader hears one phrase, the final value. With reduced motion the number is simply there.">
      <Paper>
        {/* A new key puts a new numeral on screen, so the entrance plays again. */}
        <Numeral
          key={run}
          size="hero"
          align="center"
          entrance="roll"
          value={sample.value}
          prefix={sample.prefix}
          unit={sample.unit}
          accessibilityLabel={sample.spoken}
        />
      </Paper>
      <HStack gap="sm" wrap>
        <Button size="sm" variant="quiet" label="Play the other number" onPress={() => setRun((now) => now + 1)} />
      </HStack>
    </Example>
  );
}

function CountAgain() {
  const numbers = useNumbers();
  const [run, setRun] = useState(0);
  const { group, decimal, style } = numbers.format;
  const format = frameWriter(group, decimal, style === 'indian');
  return (
    <Example caption="entrance count: the number counts up on the UI thread, every frame written in the app's own grouping by a worklet the screen passes in (countFrame). It ends on the value exactly as the app wrote it. Change the number style under More and play it again.">
      <Paper>
        <Numeral
          key={run}
          size="large"
          entrance="count"
          count={{ to: COUNT_TO, format }}
          value={numbers.count(COUNT_TO)}
        />
        <Txt variant="small" tone="soft">
          Rows in the file
        </Txt>
      </Paper>
      <HStack gap="sm" wrap>
        <Button size="sm" variant="quiet" label="Count again" onPress={() => setRun((now) => now + 1)} />
      </HStack>
    </Example>
  );
}

function Ladder() {
  const [length, setLength] = useState(3);
  const value = GROWING[length];
  return (
    <Example caption="A figure is never wrapped and never cut. Asked for at hero, it steps down to large and then medium when it does not fit its room. Make the number longer and watch each tile: the narrow one steps down first. Under medium a phone shrinks the digits as a last resort (the browser preview cannot, and lets the figure run past its tile).">
      <HStack gap="sm" wrap>
        <Button
          size="sm"
          variant="quiet"
          icon="add"
          label="Longer"
          disabled={length >= GROWING.length - 1}
          onPress={() => setLength((now) => Math.min(now + 1, GROWING.length - 1))}
        />
        <Button
          size="sm"
          variant="quiet"
          label="Shorter"
          disabled={length <= 0}
          onPress={() => setLength((now) => Math.max(now - 1, 0))}
        />
      </HStack>
      <Paper>
        <Txt variant="small" tone="faint">
          The full width of a card
        </Txt>
        <Numeral size="hero" prefix="₹" value={value} />
      </Paper>
      <HStack gap="md" align="start">
        <Paper style={styles.half}>
          <Txt variant="small" tone="faint">
            Half a card
          </Txt>
          <Numeral size="hero" prefix="₹" value={value} />
        </Paper>
        <Paper style={styles.half}>
          <Txt variant="small" tone="faint">
            Half, asked for at medium
          </Txt>
          <Numeral size="medium" prefix="₹" value={value} />
        </Paper>
      </HStack>
    </Example>
  );
}

function Numerals() {
  const { colors } = useTheme();
  const numbers = useNumbers();
  const amount = numbers.amountParts(4677000, { type: 'money', symbol: '₹' });

  return (
    <Part
      title="Numeral"
      about="A number set as a number. The digits are in the figures face with every digit the same width; the currency sign and the unit are in the text face, in soft ink, at half the size of the digits. A figure reads left to right in every language and follows the phone's text size up to 1.6 times.">
      <Example caption="The three sizes of a figure that stands by itself.">
        <Paper>
          {STANDING.map(({ size, note }) => (
            <VStack key={size} gap="xs">
              <Txt variant="small" tone="faint">
                {note}
              </Txt>
              <Numeral size={size} value="712" unit="K" accessibilityLabel="712 thousand" />
            </VStack>
          ))}
        </Paper>
      </Example>

      <Example caption="With a currency sign and a unit. The sign and the unit never take the figures face. A percent sign belongs to the number, so it is set with the digits; a minus stands in front of the currency sign.">
        <Paper>
          <Numeral size="hero" prefix="₹" value="46.8" unit={HINDI.unit} accessibilityLabel={HINDI.spoken} />
          <Numeral size="large" prefix="$" value="4.68" unit="M" accessibilityLabel="4.68 million dollars" />
          <Numeral size="large" value="4,68" unit="Mio. €" accessibilityLabel="4,68 Millionen Euro" />
          <Numeral size="large" value="85" unit="%" accessibilityLabel="85 percent" />
          <Numeral size="medium" prefix="$" value="-1,234.50" accessibilityLabel="minus 1,234.50 dollars" />
        </Paper>
      </Example>

      <Example caption="As the app writes it: the parts come from useNumbers(), so they follow the chosen language and number style.">
        <Paper>
          <Numeral size="large" value={amount.number} prefix={amount.prefix} unit={amount.suffix} />
          <Numeral size="medium" value={numbers.count(1234567)} />
        </Paper>
      </Example>

      <Example caption="Not known is a dash, never a zero, and it has no unit. Pass the words for it as accessibilityLabel.">
        <Paper>
          <Numeral size="large" value={null} unit="K" accessibilityLabel="No value yet" />
          <Txt>
            {'Average order: '}
            <Numeral size="inline" value={undefined} />
          </Txt>
        </Paper>
      </Example>

      <RollAgain />
      <CountAgain />
      <Ladder />

      <Example caption="inline: a figure inside a sentence. It is text, takes the size and the line of the sentence, and wraps with it; its unit is at the size of the sentence, weight 600, in the colour of the number.">
        <Paper>
          <Txt>
            {'Sales reached '}
            <Numeral size="inline" prefix="₹" value="46.8" unit={HINDI.unit} />
            {' in March, from '}
            <Numeral size="inline" value="1,240" />
            {' orders. That is '}
            <Numeral size="inline" value="12.5%" />
            {' more than in February.'}
          </Txt>
          <Txt variant="small" tone="soft">
            {'In small text: '}
            <Numeral size="inline" value="319" />
            {' of '}
            <Numeral size="inline" value="319" />
            {' rows read.'}
          </Txt>
          <Txt variant="heading">
            {'In a heading: '}
            <Numeral size="inline" value="4.68" unit="M" />
          </Txt>
          <Numeral size="inline" value="712" unit="K" accessibilityLabel="712 thousand" />
        </Paper>
      </Example>

      <Example caption="align: start (the default), center and end. It follows the reading direction; the digits themselves never flip.">
        <Paper>
          {ALIGNS.map((align) => (
            <Numeral key={align} size="medium" align={align} value="12,34,567" unit={align} />
          ))}
        </Paper>
      </Example>

      <Example caption="color and unitColor take palette roles: the blue as text says look here, and on a filled surface both parts take its ink. weight 500 is only for small figures in a table.">
        <Paper>
          <Numeral size="large" color={colors.actionText} value="7.12" unit={HINDI.unit} />
        </Paper>
        <View style={[styles.filled, { backgroundColor: colors.action }]}>
          <Numeral size="large" color={colors.onAction} unitColor={colors.onAction} value="4.68" unit="M" />
        </View>
        <Paper>
          {TABLE.map((row) => (
            <HStack key={row.month} gap="md" justify="between" wrap>
              <Txt tone="soft">{row.month}</Txt>
              <Numeral size="inline" weight="500" value={row.value} />
            </HStack>
          ))}
        </Paper>
      </Example>

      <Example caption="A long unit in Hindi. The unit keeps its own taller line and the row grows; nothing is cut above or below.">
        <Paper>
          <Numeral size="large" prefix="₹" value="12,34,567" unit={HINDI.longUnit} />
          <Numeral size="medium" prefix="₹" value="46.8" unit={HINDI.unit} entrance="roll" />
        </Paper>
      </Example>
    </Part>
  );
}

// --- CheckedNumber -----------------------------------------------------------------

function Signature() {
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  // How many of the numbers the check has reached, and whether it has ended.
  const [reached, setReached] = useState(SIGNATURE_NUMBERS);
  const [ended, setEnded] = useState(true);

  useEffect(() => {
    if (run === 0) return undefined;
    // The checked signature's own script: one number after another, then the
    // stamp. With reduced motion everything is there at once.
    const between = reduced ? 0 : checkedTimeline.between;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let at = 0; at < SIGNATURE_NUMBERS; at += 1) {
      timers.push(setTimeout(() => setReached(at + 1), checkedTimeline.between + at * between));
    }
    const lastSweepEnds = checkedTimeline.between + (SIGNATURE_NUMBERS - 1) * between + (reduced ? 0 : duration.sweep);
    timers.push(setTimeout(() => setEnded(true), lastSweepEnds + (reduced ? 0 : checkedTimeline.stampDelay)));
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [run, reduced]);

  const play = () => {
    setReached(0);
    setEnded(false);
    setRun((now) => now + 1);
  };
  const stateOf = (at: number): CheckedNumberState => (at < reached ? 'checked' : 'pending');

  return (
    <Example caption="The signature, played by this page: each number lights 260 ms after the one before, the count goes up, and when all match the stamp lands once with one success tap in the hand. The band arrives by colour, so no word of the sentence moves.">
      <Paper>
        <AnswerText accessibilityLabel="Total revenue is 4.68 million across 12 months. December is the highest at 712 thousand.">
          {'Total Revenue is '}
          <CheckedNumber state={stateOf(0)} value="4.68" unit="M" />
          {' across '}
          <CheckedNumber state={stateOf(1)} value="12" />
          {' months. December is the highest at '}
          <CheckedNumber state={stateOf(2)} value="712" unit="K" />
          {'.'}
        </AnswerText>
        <ProofStamp
          checked={reached}
          total={SIGNATURE_NUMBERS}
          checkingLabel={ended ? undefined : 'Checking each number'}
          // Before the first play this is an answer from earlier: no bounce.
          still={run === 0}
        />
      </Paper>
      <HStack gap="sm" wrap>
        <Button size="sm" variant="quiet" label="Check the numbers" busy={!ended} onPress={play} />
      </HStack>
    </Example>
  );
}

function TapForProof() {
  const [shown, setShown] = useState(false);
  return (
    <Example caption="onPress: a tap on the number can open how it was worked out. The number gets no pressed look and is not a stop for a screen reader, so the same thing is always offered by a control of its own, as here.">
      <Paper>
        <AnswerText>
          {'An average month brings '}
          <CheckedNumber state="checked" prefix="₹" value="3.9" unit={HINDI.unit} onPress={() => setShown(true)} />
          {'.'}
        </AnswerText>
        <HStack gap="sm" wrap>
          <Button
            size="sm"
            variant="plain"
            label={shown ? 'Hide the working' : 'How this was worked out'}
            onPress={() => setShown((now) => !now)}
          />
        </HStack>
        {shown ? (
          <Txt variant="small" tone="soft" aria-live="polite">
            Sum of Revenue, 46.8 lakh, divided by 12 months.
          </Txt>
        ) : null}
      </Paper>
    </Example>
  );
}

function CheckedNumbers() {
  return (
    <Part
      title="CheckedNumber"
      about="A number inside a sentence, marked by what the phone's own check found. It is a run of the sentence's text, so it wraps with it on every platform. Checked is told by form as well as colour: a band and a solid line. Not matched is a dashed line and no band. AnswerText is the sentence it sits in: body text on a taller line, so bands on two lines never touch.">
      <Example caption="The four states, each standing by itself.">
        <Paper>
          {STATES.map(({ state, note }) => (
            <HStack key={state} gap="md" align="start">
              <View style={styles.sample}>
                <CheckedNumber state={state} value="712" unit="K" accessibilityLabel={`712 thousand, ${state}`} />
              </View>
              <Txt variant="small" tone="soft" style={styles.grow}>
                {note}
              </Txt>
            </HStack>
          ))}
        </Paper>
      </Example>

      <Example caption="In an answer, with a currency sign, units and a percent. One number could not be matched: the error state of this group.">
        <Paper>
          <AnswerText accessibilityLabel="December is the highest at 7.12 lakh rupees, checked, which is 85 percent, could not be matched, above an average month.">
            {'December is the highest at '}
            <CheckedNumber state="checked" prefix="₹" value="7.12" unit={HINDI.unit} />
            {', which is '}
            <CheckedNumber state="unmatched" value="85%" />
            {' above an average month.'}
          </AnswerText>
          <ProofStamp
            still
            checked={1}
            total={2}
            note="1 of the numbers above could not be matched with the calculation. Check it before using it."
          />
        </Paper>
      </Example>

      <Signature />
      <TapForProof />

      <Example caption="Long Hindi text that wraps over several lines. The line is 30 high here, the numbers stay left to right, and a number never breaks away from its unit.">
        <Paper>
          <AnswerText>
            {'इस साल की कुल बिक्री '}
            <CheckedNumber state="checked" prefix="₹" value="46.8" unit={HINDI.unit} />
            {' रही, जो पूरे '}
            <CheckedNumber state="checked" value="12" />
            {' महीनों में फैली है। दिसंबर सबसे अच्छा महीना रहा, जिसमें '}
            <CheckedNumber state="checked" prefix="₹" value="7.12" unit={HINDI.unit} />
            {' की बिक्री हुई, जो एक औसत महीने से '}
            <CheckedNumber state="unmatched" value="85%" />
            {' ज़्यादा है, और पिछले तीन महीनों में साल की '}
            <CheckedNumber state="pending" value="40%" />
            {' बिक्री हुई।'}
          </AnswerText>
        </Paper>
      </Example>

      <Example caption="A single digit still gets its line, and a number follows the size of the sentence it is in. In Hebrew the layout mirrors and every number keeps reading left to right: change the app language to see it.">
        <Paper>
          <AnswerText>
            {'Only '}
            <CheckedNumber state="unmatched" value="7" />
            {' of the '}
            <CheckedNumber state="checked" value="8" />
            {' columns hold numbers.'}
          </AnswerText>
          <Txt variant="small" tone="soft">
            {'In small text: '}
            <CheckedNumber state="checked" value="31" />
            {' of '}
            <CheckedNumber state="plain" value="31" />
            {' numbers.'}
          </Txt>
        </Paper>
      </Example>
    </Part>
  );
}

// --- ProofStamp --------------------------------------------------------------------

// A footer is seen under the words it speaks about: a line of an answer, then
// the footer with its rule.
function UnderAnswer({ words = ANSWER, children }: { words?: string; children: ReactNode }) {
  return (
    <Paper>
      <Txt tone="soft">{words}</Txt>
      {children}
    </Paper>
  );
}

function StampAgain() {
  const [run, setRun] = useState(0);
  return (
    <Example caption="Every number matched: the sun stamp lands once on the pop spring, the one bounce in the app, with one success tap in the hand, and its tick draws itself a moment later. With reduced motion it is there at full size with its tick drawn; the tap stays. It rests until the button is pressed, so this page does not tap the hand when it opens.">
      <UnderAnswer>
        {/* A new key puts a new footer on screen, so the stamp lands again. */}
        <ProofStamp key={run} still={run === 0} checked={4} total={4} />
      </UnderAnswer>
      <HStack gap="sm" wrap>
        <Button size="sm" variant="quiet" label="Land the stamp" onPress={() => setRun((now) => now + 1)} />
      </HStack>
    </Example>
  );
}

function ProofStamps() {
  const numbers = useNumbers();
  return (
    <Part
      title="ProofStamp"
      about="The line under words the app wrote, saying what the phone's check of their numbers found. The count is always there. The three results are told apart by shape: the stamp, a plain line with the warning sign, a filled warning note. Its own words come from UIStrings; the fuller first line for a check that did not fully match is passed in as note.">
      <StampAgain />

      <Example caption="still: an answer from earlier. The stamp is simply there, with no bounce, no tap and nothing read out. Every static sample on this page uses it. The counts here are written by the app (checkedText, totalText).">
        <UnderAnswer words="The report holds 31 numbers.">
          <ProofStamp still checked={31} total={31} checkedText={numbers.count(31)} totalText={numbers.count(31)} />
        </UnderAnswer>
      </Example>

      <Example caption="Some matched: the warning sign and the count in the warning colour. No stamp and no bounce. First with UIStrings alone, then with the first line a screen passes in.">
        <UnderAnswer>
          <ProofStamp still checked={3} total={4} />
        </UnderAnswer>
        <UnderAnswer>
          <ProofStamp
            still
            checked={3}
            total={4}
            note="1 of the numbers above could not be matched with the calculation. Check it before using it."
          />
        </UnderAnswer>
      </Example>

      <Example caption="None matched: the footer becomes a filled warning note, with no rule above it, so it differs from the one above by shape and not only by its digits.">
        <UnderAnswer>
          <ProofStamp still checked={0} total={4} />
        </UnderAnswer>
        <UnderAnswer>
          <ProofStamp
            still
            checked={0}
            total={4}
            note="None of the numbers above could be matched with the calculation. Check them before using them."
          />
        </UnderAnswer>
      </Example>

      <Example caption="Still checking (the loading state): the words say so, the count shows how far the check has come, and the place of the stamp is kept empty so nothing moves when it lands.">
        <UnderAnswer>
          <ProofStamp checked={2} total={4} checkingLabel="Checking each number" />
        </UnderAnswer>
      </Example>

      <Example caption="One number: the count line has its own form, passed in whole as countLabel. With no numbers at all (total 0) nothing is drawn: the second card ends with its sentence on purpose.">
        <UnderAnswer words="December is the highest at 712 K.">
          <ProofStamp still checked={1} total={1} countLabel="1 of 1 number checked on your phone" />
        </UnderAnswer>
        <UnderAnswer words="An answer with no numbers in it. Nothing follows this line.">
          <ProofStamp still checked={0} total={0} />
        </UnderAnswer>
      </Example>

      <Example caption="divider false: without the rule, for a place that parts the footer from the words above in its own way.">
        <Paper>
          <ProofStamp still divider={false} checked={4} total={4} />
        </Paper>
      </Example>

      <Example caption="Long Hindi words, given through UIStringsProvider as the app will give them. Every line wraps and the mark stays on the first line.">
        <UIStringsProvider strings={{ allChecked: HINDI.allChecked, checkedCount: HINDI.checkedCount }}>
          <UnderAnswer words={HINDI.answer}>
            <ProofStamp still checked={4} total={4} />
          </UnderAnswer>
          <UnderAnswer words={HINDI.answer}>
            <ProofStamp still checked={3} total={4} note={HINDI.note} />
          </UnderAnswer>
          <UnderAnswer words={HINDI.answer}>
            <ProofStamp still checked={0} total={4} note={HINDI.noneNote} />
          </UnderAnswer>
          <UnderAnswer words={HINDI.answer}>
            <ProofStamp checked={1} total={4} checkingLabel={HINDI.checking} />
          </UnderAnswer>
        </UIStringsProvider>
      </Example>
    </Part>
  );
}

// --- Appear ------------------------------------------------------------------------

function ArrivingRow({ icon, words }: { icon: IconName; words: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Icon name={icon} size={sizes.iconSmall} color={colors.inkSoft} />
      <Txt variant="label" weight="400" style={styles.grow}>
        {words}
      </Txt>
    </View>
  );
}

function Cascade() {
  const [run, setRun] = useState(0);
  return (
    <Example
      caption={`index: each row fades in and rises 12 on the settle spring, 50 ms after the row above. Rows cascade for at most ${cascadeMax} beats, so the last rows here arrive together. Once for each time they are put on screen, never on scroll. With reduced motion they fade in together, in place.`}>
      {/* A new key puts new rows on screen, so the cascade plays again. */}
      <VStack key={run} gap="sm">
        {ROWS.map((row, index) => (
          <Appear key={row.words} index={index}>
            <ArrivingRow icon={row.icon} words={row.words} />
          </Appear>
        ))}
      </VStack>
      <HStack gap="sm" wrap>
        <Button size="sm" variant="quiet" label="Arrive again" onPress={() => setRun((now) => now + 1)} />
      </HStack>
    </Example>
  );
}

function Waiting() {
  const [held, setHeld] = useState(true);
  const [run, setRun] = useState(0);
  return (
    <Example caption="wait: the rows are on screen but held back, unseen, untouchable and unread, until something else has gone (Home under the launch moment). They arrive when wait turns false. Long Hindi rows, to see that a row of any height rises the same 12.">
      <VStack key={run} gap="sm">
        {HINDI.rows.map((words, index) => (
          <Appear key={words} index={index} wait={held}>
            <ArrivingRow icon="info" words={words} />
          </Appear>
        ))}
      </VStack>
      <Pressed words={held ? 'The rows are held back.' : 'The rows have arrived.'} />
      <HStack gap="sm" wrap>
        <Button size="sm" variant="quiet" label="Let them arrive" disabled={!held} onPress={() => setHeld(false)} />
        <Button
          size="sm"
          variant="plain"
          label="Hold them back again"
          disabled={held}
          onPress={() => {
            setHeld(true);
            setRun((now) => now + 1);
          }}
        />
      </HStack>
    </Example>
  );
}

function Appears() {
  return (
    <Part
      title="Appear"
      about="The one entrance of a row, a tile or a card. Opacity and a short rise, on the UI thread; nothing bounces. It owns the opacity and the transform of its own view, and takes layout through style.">
      <Cascade />
      <Waiting />
      <Example caption="By itself, with no index: one card arrives. It plays when this page is first shown.">
        <Appear>
          <Paper>
            <Txt variant="label">One card</Txt>
            <Txt variant="small" tone="soft">
              Whatever is inside rises with it.
            </Txt>
          </Paper>
        </Appear>
      </Example>
    </Part>
  );
}

export type NumbersGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the numbers group:
//   <NumbersGallery />
// It needs AppStateProvider above it (its text reads the app language and its
// figures the number style) and sets no outer margin: the gallery page spaces
// it.
export function NumbersGallery({ style }: NumbersGalleryProps) {
  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Numbers
        </Txt>
        <Txt tone="soft">
          How a number is set, how it arrives, and how the app says that the phone has checked it. The yellow on this
          page is in its two places here: the band under a checked number and the stamp.
        </Txt>
      </VStack>
      <Numerals />
      <CheckedNumbers />
      <ProofStamps />
      <Appears />
    </VStack>
  );
}

const styles = StyleSheet.create({
  // A card: surface, a 1 line edge, radius 20, 16 inside, no shadow. Colour
  // is added at render because it changes with the theme.
  paper: {
    borderWidth: border.hairline,
    borderRadius: radius.card,
    padding: rhythm.cardPadding,
    gap: space.sm,
  },
  // Two tiles side by side share the row; each can be narrower than what it
  // holds, which is the point of them.
  half: { flex: 1, minWidth: 0 },
  // A filled surface, to show a figure in the ink of its fill.
  filled: { borderRadius: radius.card, padding: rhythm.cardPadding },
  // The room a sample number is given beside its note: two targets wide.
  sample: { minWidth: sizes.target * 2 },
  grow: { flex: 1 },
  // A row of a list, as on the brand board's cascade.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: sizes.target,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderWidth: border.hairline,
    borderRadius: radius.control,
  },
});
