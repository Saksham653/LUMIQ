import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { LANGUAGES } from '@/i18n';
import { border, radius, sizes, space, useTheme } from '@/theme';
import { Card } from '@/ui/card';
import { Divider } from '@/ui/divider';
import { Icon } from '@/ui/icon';
import { List, ListRow } from '@/ui/list';
import { Press } from '@/ui/press';
import { Section } from '@/ui/section';
import { HStack, VStack } from '@/ui/stack';
import { Tag } from '@/ui/tag';
import { Txt } from '@/ui/text';

// The gallery of the "surfaces" group: Card, List and ListRow, Divider and
// Section, each in every variant, size and state, with a caption that says
// what to look at. Everything that looks pressable here can be pressed: the
// line at the top of a block says what was pressed last.
//
// It is one column with no padding and no scrolling of its own. The gallery
// screen gives it both, inside AppStateProvider (Txt needs the app language).
// Captions are for developers and are written in English. The Hindi samples
// are strings the app already has.

// --- Sample words --------------------------------------------------------------

const HI = {
  myFiles: 'मेरी फ़ाइलें',
  seeAll: 'सभी फ़ाइलें देखें',
  fileName: 'दुकान का हिसाब.csv',
  fileMeta: '240 पंक्तियाँ · 6 कॉलम · 3 दिसंबर को जोड़ी',
  openNow: 'अभी खुली है',
  whatIf: 'अगर ऐसा हो तो...?',
  whatIfHelp: 'कोई बदलाव आज़माएं और नतीजा देखें',
  numbers: 'संख्याएँ और मुद्रा',
  lakhCrore: 'लाख और करोड़',
  remove: 'हटाएं',
  removeHelp: 'यह इस फ़ोन पर LUMIQ से हट जाएगी। आपकी असली फ़ाइल पर कोई असर नहीं होगा।',
  bestMonth: 'दिसंबर आपका सबसे अच्छा महीना रहा',
  openFile: 'अपनी Excel या CSV फ़ाइल खोलें और आसान शब्दों में जवाब पाएं।',
  languageNote: 'LUMIQ की स्क्रीन और जवाब इसी भाषा में होंगे।',
} as const;

const LONG_FILE_NAME = 'quarterly-sales-and-returns-north-region-final-version-3.xlsx';

// --- The frame of the gallery ----------------------------------------------------

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack gap="lg">
      <Txt variant="title" accessibilityRole="header">
        {title}
      </Txt>
      {children}
    </VStack>
  );
}

function Example({ caption, children }: { caption: string; children?: ReactNode }) {
  return (
    <VStack gap="sm">
      <Txt variant="small" tone="soft">
        {caption}
      </Txt>
      {children}
    </VStack>
  );
}

// --- Stand-ins -------------------------------------------------------------------

// The slots of a row and the action of a section take parts that other groups
// build. The tag is the real Tag, used the way the contract writes it
// (<Tag>{words}</Tag>): it carries an icon, and its real width is what decides
// whether it fits beside a title. The others (a text Button and IconButton
// from actions, Switch and the radio mark from choice) are stand-ins with the
// real sizes and no more, so this file does not lean on props that may still
// move. A screen passes the real ones.

// Drawn only: the row round it is the switch (role, state and press), so there
// is one target and one thing to read.
function SwitchStandIn({ on }: { on: boolean }) {
  const { colors } = useTheme();
  const track = on
    ? { backgroundColor: colors.action, borderColor: colors.action }
    : { backgroundColor: colors.surface, borderColor: colors.inkFaint };
  return (
    <View aria-hidden style={[styles.track, on ? styles.trackOn : null, track]}>
      <View style={[styles.knob, { backgroundColor: on ? colors.onAction : colors.inkSoft }]} />
    </View>
  );
}

// Drawn only, like the switch: the row round it is the radio.
function RadioStandIn({ on }: { on: boolean }) {
  const { colors } = useTheme();
  const ring = on
    ? { backgroundColor: colors.action, borderColor: colors.action }
    : { backgroundColor: colors.surface, borderColor: colors.inkFaint };
  return (
    <View aria-hidden style={[styles.radio, ring]}>
      {on ? <View style={[styles.radioDot, { backgroundColor: colors.onAction }]} /> : null}
    </View>
  );
}

