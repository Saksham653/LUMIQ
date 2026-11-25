import type { ReactNode } from 'react';

import { useLocalT } from '@/i18n/local';
import { useT } from '@/state/app-state';
import { Card } from '@/ui/card';
import type { IconName } from '@/ui/icon-set';
import { List, ListRow } from '@/ui/list';
import { Section } from '@/ui/section';
import { SkeletonCard, SkeletonRow } from '@/ui/skeleton';
import { Txt } from '@/ui/text';
import type { InsightView } from '@/utils/insight-text';

import { INSIGHTS_STRINGS } from './strings';

// Each finding's icon, from the kind of finding (the first part of its id:
// "top-0", "trend_up-1", "unusual-2"). The one kind that needs a look, an
// unusual number, carries the warning sign; "look here" is said by the icon
// and the words, never by a colour.
function iconFor(insight: InsightView): IconName {
  if (insight.id.startsWith('unusual')) return 'warning';
  if (insight.id.startsWith('trend')) return 'chart-line';
  return 'chart-bar';
}

export type NoticedProps = {
  // The findings in the app's words, or null while they are being worked out.
  items: InsightView[] | null;
  // Opens Ask.
  onAsk: () => void;
};

// "What LUMIQ noticed": the findings the shared engine already makes (the
// same rules as the web app), as a short list. Each row opens Ask, to ask
// about it in your own words.
export function Noticed({ items, onAsk }: NoticedProps) {
  const t = useT();
  const tl = useLocalT(INSIGHTS_STRINGS);

  let body: ReactNode;
  if (items === null) {
    // The shape of two findings while they are worked out.
    body = (
      <SkeletonCard label={tl('working')} delay={0}>
        <SkeletonRow />
        <SkeletonRow />
      </SkeletonCard>
    );
  } else if (items.length === 0) {
    body = (
      <Card>
        <Txt tone="soft">{t('insights.nothingNoticed')}</Txt>
      </Card>
    );
  } else {
    body = (
      <List>
        {items.map((insight) => (
          <ListRow
            key={insight.id}
            icon={iconFor(insight)}
            title={insight.title}
            subtitle={insight.body}
            chevron
            accessibilityLabel={`${insight.title}. ${insight.body}`}
            accessibilityHint={tl('opensAsk')}
            onPress={onAsk}
          />
        ))}
      </List>
    );
  }

  return <Section title={t('insights.noticed')}>{body}</Section>;
}
