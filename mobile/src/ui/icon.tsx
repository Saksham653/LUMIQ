import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { sizes, useIsRTL, useTheme } from '@/theme';
import { ICONS, type IconDef, type IconName } from '@/ui/icon-set';

// The drawing grid and its line (brand spec, section 10). The line scales
// with the icon: 2 at 24, a little under at 20.
const GRID = 24;
const LINE = 2;
const VIEW_BOX = `0 0 ${GRID} ${GRID}`;

// An icon never speaks: the label beside it does. The browser takes
// aria-hidden; a phone's SVG view needs the two older props.
const SILENT =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

export type IconProps = {
  name: IconName;
  // 24 by itself or beside body text; 20 (sizes.iconSmall) beside `label` and
  // `small` text.
  size?: number;
  // A palette colour. Defaults to ink. An icon takes the colour of the text
  // beside it: ink, inkSoft, actionText, a status colour, or onAction. Never
  // the yellow.
  color?: string;
  // The colour of the surface behind the icon, for the one icon with lines
  // cut out of its dot (checked-stamp). Defaults to surface.
  knockColor?: string;
  // Layout only (a margin, alignSelf).
  style?: StyleProp<ViewStyle>;
};

// One icon of the LUMIQ family:
//   <Icon name="lock" />
//   <Icon name="chevron" size={sizes.iconSmall} color={colors.inkSoft} />
// Icons that point (back, chevron, send, undo) mirror by themselves in
// right-to-left languages; the others never flip.
export function Icon({ name, size = sizes.icon, color, knockColor, style }: IconProps) {
  const { colors } = useTheme();
  const rtl = useIsRTL();
  const icon: IconDef = ICONS[name];
  const ink = color ?? colors.ink;
  const mirrored = icon.directional === true && rtl;

  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX} fill="none" style={[mirrored && styles.mirrored, style]} {...SILENT}>
      {icon.d !== '' ? (
        <Path d={icon.d} stroke={ink} strokeWidth={LINE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ) : null}
      {icon.dot !== undefined ? <Circle cx={icon.dot[0]} cy={icon.dot[1]} r={icon.dot[2]} fill={ink} /> : null}
      {icon.knock !== undefined ? (
        <Path
          d={icon.knock}
          stroke={knockColor ?? colors.surface}
          strokeWidth={LINE}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
});
