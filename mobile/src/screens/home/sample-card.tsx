import type { IconName } from '@/ui/icon-set';
import { ListRow } from '@/ui/list';
import { Txt } from '@/ui/text';

import { OpenTile } from './open-tile';

// One sample file as a row of the samples list: its name, what it holds and
// its size, with an icon of the family (never emoji). The one that is open now
// shows the filled tile with a tick.
export function SampleRow({
  icon,
  name,
  description,
  meta,
  selected,
  selectedLabel,
  onPress,
}: {
  icon: IconName;
  name: string;
  description: string;
  meta: string;
  selected: boolean;
  selectedLabel: string;
  onPress: () => void;
}) {
  return (
    <ListRow
      title={name}
      subtitle={description}
      icon={selected ? undefined : icon}
      leading={selected ? <OpenTile /> : undefined}
      chevron
      onPress={onPress}
      accessibilityLabel={`${name}. ${description}. ${meta}${selected ? `. ${selectedLabel}` : ''}`}
      aria-selected={selected}>
      <Txt variant="small" tone="soft">
        {meta}
      </Txt>
    </ListRow>
  );
}
