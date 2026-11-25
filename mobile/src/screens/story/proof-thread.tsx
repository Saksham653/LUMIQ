import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { border, duration, radius, space, transition, useReducedMotion, useTheme } from '@/theme';

// How thick the thread is. It belongs to this component alone.
const THREAD = 6;

// The proof thread: one segment per card on a sunk track, across the top of
// the story. A segment takes the light once its card has been shown, and a
// card is only ever shown after it passed the phone's check, so the thread
// never fills on a timer. The fill fades in (opacity only), also with reduced
// motion. The first card's segment is at the start side: the row mirrors by
// itself in right-to-left languages.
//
// It is a drawing and silent to a screen reader: the line under it ("Card 2
// of 5") says the same in words.
export function ProofThread({
  lit,
}: {
  // One entry per card, in order: true once that card has been shown.
  lit: boolean[];
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return (
    <View aria-hidden style={styles.row}>
      {lit.map((on, index) => (
        <View key={index} style={[styles.segment, { backgroundColor: colors.surfaceSunk }]}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: colors.light, borderColor: colors.checkedLine, opacity: on ? 1 : 0 },
              transition(['opacity'], duration.sweep, 'sweep', reduced),
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  segment: { flex: 1, height: THREAD, borderRadius: radius.pill, overflow: 'hidden' },
  // The ring is what keeps the light visible on paper in the light theme.
  fill: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, borderWidth: border.hairline },
});
