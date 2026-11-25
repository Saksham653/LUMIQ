import { StyleSheet } from 'react-native';

import { useNumbers } from '@/state/app-state';
import { space } from '@/theme';
import { Card } from '@/ui/card';
import { Chip, ChipGroup } from '@/ui/chip';
import { Numeral } from '@/ui/numeral';
import { Slider } from '@/ui/slider';
import { HStack, VStack } from '@/ui/stack';
import { Txt } from '@/ui/text';

// The range and steps of the change (the same as before the rebuild).
const MIN = -50;
const MAX = 50;
const STEP = 5;
const PRESETS = [-20, -10, 5, 10, 20, 50];

// "By how much?": the change as a numeral (always in ink, a fall as much as
// a rise), what it means in words, the slider from -50% to +50% in steps of
// 5 (each step it crosses gives one selection tap in the hand; the slider
// does that itself), and one-tap chips for the usual changes.
export function PercentPicker({
  value,
  onChange,
  description,
  sliderLabel,
  presetsLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  description: string;
  sliderLabel: string;
  presetsLabel: string;
}) {
  const numbers = useNumbers();
  const written = numbers.signedPercent(value);
  const preset = PRESETS.includes(value) ? String(value) : null;

  return (
    <Card style={styles.card}>
      <Numeral value={written} size="large" align="center" accessibilityLabel={written} />
      <Txt tone="soft" align="center" style={styles.stretch}>
        {description}
      </Txt>
      <VStack gap="xs">
        <Slider
          value={value}
          onValueChange={onChange}
          min={MIN}
          max={MAX}
          step={STEP}
          accessibilityLabel={sliderLabel}
          valueText={written}
        />
        {/* The slider runs from the reading edge, so its scale mirrors with
            it in Hebrew; each figure itself still reads left to right. */}
        <HStack gap="sm" justify="between" aria-hidden>
          <Txt variant="small" tone="soft" snug>
            {numbers.signedPercent(MIN)}
          </Txt>
          <Txt variant="small" tone="soft" snug>
            {numbers.percent(0)}
          </Txt>
          <Txt variant="small" tone="soft" snug>
            {numbers.signedPercent(MAX)}
          </Txt>
        </HStack>
      </VStack>
      <ChipGroup wrap value={preset} onChange={(next) => onChange(Number(next))} accessibilityLabel={presetsLabel}>
        {PRESETS.map((step) => (
          <Chip key={step} value={String(step)} label={numbers.signedPercent(step)} />
        ))}
      </ChipGroup>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  stretch: { alignSelf: 'stretch' },
});
