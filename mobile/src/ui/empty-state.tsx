import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { space } from '@/theme';
import { Button } from '@/ui/button';
import type { IconName } from '@/ui/icon-set';
import { Txt } from '@/ui/text';

// screen   the whole screen has nothing else on it: the opening line is set
//          in `display` (brand spec, section 5), the block fills the room it
//          is given and sits in its middle, and its action is the screen's
//          one filled button.
// section  a part of a screen that has nothing yet, inside a card or a
//          sheet: a `heading` line, compact, with a quiet button so the
//          screen's own main button stays the only filled one.
export type EmptyStateVariant = 'screen' | 'section';
export type EmptyStateAlign = 'center' | 'start';

// The one way forward.
export type EmptyStateAction = {
  // The words, already in the app's language.
  label: string;
  onPress: () => void;
  // One icon of the family before the words ("add" on "Add a file").
  icon?: IconName;
  // Working on what it was pressed for: it keeps its size and cannot be
  // pressed again.
  busy?: boolean;
  // Cannot be used right now. Say why in a line under it (as `children`).
  disabled?: boolean;
};

export type EmptyStateProps = {
  // Default screen.
  variant?: EmptyStateVariant;
  // Default center. `start` follows the reading direction.
  align?: EmptyStateAlign;
  // A drawing above the words: one of the app's illustrations. It is for
  // the eye only and never the yellow (brand spec, section 4).
  illustration?: ReactNode;
  // One line that says what is not here yet.
  title: string;
  // One line that says why, or what will be here.
  body?: string;
  // The way forward. An empty screen is an invitation to act, so give one
  // wherever there is something the person can do.
  action?: EmptyStateAction;
  // Under the action: a quieter second way on, the reason a button cannot be
  // used, the privacy line.
  children?: ReactNode;
  // Layout only (a flex, a padding). Merged last.
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// What a screen shows when it has nothing to show: a drawing, one line, why,
// and one thing to do about it. Never a blank box.
//   <EmptyState
//     illustration={<NoFileDrawing />}
//     title={t('home.noFile')}
//     body={t('home.noFileBody')}
//     action={{ label: t('home.addFile'), icon: 'add', onPress: addFile }}>
//     <Button variant="plain" label={t('home.sample')} onPress={openSample} />
//   </EmptyState>
//
// As a screen it grows to fill its parent, so the parent needs a height (a
// flex, or a scroll view whose content grows). An empty part of a screen
// that already has content is usually not drawn at all; use `section` only
// where the gap would otherwise look like a mistake.
//
// Needs AppStateProvider above it.
export function EmptyState({
  variant = 'screen',
  align = 'center',
  illustration,
  title,
  body,
  action,
  children,
  style,
  testID,
}: EmptyStateProps) {
  const screen = variant === 'screen';
  const side = align === 'center' ? styles.centred : styles.fromStart;
  const more = children !== undefined && children !== null && children !== false;

  return (
    <View testID={testID} style={[screen ? styles.screen : styles.section, style]}>
      {illustration === undefined || illustration === null ? null : (
        <View aria-hidden style={side}>
          {illustration}
        </View>
      )}
      {/* The words take the full width, so centred lines can wrap without being cut. */}
      <View style={screen ? styles.wordsScreen : styles.wordsSection}>
        <Txt variant={screen ? 'display' : 'heading'} align={align} accessibilityRole="header">
          {title}
        </Txt>
        {body === undefined ? null : (
          <Txt variant={screen ? 'body' : 'small'} tone="soft" align={align}>
            {body}
          </Txt>
        )}
      </View>
      {action === undefined && !more ? null : (
        <View style={[styles.ways, side]}>
          {action === undefined ? null : (
            <Button
              variant={screen ? 'main' : 'quiet'}
              label={action.label}
              icon={action.icon}
              busy={action.busy}
              disabled={action.disabled}
              onPress={action.onPress}
            />
          )}
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fills the room it is given and sits in the middle of it.
  screen: { flexGrow: 1, justifyContent: 'center', gap: space.xxl, paddingVertical: space.xxxl },
  section: { gap: space.lg, paddingVertical: space.xl },
  wordsScreen: { gap: space.sm },
  wordsSection: { gap: space.xs },
  // The action and what follows it: each as wide as its own words.
  ways: { gap: space.sm },
  centred: { alignItems: 'center' },
  fromStart: { alignItems: 'flex-start' },
});
