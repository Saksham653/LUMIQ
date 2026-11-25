import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { border, radius, sizes, space, useTheme } from '@/theme';
import { Button, WorkingDots, type ButtonSize, type ButtonVariant } from '@/ui/button';
import { Chip, ChipGroup } from '@/ui/chip';
import { Fab } from '@/ui/fab';
import { IconButton, type IconButtonSize, type IconButtonVariant } from '@/ui/icon-button';
import type { IconName } from '@/ui/icon-set';
import { HStack, VStack } from '@/ui/stack';
import { Tag } from '@/ui/tag';
import { Txt } from '@/ui/text';

// The gallery's page for the actions group: Button, IconButton, Chip and
// ChipGroup, Tag, Fab, and the working mark they share. Every variant, size
// and state is here to be pressed.
//
// Developer-facing: the captions are plain English on purpose and the sample
// words are not in the app's translations. Nothing here ships in a screen.

// Not a motion value: how long a demo button pretends to work.
const PRETEND_WORK_MS = 1600;

const BUTTON_VARIANTS: readonly ButtonVariant[] = ['main', 'quiet', 'plain', 'danger'];
const BUTTON_WORDS: Record<ButtonVariant, string> = {
  main: 'Ask about this',
  quiet: 'Add a file',
  plain: 'See insights',
  danger: 'Delete file',
};
const BUTTON_SIZES: readonly ButtonSize[] = ['sm', 'md', 'lg'];
const BUTTON_HEIGHT: Record<ButtonSize, string> = { sm: 'sm, 44', md: 'md, 52', lg: 'lg, 56' };
const PLAIN_HEIGHT: Record<ButtonSize, string> = { sm: 'sm, 44', md: 'md, 48', lg: 'lg, 52' };

const ICON_VARIANTS: readonly IconButtonVariant[] = ['plain', 'quiet', 'main', 'danger'];
const ICON_FOR: Record<IconButtonVariant, IconName> = { plain: 'close', quiet: 'add', main: 'send', danger: 'delete' };
const NAME_FOR: Record<IconButtonVariant, string> = { plain: 'Close', quiet: 'Add', main: 'Send', danger: 'Delete' };
const ICON_SIZES: readonly IconButtonSize[] = ['sm', 'md', 'lg'];
// The four icons the brand lets point.
const POINTING: readonly IconName[] = ['back', 'chevron', 'send', 'undo'];

const COLUMNS: readonly { value: string; label: string; count?: number }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders', count: 12 },
  { value: 'discount', label: 'Discount' },
  { value: 'region', label: 'Region', count: 4 },
  { value: 'category', label: 'Category' },
  { value: 'month', label: 'Month', count: 12 },
];
const MONTHS: readonly string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Hindi samples. The long ones are the longest thing each control has to hold.
const HINDI = {
  ask: 'इसके बारे में पूछें',
  see: 'सारांश देखें',
  add: 'फ़ाइल जोड़ें (Excel या CSV)',
  remove: 'फ़ाइल हटाएँ',
  send: 'दिसंबर की पूरी बिक्री रिपोर्ट अपने साथी को भेजें',
  dates: '2 तारीखें टेक्स्ट के रूप में लिखी हैं',
  datesLong: 'इस कॉलम की 2 तारीखें टेक्स्ट के रूप में लिखी हैं, इसलिए इन्हें जोड़ा नहीं जा सका',
} as const;
const HINDI_COLUMNS: readonly { value: string; label: string }[] = [
  { value: 'revenue', label: 'राजस्व' },
  { value: 'orders', label: 'ऑर्डर' },
  { value: 'discount', label: 'छूट' },
  { value: 'average', label: 'औसत मासिक बिक्री' },
  { value: 'compare', label: 'पिछले साल की बिक्री से इस साल की बिक्री की तुलना' },
];

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

// How many presses reached onPress: proof that a press acts on release, and
// that a disabled or busy control does not act at all.
function Presses({ count }: { count: number }) {
  return (
    <Txt variant="small" tone="faint" aria-live="polite">
      {`Presses that reached onPress: ${count}`}
    </Txt>
  );
}

