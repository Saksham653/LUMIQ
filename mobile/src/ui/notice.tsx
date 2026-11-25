import { useEffect, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppState } from '@/state/app-state';
import { MAX_FONT_SCALE, lineHeightFor, radius, sizes, space, useTheme, type Palette } from '@/theme';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Press } from '@/ui/press';
import { useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

// info  something worth knowing. A quiet sunk well, ink words.
// good  it worked.
// warn  not yet, or could not be checked.
// bad   it failed, or it was refused.
// The three status tones keep their meaning everywhere (brand spec, section
// 3). None of them is ever the yellow.
export type NoticeTone = 'info' | 'good' | 'warn' | 'bad';

// One way on from a note, drawn as a text button under its words.
export type NoticeAction = {
  // The words, already in the app's language.
  label: string;
  onPress: () => void;
  // Working on what it was pressed for: it keeps its place and cannot be
  // pressed again.
  busy?: boolean;
};

export type NoticeProps = {
  // Default info.
  tone?: NoticeTone;
  // The strong line, in the tone's own colour: what this is about. A note
  // with one sentence needs nothing else.
  title?: string;
  // The icon beside the words. Default: the tone's own (info, check, warning,
  // error). A note always has one: status is never told by colour alone.
  icon?: IconName;
  // The rest of the words. A plain string is set as the smaller line under
  // the title; anything else is laid out as given, under the title. Words
  // only: a control belongs in `action`.
  children?: ReactNode;
  // The next step, and a second one beside it ("Try again", "Remove").
  action?: NoticeAction;
  secondAction?: NoticeAction;
  // Shows the close button and is called when it is pressed. The note does
  // not hide itself: whoever shows it takes it away.
  onDismiss?: () => void;
  // For a note that appears while the person is on the screen: a screen
  // reader is told its words when it arrives. Leave it off for a note that
  // is part of the screen from the start.
  live?: boolean;
  // Layout only (a flex, alignSelf). Merged last.
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type Paint = {
  // The soft fill.
  fill: keyof Palette;
  // The icon and the title.
  mark: keyof Palette;
  // The smaller line under the title.
  words: keyof Palette;
  icon: IconName;
};

const PAINT: Record<NoticeTone, Paint> = {
  info: { fill: 'surfaceSunk', mark: 'ink', words: 'inkSoft', icon: 'info' },
  good: { fill: 'goodSoft', mark: 'good', words: 'ink', icon: 'check' },
  warn: { fill: 'warnSoft', mark: 'warn', words: 'ink', icon: 'warning' },
  bad: { fill: 'badSoft', mark: 'bad', words: 'ink', icon: 'error' },
};

// A note inside the page: an icon and words on a soft fill, with at most two
// ways on and a close button.
//   <Notice tone="good" title={t('check.noEmptyCells', { n: 8 })} />
//   <Notice tone="warn" title={t('home.notFinished')} action={{ label: t('common.retry'), onPress: retry }}
//     secondAction={{ label: t('common.remove'), onPress: remove }} />
//   <Notice title={t('import.slowTitle')} onDismiss={hide}>{t('import.slowBody')}</Notice>
//
// It sits next to what it is about, takes the width its parent gives it and
// grows with its words. It does not move by itself: wrap it in Appear if it
// should rise in.
//
// Needs AppStateProvider above it.
export function Notice({
  tone = 'info',
  title,
  icon,
  children,
  action,
  secondAction,
  onDismiss,
  live = false,
  style,
  testID,
}: NoticeProps) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const { fontScale } = useWindowDimensions();
  const strings = useUIStrings();

  const paint = PAINT[tone];
  const mark = colors[paint.mark];
  const plain = typeof children === 'string' || typeof children === 'number' ? String(children) : undefined;
  const steps = [action, secondAction].filter((step): step is NoticeAction => step !== undefined);

  // What a screen reader is told when the note arrives.
  const said = [title, plain].filter((part): part is string => part !== undefined && part !== '').join(' ');

  useEffect(() => {
    // Android and the browser read a live region out by themselves. An iPhone
    // has to be told.
    if (live && Platform.OS === 'ios' && said !== '') AccessibilityInfo.announceForAccessibility(said);
  }, [live, said]);

  // The icon and the close button are centred on the first line of words,
  // whatever the script and however large the phone sets its text.
  const firstLine = Math.max(
    sizes.icon,
    Math.round(
      lineHeightFor(title === undefined ? 'small' : 'label', language, title ?? plain) *
        Math.min(fontScale, MAX_FONT_SCALE),
    ),
  );

  return (
    <View testID={testID} style={[styles.note, { backgroundColor: colors[paint.fill] }, style]}>
      <View style={[styles.beside, { height: firstLine }]}>
        <Icon name={icon ?? paint.icon} color={mark} />
      </View>
      <View style={styles.grow}>
        {/* One stop for a screen reader: the title and the words together.
            The buttons stay outside it, so each can still be reached. */}
        <View
          accessible
          accessibilityRole={live && (tone === 'warn' || tone === 'bad') ? 'alert' : undefined}
          aria-live={live ? 'polite' : undefined}
          style={styles.words}>
          {title === undefined ? null : (
            <Txt variant="label" color={mark}>
              {title}
            </Txt>
          )}
          {plain === undefined ? (
            children
          ) : (
            <Txt variant="small" color={colors[paint.words]}>
              {plain}
            </Txt>
          )}
        </View>
        {steps.length === 0 ? null : (
          <View style={styles.steps}>
            {steps.map((step, at) => (
              <Button key={at} variant="plain" label={step.label} busy={step.busy} onPress={step.onPress} />
            ))}
          </View>
        )}
      </View>
      {onDismiss === undefined ? null : (
        // Drawn 24 so a one-line note stays 48 high; Press gives it the full 48 by 48 to a finger.
        <Press
          weight="sm"
          onPress={onDismiss}
          accessibilityLabel={strings.close}
          style={[styles.beside, { height: firstLine }]}>
          <Icon name="close" color={colors.inkSoft} />
        </Press>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The status note of the brand board: radius 14, at least 48 high. The
  // board's 10 and 14 are set on the spacing scale as 12 and 16. Things line
  // up with the first line, so a long note reads from its top.
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    minHeight: sizes.target,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
  },
  // Holds an icon in the middle of the first line.
  beside: { justifyContent: 'center' },
  // Takes the room that is left, so long words wrap inside it.
  grow: { flex: 1 },
  words: { gap: space.xs },
  // A text button keeps 12 of room at each end of its words and about as
  // much above and below them (brand spec, section 6). Pulling the row back
  // by 12 lines its first word up with the words above; pulling the foot up
  // by 8 keeps the note from looking heavier below than above. The buttons
  // still lie inside the note.
  steps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginStart: -space.md,
    marginBottom: -space.sm,
  },
});
