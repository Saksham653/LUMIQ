import { StyleSheet, View } from 'react-native';

import { radius, sizes, useTheme } from '@/theme';
import { Icon } from '@/ui/icon';

// The leading tile of the file that is open now, in place of the sunk tile
// with the file's icon: what is chosen is the action fill with its mark, never
// a tint alone (brand spec, section 3). The row says "Selected" to a screen
// reader; this tile only shows it.
export function OpenTile() {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.action }]}>
      <Icon name="check" color={colors.onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The size and corner of a row's icon tile. It holds an icon, never text,
  // so it may have a fixed size.
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