function Buttons() {
  const [presses, setPresses] = useState(0);
  const [working, work] = useWork();
  const count = () => setPresses((now) => now + 1);
  const countAndWork = () => {
    count();
    work();
  };

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Button</Heading>
        <Txt tone="soft">
          Hold one down, then let go: it answers at contact and acts on release. Slide off before letting go and
          nothing happens. Only main taps in the hand.
        </Txt>
        <Presses count={presses} />
      </VStack>

      <Example caption="Variants: main, quiet, plain, danger. A screen has one main button.">
        <HStack gap="sm" wrap>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} label={BUTTON_WORDS[variant]} onPress={count} />
          ))}
        </HStack>
      </Example>

      <Example caption="Sizes. sm is drawn 44 high and still takes a 48 touch.">
        <HStack gap="sm" wrap>
          {BUTTON_SIZES.map((size) => (
            <Button key={size} size={size} label={BUTTON_HEIGHT[size]} onPress={count} />
          ))}
        </HStack>
        <HStack gap="sm" wrap>
          {BUTTON_SIZES.map((size) => (
            <Button key={size} size={size} variant="quiet" label={BUTTON_HEIGHT[size]} onPress={count} />
          ))}
        </HStack>
      </Example>

      <Example caption="The plain button is one step lower: 44, 48, 52. Here beside a main button, as in the hero.">
        <HStack gap="sm" wrap>
          {BUTTON_SIZES.map((size) => (
            <Button key={size} size={size} variant="plain" label={PLAIN_HEIGHT[size]} onPress={count} />
          ))}
        </HStack>
        <HStack gap="xs" wrap>
          <Button label="Ask about this" onPress={count} />
          <Button variant="plain" label="See insights" onPress={count} />
        </HStack>
      </Example>

      <Example caption="With an icon, at the start or at the end. The chevron and the send arrow mirror in Hebrew.">
        <HStack gap="sm" wrap>
          <Button variant="quiet" icon="add" label="Add a file" onPress={count} />
          <Button variant="plain" icon="chevron" iconPosition="end" label="See insights" onPress={count} />
          <Button icon="send" iconPosition="end" label="Send" onPress={count} />
          <Button variant="danger" icon="delete" label="Delete file" onPress={count} />
        </HStack>
      </Example>

      <Example caption="Disabled: plain paper and faint ink, never a faded blue. Pressing does nothing.">
        <HStack gap="sm" wrap>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} disabled variant={variant} label={BUTTON_WORDS[variant]} onPress={count} />
          ))}
          <Button disabled variant="quiet" icon="add" label="Add a file" onPress={count} />
        </HStack>
      </Example>

      <Example caption="Busy: the working mark stands in for the words. Each is exactly as wide as its twin in the first row, and a screen reader hears busy.">
        <HStack gap="sm" wrap>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} busy variant={variant} label={BUTTON_WORDS[variant]} onPress={count} />
          ))}
        </HStack>
      </Example>

      <Example caption="Busy, live. Press one: all three work for a moment and cannot be pressed again until they are done.">
        <HStack gap="sm" wrap>
          <Button busy={working} label="Save changes" onPress={countAndWork} />
          <Button busy={working} variant="quiet" icon="share" label="Share report" onPress={countAndWork} />
          <Button busy={working} size="sm" variant="plain" label="Try again" onPress={countAndWork} />
        </HStack>
      </Example>

      <Example caption="Full width. Words alone are centred across the button; beside an icon they stay next to it.">
        <Button fullWidth size="lg" label="Ask about this" onPress={count} />
        <Button fullWidth variant="quiet" icon="add" label="Add a file (Excel or CSV)" onPress={count} />
        <Button fullWidth busy={working} variant="quiet" label="Open the sample file" onPress={countAndWork} />
      </Example>

      <Example caption="Words as children in place of label.">
        <HStack gap="sm" wrap>
          <Button variant="quiet" onPress={count}>
            Words as children
          </Button>
        </HStack>
      </Example>

      <Example caption="Hindi. Taller lines, nothing spaced out, nothing cut.">
        <HStack gap="sm" wrap>
          <Button label={HINDI.ask} onPress={count} />
          <Button variant="plain" label={HINDI.see} onPress={count} />
          <Button variant="quiet" icon="add" label={HINDI.add} onPress={count} />
          <Button variant="danger" icon="delete" label={HINDI.remove} onPress={count} />
          <Button disabled label={HINDI.ask} onPress={count} />
          <Button busy label={HINDI.ask} onPress={count} />
        </HStack>
      </Example>

      <Example caption="Long Hindi. The words wrap onto a second line before the button outgrows the screen: centred when full width, beside the icon otherwise.">
        <Button fullWidth label={HINDI.send} onPress={count} />
        <Button fullWidth variant="quiet" icon="share" label={HINDI.send} onPress={count} />
        <HStack gap="sm" wrap>
          <Button variant="quiet" label={HINDI.send} onPress={count} />
        </HStack>
        <Button fullWidth busy label={HINDI.send} onPress={count} />
      </Example>
    </VStack>
  );
}

