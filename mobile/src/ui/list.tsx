import { Children, Fragment, createContext, isValidElement, useContext, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { duration, radius, sizes, space, useReducedMotion, useTheme } from '@/theme';
import { Card, type CardVariant } from '@/ui/card';
import { Divider } from '@/ui/divider';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Press, type PressProps } from '@/ui/press';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

// A list is one rounded group of rows with a hairline between them (brand
// spec, section 6: a row is at least 56 high, its icon sits in a 40 tile on
// sunk paper, and rows and tiles share the 14 corner).
//
// The group is a Card; the rows sit 4 inside it and keep their own 14 corner,
// so the tint under a finger is a rounded shape that follows the card's
// corner instead of a band cut off by it. Nothing is clipped, which also
// keeps the keyboard focus ring of a row whole. The hairline between two rows
// is brought by the lower one. It starts under the titles, so the icon tiles
// read as one clear column, and it stops short of the card's edge.

// --- The group -----------------------------------------------------------------

// The paper of the group: `raised` is the brand's card, `flat` only an edge
// (for a list that sits on a sheet or inside a card). There is no sunk list:
// the icon tiles are sunk paper themselves and would disappear on it.
export type ListVariant = Exclude<CardVariant, 'sunk'>;

export type ListProps = Omit<ViewProps, 'style' | 'children'> & {
  variant?: ListVariant;
  // Layout only (flex, a width). Merged last.
  style?: StyleProp<ViewStyle>;
  // The rows. Fragments are opened and empty children are skipped.
  children?: ReactNode;
};

// True for every row of a List except its first: that row draws the hairline
// above itself. A row outside a List draws none.
const RuledAbove = createContext(false);

type Entry = { key: string; node: ReactNode };

// The rows of a list, in order, with fragments opened so that
// `{open && <><ListRow /><ListRow /></>}` still gets a hairline between its
// two rows.
function entriesOf(children: ReactNode, path = ''): Entry[] {
  const entries: Entry[] = [];
  Children.toArray(children).forEach((child, index) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    const key = `${path}${child.key ?? index}`;
    if (child.type === Fragment) entries.push(...entriesOf(child.props.children, `${key}/`));
    else entries.push({ key, node: child });
  });
  return entries;
}

// A rounded group of rows:
//   <List>
//     <ListRow icon="file" title={name} subtitle={meta} chevron onPress={open} />
//     <ListRow icon="language" title={t('more.language')} trailing={languageName} chevron onPress={pick} />
//   </List>
//
// A list with no rows draws nothing, so an empty group never shows as a blank
// box. The hairlines are drawn by the rows themselves: give the list ListRows
// (or fragments of them, or your own component that renders one ListRow), not
// a component that renders several rows by itself, and not another kind of
// row, which would get no hairline.
export function List({ variant = 'raised', style, children, ...rest }: ListProps) {
  const entries = entriesOf(children);
  if (entries.length === 0) return null;

  return (
    <Card {...rest} variant={variant} flush style={[styles.list, style]}>
      {entries.map((entry, index) => (
        <RuledAbove.Provider key={entry.key} value={index > 0}>
          {entry.node}
        </RuledAbove.Provider>
      ))}
    </Card>
  );
}

// --- The working mark ------------------------------------------------------------

// Three dots that come forward one after another while a row is working, on
// the beat of the library's working mark (the dots of a busy button): one dot
// starts a quick step after the one before it, and a whole round takes three
// sweeps. Opacity only, on the UI thread. With reduced motion it is not drawn
// at all: the row writes the still word instead (see `busy`).
const TURNS = [0, 1, 2] as const;
const TURN = duration.quick;
const ROUND = duration.sweep * TURNS.length;
// How faint a dot is while it waits its turn. Local to this mark.
const REST = 0.32;
// A short rise, a short fall, then a wait: the wave has a clear front.
const PULSE = {
  '0%': { opacity: REST },
  '25%': { opacity: 1 },
  '50%': { opacity: REST },
  '100%': { opacity: REST },
};

function WorkingMark({ color }: { color: string }) {
  return (
    <View aria-hidden style={styles.working}>
      {TURNS.map((turn) => (
        <Animated.View
          key={turn}
          style={[
            styles.dot,
            { backgroundColor: color },
            {
              animationName: PULSE,
              animationDuration: ROUND,
              animationDelay: TURN * turn,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            },
          ]}
        />
      ))}
    </View>
  );
}

// --- The row -------------------------------------------------------------------

