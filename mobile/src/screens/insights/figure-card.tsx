import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { space } from '@/theme';
import { Card } from '@/ui/card';
import { Numeral } from '@/ui/numeral';
import { Txt } from '@/ui/text';

// A figure as the app writes it, in parts: the currency sign, the digits and
// the unit ("₹" + "46.8" + "लाख"). The digits are "—" when it is not known.
export type FigureParts = { prefix: string; number: string; suffix: string };

export type FigureCardProps = {
  // What the figure is: "Total", "Highest".
  label: string;
  parts: FigureParts;
  // The plain line of proof, how it was worked out: "All 12 values added
  // up", "Total ÷ 12".
  proof: string;
  // hero for the one figure that answers first, medium for the rest.
  size?: 'hero' | 'medium';
  // The digits roll into place: only on the first look at a file.
  roll?: boolean;
  // Layout only.
  style?: StyleProp<ViewStyle>;
};

// One figure on a card: its name, the number in the figures face with its
// unit small and soft beside it, and the line that says how the phone worked
// it out. These are numbers the phone simply worked out, so there is no band
// and no stamp (brand spec, section 3): only the line of proof, in small soft
// ink. To a screen reader the card is one phrase.
export function FigureCard({ label, parts, proof, size = 'medium', roll = false, style }: FigureCardProps) {
  const unit = parts.suffix.trim();
  const spoken = `${parts.prefix}${parts.number}${unit === '' ? '' : ` ${unit}`}`;
  return (
    <Card style={[styles.card, style]} accessible accessibilityLabel={`${label}: ${spoken}. ${proof}`}>
      <Txt variant="small" tone="soft">
        {label}
      </Txt>
      <Numeral
        value={parts.number}
        prefix={parts.prefix}
        unit={parts.suffix}
        size={size}
        entrance={roll ? 'roll' : 'none'}
      />
      <Txt variant="small" tone="soft">
        {proof}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs },
});
