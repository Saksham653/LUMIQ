import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Dataset } from '@/data/types';
import { useNumbers, useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';
import { radius, sizes, space, useTheme } from '@/theme';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';

// The open file at the top of Insights: its name and size, with Change, which
// goes back to Home to pick another. The same chip as on Ask.
export function FileChip({ dataset }: { dataset: Dataset }) {
  const { colors } = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { datasetName } = useDatasets();
  return (
    <Card size="sm" style={styles.chip}>
      <View style={[styles.tile, { backgroundColor: colors.surfaceSunk }]}>
        <Icon name="file" color={colors.inkSoft} />
      </View>
      <View style={styles.words}>
        <Txt variant="label" numberOfLines={2}>
          {datasetName(dataset.id) ?? dataset.name}
        </Txt>
        <Txt variant="small" tone="soft">
          {t('home.rowsCols', { rows: numbers.count(dataset.data.length), cols: numbers.count(dataset.columns.length) })}
        </Txt>
      </View>
      <Button variant="plain" size="sm" label={t('common.changeFile')} onPress={() => router.navigate('/')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  // The sunk tile that holds the file's icon.
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Takes the room that is left, so a long name wraps inside it.
  words: { flex: 1 },
});
