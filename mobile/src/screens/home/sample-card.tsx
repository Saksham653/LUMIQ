import { AppIcon, type IconName } from '@/components/app-icon';
import { Chevron, IconCircle, ListRow } from '@/components/grouped';
import type { SampleKey } from '@/data/samples';
import { useTheme } from '@/hooks/use-theme';

// A symbol for each sample file (system icons, never emoji).
const SAMPLE_ICON: Record<SampleKey, IconName> = {
  sales: { ios: 'cart', android: 'shopping_cart' },
  marketing: { ios: 'megaphone', android: 'campaign' },
  churn: { ios: 'person.2', android: 'group' },
};

// One sample file as a row of the samples group: its name, what it holds and
// its size; the open one shows a check instead of a chevron.
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
  const colors = useTheme();
  return (
    <ListRow
      onPress={onPress}
      accessibilityLabel={`${name}. ${description}. ${meta}${selected ? `. ${selectedLabel}` : ''}`}
      accessibilityState={{ selected }}
      icon={<IconCircle icon={SAMPLE_ICON[sampleKey]} color={colors.textSecondary} />}
      title={name}
      subtitle={description}
      detail={meta}
      trailing={
        selected ? (
          <AppIcon name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} size={24} color={colors.success} />
        ) : (
          <Chevron />
        )
      }
    />
  );
}