function IconButtons() {
  const [presses, setPresses] = useState(0);
  const [working, work] = useWork();
  const count = () => setPresses((now) => now + 1);
  const countAndWork = () => {
    count();
    work();
  };

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>IconButton</Heading>
        <Txt tone="soft">
          Only an icon, so its type does not let it be made without a spoken name. Round, and never a smaller touch
          than 48 by 48. The ones with a fill shrink under the finger; the plain one has nothing to shrink, so a
          round tint fades in under it instead.
        </Txt>
        <Presses count={presses} />
      </VStack>

      <Example caption="Variants at md, 48: plain, quiet, main, danger.">
        <HStack gap="sm" wrap>
          {ICON_VARIANTS.map((variant) => (
            <IconButton
              key={variant}
              variant={variant}
              icon={ICON_FOR[variant]}
              accessibilityLabel={NAME_FOR[variant]}
              onPress={count}
            />
          ))}
        </HStack>
      </Example>

      <Example caption="Sizes: sm 44 with a 20 icon (still a 48 touch), md 48, lg 52 to sit beside a field.">
        {ICON_VARIANTS.map((variant) => (
          <HStack key={variant} gap="sm" wrap>
            {ICON_SIZES.map((size) => (
              <IconButton
                key={size}
                size={size}
                variant={variant}
                icon={ICON_FOR[variant]}
                accessibilityLabel={NAME_FOR[variant]}
                onPress={count}
              />
            ))}
          </HStack>
        ))}
      </Example>

      <Example caption="Disabled: faint ink, on plain paper where there is a fill. Pressing does nothing.">
        <HStack gap="sm" wrap>
          {ICON_VARIANTS.map((variant) => (
            <IconButton
              key={variant}
              disabled
              variant={variant}
              icon={ICON_FOR[variant]}
              accessibilityLabel={NAME_FOR[variant]}
              onPress={count}
            />
          ))}
        </HStack>
      </Example>

      <Example caption="Busy: the working mark takes the icon's place and the button keeps its size.">
        <HStack gap="sm" wrap>
          {ICON_VARIANTS.map((variant) => (
            <IconButton
              key={variant}
              busy
              variant={variant}
              icon={ICON_FOR[variant]}
              accessibilityLabel={NAME_FOR[variant]}
              onPress={count}
            />
          ))}
        </HStack>
      </Example>

      <Example caption="Busy, live. Press send: it works for a moment.">
        <HStack gap="sm" wrap>
          <IconButton
            busy={working}
            variant="main"
            size="lg"
            icon="send"
            accessibilityLabel="Send"
            onPress={countAndWork}
          />
          <IconButton busy={working} variant="quiet" icon="retry" accessibilityLabel="Try again" onPress={countAndWork} />
        </HStack>
      </Example>

      <Example caption="Icons that point mirror by themselves in right-to-left languages: back, chevron, send, undo.">
        <HStack gap="sm" wrap>
          {POINTING.map((icon) => (
            <IconButton key={icon} icon={icon} accessibilityLabel={icon} onPress={count} />
          ))}
        </HStack>
      </Example>
    </VStack>
  );
}