// plain: an ordinary row. destructive: its title and icon are written in
// `bad`, the colour of an action that removes something.
export type ListRowVariant = 'plain' | 'destructive';

// md: at least 56 high, the icon in its 40 tile. sm: at least 48 high, a bare
// 20 icon; for short lists of actions (a sheet, a menu).
export type ListRowSize = 'sm' | 'md';

// What the subtitle reports. `warn` is "could not check" or "not yet", `bad`
// is a failure, `good` is a check that passed.
export type ListRowStatus = 'good' | 'warn' | 'bad';

// Everything a View takes passes through (testID, the accessibility props,
// role and the aria- states), and so do the few press props below.
export type ListRowProps = Omit<ViewProps, 'style' | 'children'> &
  Pick<PressProps, 'onPress' | 'onLongPress' | 'delayLongPress' | 'disabled' | 'haptic' | 'unstable_pressDelay'> & {
    // The row's name. It wraps onto more lines before anything is cut.
    title: string;
    // A second, quieter line: what the thing is, or how it stands.
    subtitle?: string;
    // The leading icon, in its sunk tile (bare at size sm). It takes the
    // row's ink and never speaks.
    icon?: IconName;
    // Anything else in the leading slot (a radio mark, a picture), centred in
    // the column the icon would take. Wins over `icon`.
    leading?: ReactNode;
    // The trailing slot. A string is the row's value, written in soft ink (a
    // number is formatted by the app first; an unknown value is a dash, never
    // zero). Anything else is drawn as it is: a tag, a switch, a small
    // button. It sits at the end of the row and moves under the title when
    // the two no longer fit side by side, as they do not at large text sizes.
    trailing?: ReactNode;
    // The row leads somewhere: a chevron at its far end. It points the way
    // the language reads.
    chevron?: boolean;
    variant?: ListRowVariant;
    size?: ListRowSize;
    // Turns the subtitle into a status line: the matching icon before it and
    // both in the status colour. A status is never colour alone, so it needs
    // the subtitle's words: say what happened and what to do next.
    status?: ListRowStatus;
    // A small icon before the subtitle, in the subtitle's own ink. For a line
    // of proof ("Checked on your phone, 319 of 319 rows" takes `check`) and
    // for a row that points to checked words and gives their count (the one
    // use of `checked-stamp`, brand spec section 10). With `status` it takes
    // the place of the status's own icon. It never speaks: the words do.
    subtitleIcon?: IconName;
    // The row is working on what was asked. It cannot be pressed again, it
    // says so to a screen reader, and the working mark takes the chevron's
    // place, so the row keeps its size. With reduced motion nothing loops:
    // the chevron stays and the still word from UIStrings (`loading`) is
    // written in the row.
    busy?: boolean;
    // Cuts the title after this many lines. Without it the title takes the
    // lines it needs, and that is the rule: a sentence in a row wraps and the
    // row grows. The one thing that is cut is a file name (brand spec,
    // section 6): pass 1 and it stays on one line and loses its middle, so
    // its ending and its extension stay. (The browser preview can only cut
    // the end.) The whole name is still read out by a screen reader.
    titleLines?: number;
    // Layout only. Merged last.
    style?: StyleProp<ViewStyle>;
    // More content under the title and subtitle (a progress line, a note).
    children?: ReactNode;
  };

const STATUS_ICON: Record<ListRowStatus, IconName> = { good: 'check', warn: 'warning', bad: 'error' };

// A zero-width space. Set as text beside the subtitle's icon it gives that
// icon a box exactly one line of the subtitle high, whatever the phone's text
// size, so the icon stays centred on the first line when the words wrap.
const ONE_LINE = String.fromCharCode(0x200b);

// A node that draws nothing: what `cond && <X />` leaves behind when false.
function isEmpty(node: ReactNode): boolean {
  return node === undefined || node === null || typeof node === 'boolean';
}

