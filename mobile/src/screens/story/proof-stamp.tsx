import { Platform } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { border, useTheme, type Palette } from '@/theme';

// The checked stamp (brand spec, sections 4 and 6): 28 across, a disc of
// radius 12 in the light with its 2 ring, and the tick of the `check` icon at
// five sixths of its size, 2.5 wide with round ends. It is the sun: it stands
// only under words whose every number the phone has checked, and it never
// flips in right-to-left languages.
const STAMP = 28;
const DISC = 12;
const TICK = 'M8.6 14.5l3.5 3.5 7.3-7.8';
const TICK_LINE = 2.5;

// The stamp never speaks: the counted line beside it does.
const SILENT =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

// `size` and `palette` are for the shared picture, which draws the stamp
// larger and always on light paper; on screen both are left out.
export function ProofStamp({ size = STAMP, palette }: { size?: number; palette?: Palette } = {}) {
  const theme = useTheme();
  const colors = palette ?? theme.colors;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${STAMP} ${STAMP}`} fill="none" {...SILENT}>
      <Circle
        cx={STAMP / 2}
        cy={STAMP / 2}
        r={DISC}
        fill={colors.light}
        stroke={colors.checkedLine}
        strokeWidth={border.strong}
      />
      <Path
        d={TICK}
        stroke={colors.onLight}
        strokeWidth={TICK_LINE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
