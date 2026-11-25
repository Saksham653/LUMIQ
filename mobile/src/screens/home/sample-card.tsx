import type { SampleKey } from '@/data/samples';
import type { IconName } from '@/ui/icon-set';
import { ListRow } from '@/ui/list';
import { Txt } from '@/ui/text';

import { OpenTile } from './open-tile';

// An icon of the family for each sample file (never emoji).
const SAMPLE_ICON: Record<SampleKey, IconName> = {
  sales: 'currency',
  marketing: 'chart-line',
  churn: 'chart-bar',
};

// One sample file as a row of the samples list: its name, what it holds and
// its size. The one that is open now shows the filled tile with a tick.
export function SampleRow({
  sampleKey,
  name,
  description,
  meta,
  selected,
  selectedLabel,
  onPress,
}: {
  sampleKey: SampleKey;
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
      icon={selected ? undefined : SAMPLE_ICON[sampleKey]}
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