// One row of a list:
//   <ListRow icon="file" title={name} subtitle={meta} chevron onPress={open} />
//   <ListRow icon="language" title={label} trailing={languageName} chevron onPress={pick} />
//   <ListRow title={label} subtitle={state} trailing={<Switch ... />} role="switch" aria-checked={on} onPress={toggle} />
//   <ListRow icon="delete" title={label} variant="destructive" onPress={erase} />
//
// With onPress (or onLongPress) the row is built on Press. A row is as wide
// as its list, so it does not shrink under the finger (that reads as the
// whole screen squeezing): the pressed paper fades in under it instead, and
// the action fires on release. Without them it is a plain line of words, read
// by a screen reader in one go.
//
// It grows with its words and with the phone's text size: the title and the
// subtitle wrap, the trailing slot moves under them, and only the icons keep
// their size. It mirrors by itself in right-to-left languages.
//
// disabled: the title, the icon and the value turn to `disabledInk`. The
// subtitle stays readable: it is where the row says why it cannot be used.
//
// A switch in the trailing slot, two ways. Either the row is the switch
// (`role="switch"`, `aria-checked`, onPress) and the drawn switch only shows
// the state, out of the way of touches: one large target and one thing to
// read. Or the row has no onPress and the switch is the control, labelled with
// the row's title.
// A small button in the trailing slot of a pressable row takes its own touch,
// but on iOS the row hides it from a screen reader: offer its action through
// `accessibilityActions` on the row, or pass `accessible={false}` and label
// each part.
export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  trailing,
  chevron = false,
  variant = 'plain',
  size = 'md',
  status,
  subtitleIcon,
  busy = false,
  titleLines,
  onPress,
  onLongPress,
  delayLongPress,
  disabled = false,
  haptic,
  unstable_pressDelay,
  accessibilityLabel,
  style,
  children,
  ...rest
}: ListRowProps) {
  const { colors } = useTheme();
  const strings = useUIStrings();
  const reduced = useReducedMotion();
  const ruled = useContext(RuledAbove);

  const pressable = onPress !== undefined || onLongPress !== undefined;
  const compact = size === 'sm';
  const removes = variant === 'destructive';

  // Disabled is faint ink on the same paper, never a faded colour.
  const titleInk = disabled ? colors.disabledInk : removes ? colors.bad : colors.ink;
  const iconInk = disabled ? colors.disabledInk : removes ? colors.bad : colors.inkSoft;
  const softInk = disabled ? colors.disabledInk : colors.inkSoft;
  const faintInk = disabled ? colors.disabledInk : colors.inkFaint;

  // The leading slot: one column as wide as the icon it usually holds, so the
  // titles of a list line up whatever leads each row.
  const leadWidth = compact ? sizes.iconSmall : sizes.iconTile;
  let lead: ReactNode = null;
  if (!isEmpty(leading)) {
    lead = <View style={[styles.lead, { minWidth: leadWidth }]}>{leading}</View>;
  } else if (icon !== undefined && compact) {
    lead = <Icon name={icon} size={sizes.iconSmall} color={iconInk} />;
  } else if (icon !== undefined) {
    lead = (
      <View style={[styles.tile, { backgroundColor: disabled ? colors.disabledFill : colors.surfaceSunk }]}>
        <Icon name={icon} color={iconInk} />
      </View>
    );
  }

  // The second line: plain words, or words with a small icon before them (a
  // status, a line of proof). Its ink does not fade when the row is disabled.
  let second: ReactNode = null;
  if (subtitle !== undefined && subtitle !== '') {
    const secondInk = status === undefined ? colors.inkSoft : colors[status];
    const secondIcon = subtitleIcon ?? (status === undefined ? undefined : STATUS_ICON[status]);
    second =
      secondIcon === undefined ? (
        <Txt variant="small" color={secondInk}>
          {subtitle}
        </Txt>
      ) : (
        <View style={styles.second}>
          <View style={styles.secondMark}>
            <Txt variant="small" accessible={false} aria-hidden>
              {ONE_LINE}
            </Txt>
            <Icon name={secondIcon} size={sizes.iconSmall} color={secondInk} />
          </View>
          <Txt variant="small" color={secondInk} style={styles.secondWords}>
            {subtitle}
          </Txt>
        </View>
      );
  }

  // The trailing slot: plain text is the row's value, anything else is the
  // caller's own.
  const text = typeof trailing === 'string' ? trailing : typeof trailing === 'number' ? String(trailing) : undefined;
  const value = text === '' ? undefined : text;
  let trail: ReactNode = null;
  if (value !== undefined) {
    trail = (
      <Txt variant="label" weight="400" color={softInk} snug style={styles.trailing}>
        {value}
      </Txt>
    );
  } else if (text === undefined && !isEmpty(trailing)) {
    trail = <View style={styles.trailing}>{trailing}</View>;
  }

  // The far end: the working mark while busy, otherwise the chevron.
  let end: ReactNode = null;
  if (busy && !reduced) {
    end = <WorkingMark color={softInk} />;
  } else if (chevron) {
    end = <Icon name="chevron" size={sizes.iconSmall} color={faintInk} />;
  }

  // While it works the row has no words on screen that say so (the mark is a
  // drawing), so the spoken label is put together here.
  const whileBusy = [title, subtitle, value, strings.loading].filter((part) => part !== undefined && part !== '');
  const spoken = accessibilityLabel ?? (busy ? whileBusy.join(', ') : undefined);

  const content = (
    <>
      {lead}
      <View style={styles.body}>
        <View style={styles.words}>
          <Txt
            variant="label"
            color={titleInk}
            numberOfLines={titleLines}
            // One line is a file name: it loses its middle and keeps its ending.
            ellipsizeMode={titleLines === 1 ? 'middle' : undefined}>
            {title}
          </Txt>
          {second}
          {children}
        </View>
        {trail}
        {busy && reduced ? (
          <Txt variant="small" color={softInk} snug>
            {strings.loading}
          </Txt>
        ) : null}
      </View>
      {end}
    </>
  );

  const shape: StyleProp<ViewStyle> = [styles.row, compact ? styles.sm : styles.md, style];

  let row: ReactNode;
  if (pressable) {
    row = (
      <Press
        {...rest}
        accessibilityLabel={spoken}
        aria-busy={busy ? true : rest['aria-busy']}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        unstable_pressDelay={unstable_pressDelay}
        haptic={haptic}
        disabled={disabled || busy}
        weight="lg"
        feedback="highlight"
        style={shape}>
        {content}
      </Press>
    );
  } else {
    // A row that is nothing but words is read as one thing on a phone (in the
    // browser that would also make it a tab stop, so it is left alone there).
    // A row that holds a control keeps its parts reachable one by one.
    const onlyWords = isEmpty(leading) && isEmpty(children) && (isEmpty(trailing) || text !== undefined);
    row = (
      <View
        {...rest}
        accessible={rest.accessible ?? (onlyWords && Platform.OS !== 'web' ? true : undefined)}
        accessibilityLabel={spoken}
        aria-busy={busy ? true : rest['aria-busy']}
        style={shape}>
        {content}
      </View>
    );
  }

  if (!ruled) return row;

  // In a list, every row but the first brings the hairline above it: a line of
  // its own between two rows, so it stays outside the tint of a pressed row.
  // It starts under the title (after the leading slot, when there is one) and
  // stops where the row's content stops.
  const ruleStart = space.sm + (lead === null ? 0 : leadWidth + space.md);
  return (
    <>
      <Divider style={[styles.rule, { marginStart: ruleStart }]} />
      {row}
    </>
  );
}