function TextActionStandIn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={styles.textAction}>
      <Txt variant="label" tone="action" snug>
        {label}
      </Txt>
    </Press>
  );
}

function MoreStandIn({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Press weight="sm" accessibilityLabel={label} onPress={onPress} style={styles.more}>
      <Icon name="more" color={colors.inkSoft} />
    </Press>
  );
}

// --- The gallery -----------------------------------------------------------------

export function SurfacesGallery() {
  const { colors } = useTheme();
  const [last, setLast] = useState('nothing yet');
  const [presses, setPresses] = useState(0);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [opening, setOpening] = useState(true);
  const [chosen, setChosen] = useState<string>('en');

  // The action fires on release: the line below changes when the finger lifts.
  const pressed = (what: string) => () => {
    setLast(what);
    setPresses((count) => count + 1);
  };

  // Shown at the top of each block that has things to press. Only the first
  // one is announced, so a screen reader hears a press once.
  const said = `Last press: ${last}. Presses so far: ${presses}.`;
  const readout = (
    <Card variant="sunk" size="sm">
      <Txt variant="small" tone="soft">
        {said}
      </Txt>
    </Card>
  );

  return (
    <VStack gap="xxxl">
      <Block title="Card">
        <Card variant="sunk" size="sm" aria-live="polite">
          <Txt variant="small" tone="soft">
            {said}
          </Txt>
        </Card>

        <Example caption="variant raised (the default). The lighter paper with a 1 line edge, radius 20, 16 inside. Raised by its paper, never by a shadow.">
          <Card>
            <VStack gap="xs">
              <Txt variant="heading">December was your best month</Txt>
              <Txt tone="soft">Open your Excel or CSV file and get answers in plain words.</Txt>
            </VStack>
          </Card>
        </Example>

        <Example caption="variant flat. No paper of its own, only the edge: level with what is behind it.">
          <Card variant="flat">
            <VStack gap="xs">
              <Txt variant="heading">Add the next file</Txt>
              <Txt tone="soft">A quiet group on the ground, or a card inside a card.</Txt>
            </VStack>
          </Card>
        </Example>

        <Example caption="variant sunk. A well inside a card: sunk paper, no edge, radius 14. Shown with size sm.">
          <Card>
            <VStack gap="md">
              <Txt variant="heading">Grocery has the most Revenue</Txt>
              <Card variant="sunk" size="sm">
                <Txt variant="label">How this was worked out</Txt>
                <Txt variant="small" tone="soft">
                  Sum of Revenue for each Category.
                </Txt>
              </Card>
            </VStack>
          </Card>
        </Example>

        <Example caption="size sm, md (the default) and lg: 12, 16 and 24 inside.">
          <VStack gap="md">
            <Card size="sm">
              <Txt>size sm</Txt>
            </Card>
            <Card size="md">
              <Txt>size md</Txt>
            </Card>
            <Card size="lg">
              <Txt>size lg</Txt>
            </Card>
          </VStack>
        </Example>

        <Example caption="flush. No padding: two cells that bring their own, with a vertical Divider between them.">
          <Card flush>
            <HStack align="stretch">
              <VStack p="lg" style={styles.fill}>
                <Txt variant="small" tone="soft">
                  Rows
                </Txt>
                <Txt variant="heading">240</Txt>
              </VStack>
              <Divider orientation="vertical" />
              <VStack p="lg" style={styles.fill}>
                <Txt variant="small" tone="soft">
                  Columns
                </Txt>
                <Txt variant="heading">6</Txt>
              </VStack>
            </HStack>
          </Card>
        </Example>

        <Example caption="onPress. Built on Press, weight lg. Hold it: it shrinks a little and its paper turns to the pressed paper; let go and it springs back and the action fires. Slide off before letting go and nothing happens. With reduced motion nothing shrinks and only the paper changes. This one also has haptic tap.">
          <Card onPress={pressed('the raised card')} haptic="tap">
            <HStack gap="md">
              <Icon name="story" />
              <VStack style={styles.fill}>
                <Txt variant="label">Play the story</Txt>
                <Txt variant="small" tone="soft">
                  7 cards
                </Txt>
              </VStack>
              <Icon name="chevron" size={sizes.iconSmall} color={colors.inkFaint} />
            </HStack>
          </Card>
        </Example>

        <Example caption="onPress on flat and on sunk: the same pressed paper on both. The second also takes onLongPress: hold it.">
          <VStack gap="md">
            <Card variant="flat" onPress={pressed('the flat card')}>
              <Txt variant="label">A flat card you can press</Txt>
            </Card>
            <Card variant="sunk" onPress={pressed('the sunk card')} onLongPress={pressed('the sunk card, held')}>
              <Txt variant="label">Press, or press and hold</Txt>
            </Card>
          </VStack>
        </Example>

        <Example caption="disabled. Plain paper (disabledFill), no movement, and a screen reader is told. The caller writes the title in disabledInk and keeps the reason readable.">
          <Card onPress={pressed('a disabled card (this must never show)')} disabled>
            <Txt variant="label" color={colors.disabledInk}>
              Share the report
            </Txt>
            <Txt variant="small" tone="soft">
              Open a file first.
            </Txt>
          </Card>
        </Example>

        <Example caption="Long Hindi text. The card grows with its words and with the text size of the phone. Nothing is cut and the lines are taller.">
          <Card onPress={pressed('the Hindi card')}>
            <VStack gap="xs">
              <Txt variant="heading">{HI.bestMonth}</Txt>
              <Txt tone="soft">{HI.openFile}</Txt>
              <Txt tone="soft">{HI.languageNote}</Txt>
            </VStack>
          </Card>
        </Example>
      </Block>

      <Block title="List and ListRow">
        {readout}

        <Example caption="A list (variant raised): rows 4 inside a card, each at least 56 high, the icon in a 40 sunk tile, a hairline between rows that starts under the titles. Press a row: the pressed paper fades in under it with a 14 corner, and nothing shrinks.">
          <List>
            <ListRow
              icon="what-if"
              title="What if...?"
              subtitle="Try a change and see the result"
              chevron
              onPress={pressed('What if')}
            />
            <ListRow
              icon="file-check"
              title="File check"
              subtitle="Is your file clean and ready?"
              chevron
              onPress={pressed('File check')}
            />
            <ListRow
              icon="report"
              title="Report"
              subtitle="A one-page summary you can share"
              chevron
              onPress={pressed('Report')}
            />
          </List>
        </Example>

        <Example caption="The trailing slot: a value (a string), a value with a chevron, a tag (the title and subtitle keep 55 percent of the row, so on a narrow phone a wide tag moves under them), a switch (the row itself is the switch: role switch, aria-checked, haptic select), and a small button of its own (also offered to a screen reader as an action of the row).">
          <List>
            <ListRow icon="calendar" title="Added" trailing="3 Dec 2026" onPress={pressed('Added')} />
            <ListRow icon="language" title="Language" trailing="English" chevron onPress={pressed('Language')} />
            <ListRow
              icon="file"
              title="shop-stock-march.csv"
              subtitle="240 rows · 6 columns"
              trailing={<Tag>Open now</Tag>}
              chevron
              onPress={pressed('shop-stock-march.csv')}
            />
            <ListRow
              icon="settings"
              title="Haptics"
              subtitle={hapticsOn ? 'On' : 'Off'}
              trailing={<SwitchStandIn on={hapticsOn} />}
              role="switch"
              aria-checked={hapticsOn}
              haptic="select"
              onPress={() => {
                setHapticsOn((on) => !on);
                pressed('the switch row')();
              }}
            />
            <ListRow
              icon="file"
              title="school-fees-2025.xlsx"
              subtitle="86 rows · 5 columns"
              trailing={<MoreStandIn label="More for school-fees-2025.xlsx" onPress={pressed('the small button')} />}
              onPress={pressed('school-fees-2025.xlsx')}
              accessibilityActions={[{ name: 'more', label: 'More' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'more') pressed('the small button, from the row actions')();
              }}
            />
          </List>
        </Example>

        <Example caption="Rows without onPress are plain words: no press feedback, read in one go by a screen reader. Unknown is a dash, never zero.">
          <List>
            <ListRow title="Rows" trailing="240" />
            <ListRow title="Columns" trailing="6" />
            <ListRow title="Currency" trailing="—" accessibilityLabel="Currency, not known" />
          </List>
        </Example>

        <Example caption="size sm: at least 48 high, a bare 20 icon. For short lists of actions. The last row is variant destructive: its title and icon are written in bad.">
          <List>
            <ListRow size="sm" icon="share" title="Share" onPress={pressed('Share')} />
            <ListRow size="sm" icon="copy" title="Copy" onPress={pressed('Copy')} />
            <ListRow size="sm" icon="delete" title="Remove" variant="destructive" onPress={pressed('Remove')} />
          </List>
        </Example>

        <Example caption="variant destructive at size md.">
          <List>
            <ListRow
              icon="delete"
              title="Erase everything"
              subtitle="This cannot be undone."
              variant="destructive"
              onPress={pressed('Erase everything')}
            />
          </List>
        </Example>

        <Example caption="disabled: faint ink on the same paper, no feedback, and a screen reader is told. The subtitle stays readable: it says why.">
          <List>
            <ListRow
              icon="report"
              title="Report"
              subtitle="Open a file first."
              chevron
              disabled
              onPress={pressed('a disabled row (this must never show)')}
            />
            <ListRow
              icon="language"
              title="Language"
              trailing="English"
              chevron
              disabled
              onPress={pressed('a disabled row (this must never show)')}
            />
          </List>
        </Example>

        <Example caption="busy: the working mark takes the place of the chevron, so the row keeps its size. It cannot be pressed again and a screen reader hears the loading word. With reduced motion nothing loops: the chevron stays and that word is written in the row. The second row turns it on and off.">
          <List>
            <ListRow
              icon="file"
              title="shop-stock-march.csv"
              subtitle="240 rows · 6 columns"
              chevron
              busy={opening}
              onPress={pressed('the row that was busy')}
            />
            <ListRow
              icon="retry"
              title={opening ? 'Stop the work' : 'Start the work'}
              onPress={() => setOpening((now) => !now)}
            />
          </List>
        </Example>

        <Example caption="status bad (an error), warn and good: the subtitle becomes a status line with its icon, never colour alone. The error says what happened and what to do next.">
          <List>
            <ListRow
              icon="file"
              title="march-sales.xlsx"
              subtitle="This file could not be opened. Tap to try again."
              status="bad"
              onPress={pressed('Try again')}
            />
            <ListRow
              icon="numbers"
              title="Discount"
              subtitle="2 numbers could not be checked. Look at them before you use them."
              status="warn"
              chevron
              onPress={pressed('Discount')}
            />
            <ListRow icon="column" title="Category" subtitle="No empty cells." status="good" />
          </List>
        </Example>

        <Example caption="subtitleIcon: a small icon before the subtitle, in the subtitle's own soft ink. For a line of proof (check) and for a row that points to checked words and gives their count (checked-stamp, its one use). Never yellow, never without the words.">
          <List>
            <ListRow
              icon="story"
              title="Story"
              subtitle="7 cards, 31 of 31 numbers checked"
              subtitleIcon="checked-stamp"
              chevron
              onPress={pressed('Story')}
            />
            <ListRow
              icon="file-check"
              title="File check"
              subtitle="Checked on your phone, 319 of 319 rows"
              subtitleIcon="check"
              chevron
              onPress={pressed('File check')}
            />
            <ListRow
              icon="numbers"
              title="A long line of proof"
              subtitle="It wraps beside its icon, and the icon stays level with the first line of the words at every text size."
              subtitleIcon="check"
            />
          </List>
        </Example>

        <Example caption="Long Hindi text. Titles and subtitles wrap, rows grow, and a value or a tag moves under the title when the two no longer fit side by side (always check at the largest text size).">
          <List>
            <ListRow
              icon="file"
              title={HI.fileName}
              subtitle={HI.fileMeta}
              trailing={<Tag>{HI.openNow}</Tag>}
              chevron
              onPress={pressed(HI.fileName)}
            />
            <ListRow
              icon="what-if"
              title={HI.whatIf}
              subtitle={HI.whatIfHelp}
              chevron
              onPress={pressed(HI.whatIf)}
            />
            <ListRow
              icon="numbers"
              title={HI.numbers}
              trailing={HI.lakhCrore}
              chevron
              onPress={pressed(HI.numbers)}
            />
            <ListRow
              icon="delete"
              title={HI.remove}
              subtitle={HI.removeHelp}
              variant="destructive"
              onPress={pressed(HI.remove)}
            />
          </List>
        </Example>

        <Example caption="titleLines 1 is for a file name, the one thing that is ever cut: it stays on one line and loses its middle, so its ending and its extension stay (the browser preview can only cut the end). Without it the same name wraps and the row grows.">
          <List>
            <ListRow
              icon="file"
              title={LONG_FILE_NAME}
              subtitle="1,204 rows · 14 columns"
              titleLines={1}
              chevron
              onPress={pressed('the cut file name')}
            />
            <ListRow
              icon="file"
              title={LONG_FILE_NAME}
              subtitle="1,204 rows · 14 columns"
              chevron
              onPress={pressed('the wrapped file name')}
            />
          </List>
        </Example>

        <Example caption="Other scripts, and the leading slot holding something other than an icon: a one-choice list. Each row is a radio (role radio, aria-checked, haptic select) with a drawn mark in front and a tag at the end. Hebrew, Japanese and Chinese get the taller line.">
          <List role="radiogroup" accessibilityLabel="Language">
            {LANGUAGES.map((language) => (
              <ListRow
                key={language.code}
                leading={<RadioStandIn on={language.code === chosen} />}
                title={language.native}
                subtitle={language.english}
                trailing={language.beta ? <Tag>Beta</Tag> : undefined}
                role="radio"
                aria-checked={language.code === chosen}
                haptic="select"
                onPress={() => {
                  setChosen(language.code);
                  pressed(language.english)();
                }}
              />
            ))}
          </List>
        </Example>

        <Example caption="children: more content under the title and subtitle. No leading and no icon: the hairline starts at the edge of the row.">
          <List>
            <ListRow title="shop-sales-november.csv" subtitle="Reading the rows">
              <Txt variant="small" tone="faint">
                1,204 of 3,010 rows
              </Txt>
            </ListRow>
            <ListRow title="shop-sales-october.csv" subtitle="Waiting" />
          </List>
        </Example>

        <Example caption="variant flat: only the edge. For a list on a sheet or inside a card.">
          <List variant="flat">
            <ListRow icon="search" title="Search" chevron onPress={pressed('Search')} />
            <ListRow icon="filter" title="Filter" chevron onPress={pressed('Filter')} />
          </List>
        </Example>

        <Example caption="Rows outside a list: each keeps its 14 corner under the finger and no hairline is drawn.">
          <VStack gap="xs">
            <ListRow icon="info" title="A row by itself" chevron onPress={pressed('a row by itself')} />
            <ListRow size="sm" icon="add" title="A small row by itself" onPress={pressed('a small row by itself')} />
          </VStack>
        </Example>

        <Example caption="Right to left: turn the whole preview to Hebrew. Rows mirror, words start from the right, the hairline starts under the titles on that side and the chevron flips by itself. Digits do not flip." />
      </Block>

      <Block title="Divider">
        <Example caption="horizontal (the default): 1 of line across its parent. Silent to a screen reader.">
          <Card>
            <VStack gap="md">
              <Txt>Above the line</Txt>
              <Divider />
              <Txt>Below the line</Txt>
            </VStack>
          </Card>
        </Example>

        <Example caption="inset lg stops 16 short of both ends. insetStart huge stops short only where reading begins, insetEnd huge only where it ends.">
          <Card>
            <VStack gap="md">
              <Txt>inset lg</Txt>
              <Divider inset="lg" />
              <Txt>insetStart huge</Txt>
              <Divider insetStart="huge" />
              <Txt>insetEnd huge</Txt>
              <Divider insetEnd="huge" />
              <Txt>The end of the card</Txt>
            </VStack>
          </Card>
        </Example>

        <Example caption="vertical: between things side by side. It takes the height of the row. Here with inset sm.">
          <Card>
            <HStack gap="md" align="stretch">
              <Txt style={styles.fill}>Before the line, with enough words to run onto a second line</Txt>
              <Divider orientation="vertical" inset="sm" />
              <Txt style={styles.fill}>After the line</Txt>
            </HStack>
          </Card>
        </Example>
      </Block>

      <Block title="Section">
        {readout}

        <Example caption="Sections are 24 apart (the parent's gap). The heading sits 12 above its content and 4 in from its edge.">
          <VStack gap="xxl">
            <Section title="Tools">
              <List>
                <ListRow icon="what-if" title="What if...?" chevron onPress={pressed('What if')} />
                <ListRow icon="report" title="Report" chevron onPress={pressed('Report')} />
              </List>
            </Section>
            <Section title="Settings">
              <List>
                <ListRow icon="language" title="Language" trailing="English" chevron onPress={pressed('Language')} />
              </List>
            </Section>
          </VStack>
        </Example>

        <Example caption="count: beside the title in quieter ink, spoken as part of the heading.">
          <Section title="My files" count="3">
            <List>
              <ListRow icon="file" title="shop-stock-march.csv" chevron onPress={pressed('shop-stock-march.csv')} />
            </List>
          </Section>
        </Example>

        <Example caption="action: at the end of the heading line. Its 48 target reaches into the space round the heading, so this heading is no taller than the others.">
          <Section title="My files" action={<TextActionStandIn label="See all" onPress={pressed('See all')} />}>
            <List>
              <ListRow icon="file" title="shop-stock-march.csv" chevron onPress={pressed('shop-stock-march.csv')} />
            </List>
          </Section>
        </Example>

        <Example caption="count and action together.">
          <Section
            title="My files"
            count="3"
            action={<TextActionStandIn label="See all" onPress={pressed('See all')} />}>
            <List>
              <ListRow icon="file" title="shop-stock-march.csv" chevron onPress={pressed('shop-stock-march.csv')} />
            </List>
          </Section>
        </Example>

        <Example caption="size sm: the quieter name of a group inside a section.">
          <Section title="Shop sales" count="2" size="sm">
            <List>
              <ListRow icon="file" title="shop-sales-november.csv" chevron onPress={pressed('November')} />
              <ListRow icon="file" title="shop-sales-october.csv" chevron onPress={pressed('October')} />
            </List>
          </Section>
        </Example>

        <Example caption="Hindi, then long Hindi text. The heading takes the taller line. A long title wraps, and the action moves onto its own line when the two no longer fit side by side.">
          <VStack gap="xxl">
            <Section
              title={HI.myFiles}
              count="3"
              action={<TextActionStandIn label={HI.seeAll} onPress={pressed(HI.seeAll)} />}>
              <List>
                <ListRow
                  icon="file"
                  title={HI.fileName}
                  subtitle={HI.fileMeta}
                  chevron
                  onPress={pressed(HI.fileName)}
                />
              </List>
            </Section>
            <Section
              title={HI.bestMonth}
              count="3"
              action={<TextActionStandIn label={HI.seeAll} onPress={pressed(HI.seeAll)} />}>
              <List>
                <ListRow icon="what-if" title={HI.whatIf} subtitle={HI.whatIfHelp} chevron onPress={pressed(HI.whatIf)} />
              </List>
            </Section>
          </VStack>
        </Example>

        <Example caption="A section with nothing in it is not drawn: there is one below this caption, and a list with no rows inside a card.">
          <Section title="Never drawn">{null}</Section>
          <Card variant="flat" size="sm">
            <Txt variant="small" tone="soft">
              Between this line and the next there is a List with no rows.
            </Txt>
            <List>{[]}</List>
            <Txt variant="small" tone="soft">
              Nothing is drawn for it.
            </Txt>
          </Card>
        </Example>
      </Block>
    </VStack>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The stand-ins. Their sizes come from tokens too.
  track: {
    width: sizes.control,
    height: space.xxxl,
    borderRadius: radius.pill,
    borderWidth: border.control,
    paddingHorizontal: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  trackOn: { justifyContent: 'flex-end' },
  knob: { width: sizes.iconSmall, height: sizes.iconSmall, borderRadius: radius.pill },
  radio: {
    width: sizes.icon,
    height: sizes.icon,
    borderRadius: radius.pill,
    borderWidth: border.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: space.sm, height: space.sm, borderRadius: radius.pill },
  // The brand's text button: 48 high, 12 at the sides.
  textAction: {
    minHeight: sizes.target,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  // The brand's icon button: a 48 target round a 24 icon.
  more: {
    width: sizes.target,
    height: sizes.target,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
