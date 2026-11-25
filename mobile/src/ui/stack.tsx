import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { space, type Space } from '@/theme';

// The two layout primitives: a column (VStack) and a row (HStack). They exist
// so that every gap and every padding is a step of the spacing scale and
// nobody types a number. A component never sets its own outer margin: the
// stack around it spaces it with `gap`.
//
// A row mirrors by itself in right-to-left languages; `ps` and `pe` are the
// start and end sides, never left and right.

export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export type StackProps = Omit<ViewProps, 'style' | 'children'> & {
  // The space between children: a step of the spacing scale.
  gap?: Space;
  // Across the stack. A column stretches its children by default; a row
  // centres them.
  align?: StackAlign;
  // Along the stack.
  justify?: StackJustify;
  // Lets children flow onto the next line. Rows at large text sizes need it.
  wrap?: boolean;
  // Padding, as steps of the spacing scale: all sides, the two sides, top
  // and bottom, then each side by itself (s and e are start and end).
  p?: Space;
  px?: Space;
  py?: Space;
  pt?: Space;
  pb?: Space;
  ps?: Space;
  pe?: Space;
  // Layout only (flex, alignSelf, a width). Merged last.
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
} as const;

const JUSTIFY = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
} as const;

function step(value: Space | undefined): number | undefined {
  return value === undefined ? undefined : space[value];
}

function Stack({
  direction,
  gap,
  align,
  justify,
  wrap,
  p,
  px,
  py,
  pt,
  pb,
  ps,
  pe,
  style,
  children,
  ...rest
}: StackProps & { direction: 'row' | 'column' }) {
  const layout: ViewStyle = {
    flexDirection: direction,
    alignItems: ALIGN[align ?? (direction === 'row' ? 'center' : 'stretch')],
    justifyContent: justify === undefined ? undefined : JUSTIFY[justify],
    flexWrap: wrap === true ? 'wrap' : undefined,
    gap: step(gap),
    padding: step(p),
    paddingHorizontal: step(px),
    paddingVertical: step(py),
    paddingTop: step(pt),
    paddingBottom: step(pb),
    paddingStart: step(ps),
    paddingEnd: step(pe),
  };
  return (
    <View {...rest} style={[layout, style]}>
      {children}
    </View>
  );
}

// A column:
//   <VStack gap="md" p="lg">
//     <Txt variant="heading">{title}</Txt>
//     <Txt tone="soft">{body}</Txt>
//   </VStack>
export function VStack(props: StackProps) {
  return <Stack direction="column" {...props} />;
}

// A row, centred across by default:
//   <HStack gap="sm" justify="between">
//     <Icon name="file" />
//     <Txt variant="label">{name}</Txt>
//   </HStack>
export function HStack(props: StackProps) {
  return <Stack direction="row" {...props} />;
}
