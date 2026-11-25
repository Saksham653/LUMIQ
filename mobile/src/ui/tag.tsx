import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { radius, sizes, space, useTheme, type Palette } from '@/theme';
import { Icon } from '@/ui/icon';
import type { IconName } from '@/ui/icon-set';
import { Txt } from '@/ui/text';

// neutral  a plain fact about something: a count, a kind, a date.
// action   something that belongs to the blue: new, chosen, yours to act on.
// good     it worked.
// warn     could not be checked, or not yet.
// bad      it failed or was refused.
// The three status tones keep their meaning everywhere in the app.
export type TagTone = 'neutral' | 'action' | 'good' | 'warn' | 'bad';

// Every View prop passes through (testID, aria-live, accessibilityLabel).
export type TagProps = Omit<ViewProps, 'style' | 'children'> & {
  // Default neutral.
  tone?: TagTone;
  // The icon beside the words. Each tone has its own; pass one to say
  // something more exact (a lock, a file).
  icon?: IconName;
  // The words, already in the app's language. `label` wins over `children`.
  label?: string;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
  // The words, in place of `label`: <Tag tone="good">{t('check.passed')}</Tag>
  children?: ReactNode;
};

// A tag is never colour alone: every tone comes with an icon, and the words
// say the rest.
const ICON: Record<TagTone, IconName> = {
  neutral: 'info',
  action: 'info',
  good: 'check',
  warn: 'warning',
  bad: 'error',
};
const FILL: Record<TagTone, keyof Palette> = {
  neutral: 'surfaceSunk',
  action: 'actionSoft',
  good: 'goodSoft',
  warn: 'warnSoft',
  bad: 'badSoft',
};
// The words and the icon share one ink.
const INK: Record<TagTone, keyof Palette> = {
  neutral: 'inkSoft',
  action: 'onActionSoft',
  good: 'good',
  warn: 'warn',
  bad: 'bad',
};

// A small label that says how something stands:
//   <Tag tone="good">{t('check.passed')}</Tag>
//   <Tag tone="warn" label={t('check.datesAsText')} />
//   <Tag icon="file">{fileKind}</Tag>
//
// Always an icon and words. It cannot be pressed. It is as wide as its words
// wherever it is put, also in a column that stretches its children, and long
// words wrap inside it; it grows with the phone's text size.
export function Tag({ tone = 'neutral', icon, label, style, children, ...rest }: TagProps) {
  const { colors } = useTheme();
  const ink = colors[INK[tone]];

  return (
    <View {...rest} style={[styles.hug, style]}>
      <View style={[styles.pill, { backgroundColor: colors[FILL[tone]] }]}>
        <Icon name={icon ?? ICON[tone]} size={sizes.iconSmall} color={ink} />
        <Txt variant="small" weight="600" color={ink} snug style={styles.words}>
          {label ?? children}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A row with nothing painted on it. In a column that stretches it, the row
  // takes the width and the pill inside keeps to its words; in a row, it is
  // only as wide as the pill.
  hug: { flexDirection: 'row', maxWidth: '100%' },
  // The icon side takes a little less room than the words side, because the
  // icon carries its own air. No fixed height: the pill grows with its text.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: space.xs,
    paddingStart: space.sm,
    paddingEnd: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  words: { flexShrink: 1 },
});
