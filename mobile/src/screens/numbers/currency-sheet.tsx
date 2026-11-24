import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Group, ListRow, Radio } from '@/components/grouped';
import { hapticSelection } from '@/components/haptics';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';
import type { DefaultCurrency } from '@/utils/settings-file';

const CHOICES: (DefaultCurrency | null)[] = [null, 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'ILS'];

// A native sheet: the currency for amount columns of files that show none,
// or plain numbers. Picking one closes the sheet. Nothing is ever converted.
export function CurrencySheet() {
  const colors = useTheme();
  const t = useT();
  const { defaultCurrency, setDefaultCurrency } = useAppState();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <AppText variant="heading">{t('numbers.pickCurrency')}</AppText>
      <AppText variant="small" tone="secondary">
        {t('numbers.noneNote')}
      </AppText>
      <Group>
        {CHOICES.map((choice) => {
          const selected = choice === defaultCurrency;
          return (
            <ListRow
              key={choice ?? 'none'}
              onPress={() => {
                if (!selected) hapticSelection();
                setDefaultCurrency(choice);
                router.back();
              }}
              accessibilityState={{ selected }}
              title={t(choice ? `currency.${choice}` : 'currency.none')}
              trailing={<Radio selected={selected} />}
            />
          );
        })}
      </Group>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.huge },
});
