import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { hapticSelection } from '@/components/haptics';
import { RadioMark } from '@/screens/more/parts';
import { useAppState, useT } from '@/state/app-state';
import { rhythm, space, useTheme } from '@/theme';
import { List, ListRow } from '@/ui/list';
import { VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';
import type { DefaultCurrency } from '@/utils/settings-file';

const CHOICES: (DefaultCurrency | null)[] = [null, 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'ILS'];

// A native sheet: the currency for amount columns of files that show none,
// or plain numbers. Picking one closes the sheet. Nothing is ever converted.
export function CurrencySheet() {
  const { colors } = useTheme();
  const t = useT();
  const { defaultCurrency, setDefaultCurrency } = useAppState();

  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={styles.content}>
      <VStack gap="xs" px="xs">
        <Txt variant="heading" accessibilityRole="header">
          {t('numbers.pickCurrency')}
        </Txt>
        <Txt variant="small" tone="soft">
          {t('numbers.noneNote')}
        </Txt>
      </VStack>
      {/* On a sheet the list keeps only its edge: the sheet is its paper. */}
      <List variant="flat" role="radiogroup" accessibilityLabel={t('numbers.pickCurrency')}>
        {CHOICES.map((choice) => {
          const selected = choice === defaultCurrency;
          return (
            <ListRow
              key={choice ?? 'none'}
              leading={<RadioMark chosen={selected} />}
              title={t(choice ? `currency.${choice}` : 'currency.none')}
              role="radio"
              aria-checked={selected}
              onPress={() => {
                if (!selected) hapticSelection();
                setDefaultCurrency(choice);
                router.back();
              }}
            />
          );
        })}
      </List>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Room at the top for the sheet's grabber.
  content: { padding: rhythm.screenEdge, paddingTop: space.xxl, gap: space.lg, paddingBottom: space.huge },
});
