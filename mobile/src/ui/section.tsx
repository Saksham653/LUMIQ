import { Children, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { space } from '@/theme';
import { VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// md: the heading of a section of a screen (`heading`, in ink).
// sm: the quieter name of a group inside one (`label`, in soft ink).
export type SectionSize = 'sm' | 'md';

export type SectionProps = Omit<ViewProps, 'style' | 'children'> & {
  // The heading. It is a header to a screen reader.
  title: string;
  // How many things the section holds, beside the title in quieter ink.
  // Already written by the app in its own number style: pass the words, not a
  // number. Leave it out when the count is not known (never pass zero for
  // "unknown").
  count?: string;
  // One action at the end of the heading line: a text button ("See all") or
  // an icon button. Its 48 target reaches into the space round the heading
  // without pushing anything away, so a heading with an action and one
  // without sit at the same height.
  action?: ReactNode;
  size?: SectionSize;
  // Layout only (flex, a width). Merged last.
  style?: StyleProp<ViewStyle>;
  // The section itself: a List, cards, anything. 12 apart.
  children?: ReactNode;
};

// A heading with what it names under it:
//   <Section title={t('home.myFiles')} count={numbers.format(files.length)} action={<Button variant="text" onPress={seeAll}>{t('home.seeAll')}</Button>}>
//     <List>{rows}</List>
//   </Section>
//
// The heading sits 12 above its content and 4 in from its edge, so it lines
// up with what is inside a card's round corner. Sections themselves are 24
// apart (brand spec, section 6): the screen spaces them with `gap="xxl"`, a
// section never sets a margin of its own.
//
// A section with nothing in it is not drawn, so a heading never stands over
// an empty space. It can only see its own children, though: when what it
// holds can turn out empty (a List with no rows draws nothing), leave the
// section out, or give it a named empty state.
//
// It grows with large text: a long title wraps, and the action moves onto its
// own line when the two no longer fit side by side.
export function Section({ title, count, action, size = 'md', style, children, ...rest }: SectionProps) {
  if (Children.toArray(children).length === 0) return null;

  const small = size === 'sm';
  const step = small ? 'label' : 'heading';
  const counted = count !== undefined && count !== '';
  const hasAction = action !== undefined && action !== null && typeof action !== 'boolean';

  return (
    <VStack {...rest} gap="md" style={style}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Txt
            variant={step}
            tone={small ? 'soft' : 'ink'}
            accessibilityRole="header"
            accessibilityLabel={counted ? `${title}, ${count}` : undefined}
            style={styles.title}>
            {title}
          </Txt>
          {counted ? (
            // Spoken as part of the heading above, so it is silent here.
            <Txt variant={step} tone={small ? 'faint' : 'soft'} weight="500" snug accessible={false} aria-hidden>
              {count}
            </Txt>
          ) : null}
        </View>
        {hasAction ? <View style={styles.action}>{action}</View> : null}
      </View>
      {children}
    </VStack>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: space.xs,
    paddingHorizontal: space.xs,
  },
  // The title and its count read as one line and share a baseline. They keep
  // at least half the width before the action is moved under them.
  heading: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '50%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space.sm,
  },
  title: { flexShrink: 1 },
  // The seat of the action. A text button and an icon button both keep their
  // drawing 12 inside a 48 target. A negative margin of that 12 lets the empty
  // part of the target hang over the space round the heading: the heading
  // keeps the height of its own line, and the action's words end 4 from the
  // edge, level with where the title starts on the other side.
  action: { margin: -space.md },
});
