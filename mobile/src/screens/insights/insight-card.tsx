import { AppText } from '@/components/app-text';
import { IconCircle, ListRow } from '@/components/grouped';
import { useTheme } from '@/hooks/use-theme';
import type { InsightView } from '@/utils/insight-text';

// One finding in plain words, as a row of the "What LUMIQ noticed" group.
// The one kind that needs a look (an unusual number) has its icon in full
// ink; the rest are in soft ink. "Look here" is said with heavier ink, never
// with a colour.
export function InsightRow({ insight }: { insight: InsightView }) {
  const colors = useTheme();
  const needsLook = insight.tone === 'accent';
  return (
    <ListRow
      accessibilityLabel={`${insight.title}. ${insight.body}`}
      icon={
        <IconCircle
          icon={insight.icon}
          color={needsLook ? colors.text : colors.textSecondary}
        />
      }
      title={<AppText variant="label">{insight.title}</AppText>}
      subtitle={insight.body}
    />
  );
}