function Chips() {
  const [column, setColumn] = useState<string | null>('revenue');
  const [months, setMonths] = useState<string[]>(['Jan', 'Dec']);
  const [hindiColumn, setHindiColumn] = useState<string | null>('revenue');
  const [hindiPicked, setHindiPicked] = useState<string[]>(['compare']);
  const [thisYear, setThisYear] = useState(true);
  const [withCount, setWithCount] = useState(false);
  const [asked, setAsked] = useState(0);

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Chip and ChipGroup</Heading>
        <Txt tone="soft">
          Chosen is filled with the action blue; not chosen is paper with a faint-ink edge. A choice that changes
          gives one selection tap in the hand; pressing the chosen one again gives none.
        </Txt>
      </VStack>

      <Example caption={`One choice, scrolling sideways, with counts. Chosen: ${column ?? 'nothing'}.`}>
        <ChipGroup value={column} onChange={(next) => setColumn(next)} accessibilityLabel="Column to show">
          {COLUMNS.map((one) => (
            <Chip key={one.value} value={one.value} label={one.label} count={one.count} />
          ))}
          <Chip value="returns" label="Returns" disabled />
        </ChipGroup>
      </Example>

      <Example caption={`Several choices, wrapping onto more lines. Chosen: ${months.length === 0 ? 'nothing' : months.join(', ')}.`}>
        <ChipGroup multiple wrap value={months} onChange={(next) => setMonths(next)} accessibilityLabel="Months">
          {MONTHS.map((month) => (
            <Chip key={month} value={month} label={month} />
          ))}
        </ChipGroup>
      </Example>

      <Example caption={`By itself: a switch (selected and onPress), one with a count, and a chip that only does something (no selected, so no chosen state). Asked ${asked} times.`}>
        <HStack gap="sm" wrap>
          <Chip selected={thisYear} label="This year" onPress={() => setThisYear((now) => !now)} />
          <Chip selected={withCount} label="Rows" count={128} onPress={() => setWithCount((now) => !now)} />
          <Chip label="What was my best month?" onPress={() => setAsked((now) => now + 1)} />
        </HStack>
      </Example>

      <Example caption="Disabled: not chosen, chosen (it keeps a ring, so chosen is still told by form), and a whole group.">
        <HStack gap="sm" wrap>
          <Chip disabled selected={false} label="Not chosen" />
          <Chip disabled selected label="Chosen" />
          <Chip disabled selected label="Chosen" count={12} />
        </HStack>
        <ChipGroup disabled value="orders" onChange={() => {}} accessibilityLabel="Column to show, switched off">
          <Chip value="revenue" label="Revenue" />
          <Chip value="orders" label="Orders" />
          <Chip value="discount" label="Discount" />
        </ChipGroup>
      </Example>

      <Example caption="Full width of the screen with inset: the first chip keeps its place and the others scroll out under the edge. (The gallery page pads this section, so here the inset shows as extra room.)">
        <ChipGroup inset="lg" value={column} onChange={(next) => setColumn(next)} accessibilityLabel="Column to show">
          {COLUMNS.map((one) => (
            <Chip key={one.value} value={one.value} label={one.label} />
          ))}
        </ChipGroup>
      </Example>

      <Example caption={`Hindi, scrolling. The last chip is long. Chosen: ${hindiColumn ?? 'nothing'}.`}>
        <ChipGroup value={hindiColumn} onChange={(next) => setHindiColumn(next)} accessibilityLabel="Column to show">
          {HINDI_COLUMNS.map((one) => (
            <Chip key={one.value} value={one.value} label={one.label} />
          ))}
        </ChipGroup>
      </Example>

      <Example caption="Hindi, wrapping. A chip longer than the screen wraps its words and never runs off the edge.">
        <ChipGroup multiple wrap value={hindiPicked} onChange={(next) => setHindiPicked(next)} accessibilityLabel="Columns">
          {HINDI_COLUMNS.map((one) => (
            <Chip key={one.value} value={one.value} label={one.label} count={one.value === 'orders' ? 12 : undefined} />
          ))}
        </ChipGroup>
      </Example>
    </VStack>
  );
}

function Tags() {
  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Tag</Heading>
        <Txt tone="soft">
          A small label that says how something stands. Always an icon and words, never colour alone. It cannot be
          pressed.
        </Txt>
      </VStack>

      <Example caption="Tones: neutral, action, good, warn, bad, each with its own icon.">
        <HStack gap="sm" wrap>
          <Tag label="12 rows" />
          <Tag tone="action" label="New" />
          <Tag tone="good" label="Checked" />
          <Tag tone="warn" label="Could not check" />
          <Tag tone="bad" label="Failed" />
        </HStack>
      </Example>

      <Example caption="With an icon of its own, and words as children.">
        <HStack gap="sm" wrap>
          <Tag icon="file" label="Excel" />
          <Tag tone="action" icon="calendar" label="December" />
          <Tag tone="good" icon="file-check">
            No empty cells in 8 columns
          </Tag>
        </HStack>
      </Example>

      <Example caption="Error: the error icon and words that say what happened.">
        <HStack gap="sm" wrap>
          <Tag tone="bad" label="This file could not be opened" />
          <Tag tone="warn" label="2 dates are written as text" />
        </HStack>
      </Example>

      <Example caption="In a column that stretches its children a tag still keeps to its words.">
        <VStack gap="sm">
          <Tag tone="good" label="Checked" />
          <Tag label="12 rows" />
        </VStack>
      </Example>

      <Example caption="Hindi, short and long. Long words wrap inside the tag.">
        <VStack gap="sm">
          <Tag tone="warn" label={HINDI.dates} />
          <Tag tone="bad" label={HINDI.datesLong} />
        </VStack>
      </Example>
    </VStack>
  );
}

