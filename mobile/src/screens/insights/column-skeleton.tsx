import { StyleSheet, View } from 'react-native';

import { useLocalT } from '@/i18n/local';
import { numeralLine, space } from '@/theme';
import { PLOT_HEIGHT } from '@/ui/charts/bar-chart';
import { Skeleton, SkeletonBlock, SkeletonCard, SkeletonChart, SkeletonText } from '@/ui/skeleton';

import { INSIGHTS_STRINGS } from './strings';

// The outline of a column's answer while a big file is worked out: the lead
// figure, the three smaller ones, and the chart with its title, read-out and
// axis, each the size of what will take its place. One group, so a screen
// reader hears "Working out the numbers" once and the outline breathes as one.
//
// Shown from its first frame: on a big file the phone is busy at once, and a
// placeholder that waits for a timer would never get its turn.
export function ColumnSkeleton() {
  const tl = useLocalT(INSIGHTS_STRINGS);
  return (
    <Skeleton label={tl('working')} delay={0} style={styles.column}>
      <SkeletonCard style={styles.figure}>
        <SkeletonText lines={1} variant="small" width="30%" />
        <SkeletonBlock width="60%" height={numeralLine.hero} />
        <SkeletonText lines={1} variant="small" width="50%" />
      </SkeletonCard>
      <View style={styles.grid}>
        {[0, 1, 2].map((at) => (
          <SkeletonCard key={at} style={[styles.figure, styles.half]}>
            <SkeletonText lines={1} variant="small" width="50%" />
            <SkeletonBlock width="70%" height={numeralLine.medium} />
            <SkeletonText lines={1} variant="small" width="80%" />
          </SkeletonCard>
        ))}
      </View>
      <SkeletonCard style={styles.chart}>
        <SkeletonText lines={1} variant="heading" width="55%" />
        <SkeletonText lines={1} variant="small" width="44%" />
        <SkeletonChart bars={12} height={PLOT_HEIGHT.lg} />
        <SkeletonText lines={1} variant="small" />
      </SkeletonCard>
    </Skeleton>
  );
}

const styles = StyleSheet.create({
  column: { gap: space.md },
  figure: { gap: space.xs },
  // Two to a row, the last alone across the width: as the figures lay out.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  half: { flexBasis: '40%', flexGrow: 1 },
  chart: { gap: space.md },
});
