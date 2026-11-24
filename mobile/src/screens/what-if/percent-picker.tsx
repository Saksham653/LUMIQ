import { Host, Slider } from '@expo/ui';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ChoiceChips } from '@/components/choice-chips';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signedPercent } from '@/utils/what-if';

const MIN = -50;
const MAX = 50;
const PRESETS = [-20, -10, 5, 10, 20, 50];

// "By how much?": the change in big type, a native slider from -50% to +50%
// in steps of 5, and one-tap presets for the usual changes.
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
  const tone = value > 0 ? colors.primary : value < 0 ? colors.accent : colors.textSecondary;
  return (
    <View style={styles.wrap}>
      <AppText variant="display" style={[styles.big, { color: tone }]} accessibilityLiveRegion="polite">
        {signedPercent(value)}
      </AppText>
      <AppText tone="secondary" style={styles.center}>
        {description}
      </AppText>
      <View accessible accessibilityLabel={sliderLabel} accessibilityValue={{ text: signedPercent(value) }}>
        <Host matchContents={{ vertical: true }} seedColor={colors.primary} style={styles.slider}>
          <Slider value={value} min={MIN} max={MAX} step={5} onValueChange={(next) => onChange(Math.round(next))} />
        </Host>
        <View style={styles.ends}>
          <AppText variant="small" tone="secondary">{`${MIN}%`}</AppText>
          <AppText variant="small" tone="secondary">
            0%
          </AppText>
          <AppText variant="small" tone="secondary">{`+${MAX}%`}</AppText>
        </View>
      </View>
      <ChoiceChips
        choices={PRESETS.map((preset) => ({ value: String(preset), label: signedPercent(preset) }))}
        selected={PRESETS.includes(value) ? String(value) : null}
        onSelect={(preset) => onChange(Number(preset))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  big: { textAlign: 'center', alignSelf: 'stretch', fontSize: 44, lineHeight: 56 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  slider: { alignSelf: 'stretch' },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
