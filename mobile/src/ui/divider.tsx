import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { border, space, useTheme, type Space } from '@/theme';

export type DividerOrientation = 'horizontal' | 'vertical';

export type DividerProps = Omit<ViewProps, 'style' | 'children'> & {
  // Which way the line runs. Horizontal (the default) sits between things
  // stacked in a column and takes their width. Vertical sits between things
  // side by side in a row and takes the row's height.
  orientation?: DividerOrientation;
  // How far the line stops short of both ends: a step of the spacing scale.
  inset?: Space;
  // The same for one end only; it wins over `inset` for that end. Start is
  // where reading begins (the right-hand end in Hebrew). On a vertical line
  // start is the top.
  insetStart?: Space;
  insetEnd?: Space;
  // Layout only (a position, alignSelf). Merged last.
  style?: StyleProp<ViewStyle>;
};

function step(value: Space | undefined): number {
  return value === undefined ? 0 : space[value];
}

// A hairline: 1 of `line` (brand spec, section 3). It separates; it never
// marks a control by itself, and it says nothing to a screen reader.
//   <Divider />
//   <Divider inset="lg" />
//   <HStack align="stretch"><Cell /><Divider orientation="vertical" /><Cell /></HStack>
//
// The inset is drawn inside the divider's own box (the box keeps the full
// length and the line inside it starts later), so a divider never carries an
// outer margin: its parent spaces it like anything else.
//
// The rows of a List draw their own dividers; this is for everything else.
export function Divider({ orientation = 'horizontal', inset, insetStart, insetEnd, style, ...rest }: DividerProps) {
  const { colors } = useTheme();
  const vertical = orientation === 'vertical';
  const shape = vertical ? styles.vertical : styles.horizontal;
  const from = step(insetStart ?? inset);
  const to = step(insetEnd ?? inset);

  if (from === 0 && to === 0) {
    return <View aria-hidden {...rest} style={[shape, { backgroundColor: colors.line }, style]} />;
  }

  const ends: ViewStyle = vertical ? { paddingTop: from, paddingBottom: to } : { paddingStart: from, paddingEnd: to };
  return (
    <View aria-hidden {...rest} style={[shape, ends, style]}>
      <View style={[styles.line, { backgroundColor: colors.line }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // `stretch` so the line spans its parent even when the parent centres its
  // children (a row centres by default: without it a vertical line would have
  // no height). A line never takes a touch.
  horizontal: { height: border.hairline, alignSelf: 'stretch', pointerEvents: 'none' },
  vertical: { width: border.hairline, alignSelf: 'stretch', pointerEvents: 'none' },
  // The drawn part of an inset divider: whatever the insets leave.
  line: { flex: 1 },
});