// How much of the row the title and subtitle keep before the trailing slot is
// moved under them. Local to the row: it is a share of its own width, not a
// step of the spacing scale.
const WORDS_SHARE = '55%';

const styles = StyleSheet.create({
  // The rows sit 4 inside the group. Nothing else is between them but the
  // hairline each row brings.
  list: { padding: space.xs },
  // 8 at the sides of the row plus the 4 of the group puts the tile 12 from
  // the card's edge, and 12 from its top. 4 above and below keeps a title
  // with a subtitle, and a 48 control in the trailing slot, inside the 56 of a
  // row; a row with more words than that grows.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.control,
  },
  md: { minHeight: sizes.row },
  sm: { minHeight: sizes.target },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The caller's own leading content, centred in the icon's column. Its
  // smallest width is added at render (it follows the size of the row).
  lead: { alignItems: 'center', justifyContent: 'center' },
  // The words and the trailing slot share this line, and break onto two when
  // they no longer fit.
  body: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: space.xs,
  },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: WORDS_SHARE },
  trailing: { flexShrink: 1, maxWidth: '100%' },
  // The subtitle with its icon: the icon at the first line, the words beside
  // it taking the rest of the width.
  second: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  // The icon, centred on a box one line of the words high (see ONE_LINE).
  secondMark: { flexDirection: 'row', alignItems: 'center' },
  secondWords: { flex: 1 },
  // The hairline above a row stops where the row's content stops. Where it
  // starts depends on the row's icon and is added at render.
  rule: { marginEnd: space.sm },
  // Three dots of 4 with 4 between them: the 20 of the chevron they replace.
  working: {
    width: sizes.iconSmall,
    height: sizes.iconSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: { width: space.xs, height: space.xs, borderRadius: radius.pill, opacity: REST },
});
