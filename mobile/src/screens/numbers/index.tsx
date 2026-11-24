import { formatAmount, formatNumber, resolveNumberFormat } from '@core/lib/numberFormat.js';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chevron, Group, ListRow, Radio, SectionTitle } from '@/components/grouped';
import { hapticSelection } from '@/components/haptics';
import { Numeral, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StringKey } from '@/i18n';
import { useAppState, useNumbers, useT } from '@/state/app-state';
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
  const colors = useTheme();
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
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <View style={[styles.preview, { backgroundColor: colors.card }]}>
        <AppText variant="small" tone="secondary">
          {t('numbers.preview')}
        </AppText>
        <Text
          style={[styles.previewNumber, { color: colors.text }]}
          maxFontSizeMultiplier={1.3}
          adjustsFontSizeToFit
          numberOfLines={1}>
          {numbers.number(SAMPLE, 1)}
        </Text>
        <AppText>{t('numbers.previewLine', { big: numbers.amount(1200000, PLAIN), percent: numbers.percent(45) })}</AppText>
      </View>

      <View>
        <SectionTitle title={t('numbers.format')} />
        <Group>
          <ListRow
            onPress={() => choose('auto')}
            accessibilityState={{ selected: numberStyle === 'auto' }}
            title={t('numbers.auto')}
            subtitle={t('numbers.autoDesc', { example: example('auto') })}
            trailing={<Radio selected={numberStyle === 'auto'} />}
          />
          {STYLES.map(({ style, key }) => (
            <ListRow
              key={style}
              onPress={() => choose(style)}
              accessibilityState={{ selected: numberStyle === style }}
              title={<AppText variant="label" style={styles.tabular}>{example(style)}</AppText>}
              subtitle={t(key, { example: unitsExample(style) })}
              trailing={<Radio selected={numberStyle === style} />}
            />
          ))}
        </Group>
        <AppText variant="small" tone="secondary" style={styles.note}>
          {t('numbers.digits')}
        </AppText>
      </View>

      <View>
        <SectionTitle title={t('numbers.currency')} />
        <Group>
          <ListRow title={t('numbers.fromFile')} subtitle={t('numbers.fromFileDesc')} />
          <ListRow
            onPress={() => router.push('/currency')}
            title={t('numbers.noneTitle')}
            subtitle={t('numbers.noneNote')}
            trailing={
              <View style={styles.value}>
                <AppText variant="label" tone="primary" snug>
                  {t(defaultCurrency ? `currency.${defaultCurrency}` : 'currency.none')}
                </AppText>
                <Chevron color={colors.primary} />
              </View>
            }
          />
        </Group>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.huge },
  preview: { padding: Spacing.xl, borderRadius: Radius.xxl, gap: Spacing.xs },
  previewNumber: {
    fontSize: Numeral.large + 10,
    lineHeight: Math.round((Numeral.large + 10) * 1.2),
    fontWeight: '800',
    letterSpacing: -0.9,
    fontVariant: ['tabular-nums'],
  },
  tabular: { fontVariant: ['tabular-nums'] },
  note: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
  value: { flexDirection: 'row', alignItems: 'center', gap: 2, maxWidth: '45%' },
});
