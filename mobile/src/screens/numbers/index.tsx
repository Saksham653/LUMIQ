import { formatAmount, formatNumber, resolveNumberFormat } from '@core/lib/numberFormat.js';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { hapticSelection } from '@/components/haptics';
import type { StringKey } from '@/i18n';
import { RadioMark } from '@/screens/more/parts';
import { useAppState, useNumbers, useT } from '@/state/app-state';
import { figureFont, numeralLine, numeralSize, rhythm, space, useTheme } from '@/theme';
import { Card } from '@/ui/card';
import { List, ListRow } from '@/ui/list';
import { Section } from '@/ui/section';
import { Txt } from '@/ui/text';
import type { NumberStyleChoice } from '@/utils/settings-file';

const SAMPLE = 1234567.8;
const PLAIN = { type: 'number' } as const;

const STYLES: { style: Exclude<NumberStyleChoice, 'auto'>; key: StringKey }[] = [
  { style: 'comma-dot', key: 'numbers.style.commaDot' },
  { style: 'dot-comma', key: 'numbers.style.dotComma' },
  { style: 'space-comma', key: 'numbers.style.spaceComma' },
  { style: 'indian', key: 'numbers.style.indian' },
  { style: 'cjk', key: 'numbers.style.cjk' },
];

// More > Numbers & currency. Numbers follow the language by default (digits
// always 0-9); people can pick one of five styles by hand. The currency is
// the one written in the file, never converted; for files without one, an
// optional default currency for amount columns.
export function NumbersScreen() {
  const { colors } = useTheme();
  const t = useT();
  const numbers = useNumbers();
  const { language, numberStyle, setNumberStyle, defaultCurrency } = useAppState();

  const choose = (style: NumberStyleChoice) => {
    if (style === numberStyle) return;
    hapticSelection();
    setNumberStyle(style);
  };

  // Each style shown with the same number, written its way.
  const example = (style: NumberStyleChoice) => formatNumber(SAMPLE, resolveNumberFormat(language, style));
  const unitsExample = (style: NumberStyleChoice) => {
    const format = resolveNumberFormat(language, style);
    return `${formatAmount(1200000, PLAIN, format)}, ${formatAmount(style === 'cjk' ? 120000000 : 12000000, PLAIN, format)}`;
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={styles.content}>
      <Card style={styles.preview}>
        <Txt variant="small" tone="soft">
          {t('numbers.preview')}
        </Txt>
        <Text
          style={[figureFont('600'), styles.previewNumber, { color: colors.ink }]}
          maxFontSizeMultiplier={1.3}
          adjustsFontSizeToFit
          numberOfLines={1}>
          {numbers.number(SAMPLE, 1)}
        </Text>
        <Txt>{t('numbers.previewLine', { big: numbers.amount(1200000, PLAIN), percent: numbers.percent(45) })}</Txt>
      </Card>

      <Section size="sm" title={t('numbers.format')}>
        <List role="radiogroup" accessibilityLabel={t('numbers.format')}>
          <ListRow
            leading={<RadioMark chosen={numberStyle === 'auto'} />}
            title={t('numbers.auto')}
            subtitle={t('numbers.autoDesc', { example: example('auto') })}
            role="radio"
            aria-checked={numberStyle === 'auto'}
            onPress={() => choose('auto')}
          />
          {STYLES.map(({ style, key }) => (
            <ListRow
              key={style}
              leading={<RadioMark chosen={numberStyle === style} />}
              title={example(style)}
              subtitle={t(key, { example: unitsExample(style) })}
              role="radio"
              aria-checked={numberStyle === style}
              onPress={() => choose(style)}
            />
          ))}
        </List>
        <Txt variant="small" tone="soft" style={styles.inset}>
          {t('numbers.digits')}
        </Txt>
      </Section>

      <Section size="sm" title={t('numbers.currency')}>
        <List>
          <ListRow icon="file" title={t('numbers.fromFile')} subtitle={t('numbers.fromFileDesc')} />
          <ListRow
            icon="currency"
            title={t('numbers.noneTitle')}
            subtitle={t('numbers.noneNote')}
            trailing={t(defaultCurrency ? `currency.${defaultCurrency}` : 'currency.none')}
            chevron
            onPress={() => router.push('/currency')}
          />
        </List>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: rhythm.screenEdge, gap: rhythm.sectionGap, paddingBottom: space.huge },
  preview: { gap: space.xs },
  // The brand's large numeral: 40 on a line of 44.
  previewNumber: { fontSize: numeralSize.large, lineHeight: numeralLine.large },
  // Lines the note up with the words inside the card's round corner.
  inset: { paddingHorizontal: space.xs },
});
