import { Host, Slider } from '@expo/ui';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ChoiceChips } from '@/components/choice-chips';
import { hapticSelection } from '@/components/haptics';
import { Numeral, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNumbers } from '@/state/app-state';
import { figureFont } from '@/theme';

const MIN = -50;
const MAX = 50;
const PRESETS = [-20, -10, 5, 10, 20, 50];

// "By how much?": the change as a big numeral in the figures face (always in
// ink, a fall as much as a rise), the phone's own slider from
// -50% to +50% snapping to steps of 5 with a selection haptic at every
// step, and one-tap presets for the usual changes.
export function PercentPicker({
  value,
  onChange,
  description,
  sliderLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  description: string;
  sliderLabel: string;
}) {
  const colors = useTheme();
  const numbers = useNumbers();
  const last = useRef(value);

  const step = (next: number) => {
    const rounded = Math.round(next / 5) * 5;
    if (rounded === last.current) return;
    last.current = rounded;
    hapticSelection();
    onChange(rounded);
  };

  return (
    <View style={styles.wrap}>
      <Text
        style={[styles.big, { color: colors.text }]}
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={1.3}>
        {numbers.signedPercent(value)}
      </Text>
      <AppText tone="secondary" style={styles.center}>
        {description}
      </AppText>
      <View accessible accessibilityLabel={sliderLabel} accessibilityValue={{ text: numbers.signedPercent(value) }}>
        <Host matchContents={{ vertical: true }} seedColor={colors.primary} style={styles.slider}>
          <Slider value={value} min={MIN} max={MAX} step={5} onValueChange={step} />
        </Host>
        {/* The phone's slider mirrors in Hebrew (lowest at the right), so its
            scale mirrors with it; each label itself still reads left to right. */}
        <View style={styles.ends}>
          <AppText variant="small" tone="secondary">
            {numbers.signedPercent(MIN)}
          </AppText>
          <AppText variant="small" tone="secondary">
            {numbers.percent(0)}
          </AppText>
          <AppText variant="small" tone="secondary">
            {numbers.signedPercent(MAX)}
          </AppText>
        </View>
      </View>
      <ChoiceChips
        choices={PRESETS.map((preset) => ({ value: String(preset), label: numbers.signedPercent(preset) }))}
        selected={PRESETS.includes(value) ? String(value) : null}
        onSelect={(preset) => {
          last.current = Number(preset);
          onChange(Number(preset));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  big: {
    textAlign: 'center',
    alignSelf: 'stretch',
    // The sign and the percent mark are part of the number: the same face.
    ...figureFont(),
    fontSize: Numeral.hero,
    lineHeight: Math.round(Numeral.hero * 1.15),
  },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  slider: { alignSelf: 'stretch' },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
