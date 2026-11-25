import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { radius, space, spring, useIsRTL, useReducedMotion, useTheme } from '@/theme';
import { Card } from '@/ui/card';
import { Numeral } from '@/ui/numeral';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// The height of a bar's track. It belongs to these two bars only.
const TRACK = 12;
// A value that is not zero always shows a sliver of bar.
const SLIVER = 0.02;

type Parts = { prefix: string; number: string; suffix: string; rtl: boolean };

// The answer to the what-if: what is shown, the value after the change as a
// big numeral, the difference as one plain sentence, then before and after
// as two bars on sunk tracks, each with its label and its value written
// beside it: now in resting grey, after in the chart's blue. The words say
// whether it is a rise or a fall; the bars only show the sizes.
export function ResultCard({
  title,
  label,
  parts,
  spokenValue,
  sentence,
  groupLine,
  nowLabel,
  afterLabel,
  before,
  after,
  beforeText,
  afterText,
}: {
  title: string;
  label: string;
  parts: Parts;
  spokenValue: string;
  sentence: string;
  groupLine: string | null;
  nowLabel: string;
  afterLabel: string;
  before: number | null;
  after: number | null;
  beforeText: string;
  afterText: string;
}) {
  const { colors } = useTheme();

  // Each bar is its value's share of the larger of the two. An unknown value
  // has no bar (and a dash for its value), never a bar of zero drawn as a
  // number.
  const known = [before, after].filter((value): value is number => value !== null).map(Math.abs);
  const largest = known.length > 0 ? Math.max(...known) : 0;
  const share = (value: number | null) => {
    if (value === null || largest === 0 || value === 0) return 0;
    return Math.max(Math.min(Math.abs(value) / largest, 1), SLIVER);
  };

  return (
    <Card style={styles.card}>
      <Txt variant="small" tone="soft" weight="600" accessibilityRole="header">
        {title}
      </Txt>
      <Txt variant="label">{label}</Txt>
      <Numeral value={parts.number} prefix={parts.prefix} unit={parts.suffix} size="hero" accessibilityLabel={spokenValue} />
      <Txt accessibilityLiveRegion="polite">{sentence}</Txt>
      {groupLine ? (
        <Txt variant="small" tone="soft">
          {groupLine}
        </Txt>
      ) : null}
      <VStack gap="md" style={styles.bars}>
        <ChangeBar label={nowLabel} valueText={beforeText} share={share(before)} color={colors.chartRest} />
        <ChangeBar label={afterLabel} valueText={afterText} share={share(after)} color={colors.chartPeak} strong />
      </VStack>
    </Card>
  );
}

// One bar: its label and value above a sunk track. The fill is as long as
// the track and is slid along it (a transform, never an animated width),
// clipped by the track's round ends. It runs from the reading edge. When the
// change moves, it settles at its new length on the settle spring; with
// reduced motion it is simply there.
function ChangeBar({
  label,
  valueText,
  share,
  color,
  strong = false,
}: {
  label: string;
  valueText: string;
  share: number;
  color: string;
  strong?: boolean;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const side = useIsRTL() ? -1 : 1;
  const width = useSharedValue(0);
  const filled = useSharedValue(share);

  useEffect(() => {
    filled.set(withSpring(share, spring('settle', reduced)));
  }, [share, reduced, filled]);

  const fillStyle = useAnimatedStyle(() => {
    const wide = width.get();
    return {
      // Nothing is drawn in the one frame before the track is measured.
      opacity: wide > 0 ? 1 : 0,
      transform: [{ translateX: side * (filled.get() - 1) * wide }],
    };
  });

  const measure = (event: LayoutChangeEvent) => {
    width.set(event.nativeEvent.layout.width);
  };

  return (
    <View accessible accessibilityLabel={`${label}: ${valueText}`} style={styles.bar}>
      <HStack gap="sm" justify="between" wrap>
        <Txt variant="small" weight={strong ? '600' : undefined} style={styles.label}>
          {label}
        </Txt>
        <Txt variant="small" weight={strong ? '600' : undefined}>
          {valueText}
        </Txt>
      </HStack>
      <View onLayout={measure} style={[styles.track, { backgroundColor: colors.surfaceSunk }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  bars: { marginTop: space.sm },
  bar: { gap: space.xs },
  label: { flexGrow: 1, flexShrink: 1 },
  // The round ends of the track clip the fill.
  track: { height: TRACK, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFill, borderRadius: radius.pill },
});
