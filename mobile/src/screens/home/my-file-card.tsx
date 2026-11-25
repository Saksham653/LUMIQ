import { IconButton } from '@/ui/icon-button';
import { ListRow } from '@/ui/list';

import { OpenTile } from './open-tile';

// The name of the row's second action, for a screen reader.
const DELETE_ACTION = 'delete';

// One of the person's own files as a row of the "My files" list: tap to open
// it, or the bin to delete it. The file that is open now shows the filled
// tile with a tick. The name stays on one line and loses its middle, so its
// ending and its extension stay.
export function MyFileRow({
  name,
  meta,
  selected,
  selectedLabel,
  deleteLabel,
  onOpen,
  onDelete,
}: {
  name: string;
  meta: string;
  selected: boolean;
  selectedLabel: string;
  deleteLabel: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <ListRow
      title={name}
      titleLines={1}
      subtitle={meta}
      icon={selected ? undefined : 'file'}
      leading={selected ? <OpenTile /> : undefined}
      trailing={<IconButton icon="delete" accessibilityLabel={deleteLabel} onPress={onDelete} />}
      onPress={onOpen}
      accessibilityLabel={`${name}. ${meta}${selected ? `. ${selectedLabel}` : ''}`}
      aria-selected={selected}
      // On an iPhone the row hides the bin from a screen reader, so deleting
      // is also offered as an action of the row itself.
      accessibilityActions={[{ name: DELETE_ACTION, label: deleteLabel }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === DELETE_ACTION) onDelete();
      }}
    />
  );
}
