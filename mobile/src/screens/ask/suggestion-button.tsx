import { StyleSheet } from 'react-native';

import { Chip } from '@/ui/chip';

// A ready-made question as a pill: one tap asks it, so nobody has to know
// what to type. It sits at the reading edge and is as wide as its words; a
// long question wraps inside it.
export function SuggestionRow({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  return <Chip label={text} onPress={onPress} disabled={disabled} style={styles.chip} />;
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start' },
});