function Fabs() {
  const { colors } = useTheme();
  const [presses, setPresses] = useState(0);
  const [working, work] = useWork();
  const count = () => setPresses((now) => now + 1);

  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>Fab</Heading>
        <Txt tone="soft">
          The floating button of a screen: an icon and its words. A 1 line edge everywhere, and one soft shadow on
          iOS and the web. Android gets the edge alone.
        </Txt>
        <Presses count={presses} />
      </VStack>

      <Example caption="Main, floating over a screen. The screen places it: bottom and end, so it sits on the left in Hebrew.">
        <View style={[styles.stage, { backgroundColor: colors.ground, borderColor: colors.line }]}>
          <VStack gap="xs">
            <Txt variant="label">shop-stock-march.csv</Txt>
            <Txt variant="small" tone="soft">
              240 rows · 6 columns
            </Txt>
            <Txt variant="label">school-fees-2025.xlsx</Txt>
            <Txt variant="small" tone="soft">
              86 rows · 5 columns
            </Txt>
          </VStack>
          <View style={styles.corner}>
            <Fab label="Add a file" onPress={count} />
          </View>
        </View>
      </Example>

      <Example caption="Quiet, for a screen that already has a main button. Then disabled, and busy.">
        <HStack gap="md" wrap>
          <Fab variant="quiet" label="Add a file" onPress={count} />
          <Fab disabled label="Add a file" onPress={count} />
          <Fab busy label="Add a file" onPress={count} />
        </HStack>
      </Example>

      <Example caption="Busy, live, and another icon.">
        <HStack gap="md" wrap>
          <Fab
            busy={working}
            icon="share"
            label="Share report"
            onPress={() => {
              count();
              work();
            }}
          />
        </HStack>
      </Example>

      <Example caption="Hindi.">
        <HStack gap="md" wrap>
          <Fab label={HINDI.add} onPress={count} />
          <Fab variant="quiet" label={HINDI.send} onPress={count} />
        </HStack>
      </Example>
    </VStack>
  );
}

function WorkingMark() {
  const { colors } = useTheme();
  return (
    <VStack gap="lg">
      <VStack gap="xs">
        <Heading>The working mark</Heading>
        <Txt tone="soft">
          What a busy control shows. Three dots come forward one after another; only their strength changes, nothing
          moves. When the phone asks for less motion they stand still.
        </Txt>
      </VStack>
      <Example caption="By itself, in ink, in the blue as text and in the failure red.">
        <HStack gap="xl" wrap>
          <WorkingDots color={colors.ink} />
          <WorkingDots color={colors.actionText} />
          <WorkingDots color={colors.bad} />
        </HStack>
      </Example>
    </VStack>
  );
}

export type ActionsGalleryProps = {
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// The gallery section of the actions group:
//   <ActionsGallery />
// It needs AppStateProvider above it (its text reads the app language) and
// sets no outer margin: the gallery page spaces it.
export function ActionsGallery({ style }: ActionsGalleryProps) {
  return (
    <VStack gap="xxxl" style={style}>
      <VStack gap="sm">
        <Txt variant="title" accessibilityRole="header">
          Actions
        </Txt>
        <Txt tone="soft">
          Everything that is pressed to do something or to choose something, and the small label that says how a
          thing stands. All of it is built on the one press: feedback at contact, the action on release.
        </Txt>
      </VStack>
      <Buttons />
      <IconButtons />
      <Chips />
      <Tags />
      <Fabs />
      <WorkingMark />
    </VStack>
  );
}

const styles = StyleSheet.create({
  // A piece of a screen for the floating button to float over. Tall enough
  // for two rows of a list and the button under them.
  stage: {
    minHeight: sizes.row * 4,
    padding: space.lg,
    borderWidth: border.hairline,
    borderRadius: radius.card,
  },
  // Where a screen puts its floating button: the end side, at the bottom.
  corner: { position: 'absolute', insetInlineEnd: space.lg, bottom: space.lg },
});
