import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

// The LUMIQ spot drawings: small pictures for the screens that have nothing
// else to show. They are drawn the way the icons are (brand spec, section 10):
// one line with round ends and round joins, no fill, and exactly one solid
// dot, the sun of the mark. Here the dot is the first value on a sheet, the
// question in a bubble, the last grain of sand.
//
// The rules:
// - Never the yellow. The light has four places and a drawing is not one of
//   them (brand spec, section 4), "all checked" included. The line is soft
//   ink and the dot is ink: "look here" is said with heavier ink.
// - A dashed line means "not here yet": the rows of an empty sheet, the answer
//   that has not been asked for.
// - No sparkles, no faces, no emoji, nothing from another brand.
// - A drawing never speaks alone: put words beside it that say what happened
//   and what to do next.
//
// HOW A DRAWING IS WRITTEN
//
//   name: { d, dashed?, dot }
//
// d       The solid lines, as SVG path data on a 96 by 96 grid, drawn 2 wide.
//         Keep the drawing inside the middle 80 (8 of padding on every side)
//         and centred on (48, 48). Several strokes go into the one string.
// dashed  Lines drawn in dashes of 4 with 5 between. An open dashed line is a
//         multiple of 9 long, less 5 (4, 13, 22, 31), so it ends on a whole
//         dash; a closed dashed shape is a multiple of 9 round, so its last
//         dash meets its first.
// dot     The one solid dot, as [cx, cy, r]. Radius 5.
//
// TO ADD A DRAWING: add one entry below in the same shape, and a named
// component at the foot of the file. Look at it at 72 and at 120, on a light
// and on a dark surface, beside the other six: same line, same corners (7 on
// a sheet), one dot.

export type IllustrationDef = {
  d: string;
  dashed?: string;
  dot: readonly [cx: number, cy: number, r: number];
};

export const ILLUSTRATIONS = {
  // No files yet: a sheet with its first value and room for more.
  'no-files': {
    d: 'M30 15H58L73 30V74a7 7 0 0 1-7 7H30a7 7 0 0 1-7-7V22a7 7 0 0 1 7-7zM58 15.5V25a5 5 0 0 0 5 5h9.5M47 46h14',
    dashed: 'M31 58h31M31 69h22',
    dot: [35.5, 46, 5],
  },
  // Empty chat: a question, and the place where its answer will be.
  'empty-chat': {
    d: 'M27 16h30a9 9 0 0 1 9 9v18a9 9 0 0 1-9 9H43L30 62.5V52h-3a9 9 0 0 1-9-9V25a9 9 0 0 1 9-9zM42 34h14',
    dashed: 'M47 62h26a7 7 0 0 1 7 7v6a7 7 0 0 1-7 7H47a7 7 0 0 1-7-7v-6a7 7 0 0 1 7-7z',
    dot: [31, 34, 5],
  },
  // Offline: the signal, crossed out.
  offline: {
    d: 'M14.06 37.06a48 48 0 0 1 67.88 0M24.67 47.67a33 33 0 0 1 46.66 0M35.27 58.27a18 18 0 0 1 25.46 0M22 18l50 58',
    dot: [48, 71, 5],
  },
  // Daily limit reached: the sand has run through. More comes tomorrow.
  'daily-limit': {
    d: 'M25 16h46M25 80h46M31 16v10c0 12 13 14 13 22s-13 10-13 22v10M65 16v10c0 12-13 14-13 22s13 10 13 22v10',
    dot: [48, 73, 5],
  },
  // Something broke: a sheet torn in two.
  'something-broke': {
    d: 'M22 41V19a7 7 0 0 1 7-7h26l15 15v9l-10 6-10-6-10 6-10-6-8 5zM55 12.5V22a5 5 0 0 0 5 5h9.5M30 25h16M25 50V77a7 7 0 0 0 7 7h34a7 7 0 0 0 7-7V45l-10 6-10-6-10 6-10-6-8 5zM49 67h14',
    dot: [37.5, 67, 5],
  },
  // All checked: a full sheet with a tick beside it. Drawn in ink like the
  // rest: the yellow stamp belongs under an answer and nowhere else. The tick
  // is the icon family's one tick (`check` in icon-set.ts) at its full size,
  // in a ring of radius 14.
  'all-checked': {
    d: 'M47 74H25a7 7 0 0 1-7-7V19a7 7 0 0 1 7-7h26l15 15v24M51 12.5V22a5 5 0 0 0 5 5h9.5M42 41h14M26 52h30M26 63h19M80 71a14 14 0 1 1-28 0a14 14 0 0 1 28 0zM59.5 71.5l4.2 4.2 8.8-9.4',
    dot: [30.5, 41, 5],
  },
} as const satisfies Record<string, IllustrationDef>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

// Every name, for a gallery or a picker.
export const ILLUSTRATION_NAMES = Object.keys(ILLUSTRATIONS) as IllustrationName[];

// The drawing grid, its line and its dashes. The line scales with the
// drawing: 2 at 96, as on a 24 icon.
const GRID = 96;
const LINE = 2;
const DASHES = '4 5';
const VIEW_BOX = `0 0 ${GRID} ${GRID}`;

export type IllustrationSize = 'sm' | 'md' | 'lg';

// The three sizes of a spot drawing, in dp (three, four and five icons wide).
// They belong to this file: nothing else is drawn at these sizes.
const SIZES: Record<IllustrationSize, number> = { sm: 72, md: 96, lg: 120 };

export type IllustrationProps = {
  name: IllustrationName;
  // sm 72, md 96 (the default), lg 120; or a number of dp. Not under 64: the
  // dashes close up.
  size?: IllustrationSize | number;
  // The line, a palette colour. Default inkSoft. On a tinted surface use the
  // colour of the text on it. Never the yellow.
  color?: string;
  // The dot, a palette colour. Default ink. Never the yellow.
  dotColor?: string;
  // What a screen reader says. Leave it out when words beside the drawing
  // already say it: then the drawing stays silent.
  label?: string;
  // Layout only (alignSelf, a margin). Merged last.
  style?: StyleProp<ViewStyle>;
};

// A drawing is silent unless it is given a label; then it is one image. The
// browser takes the aria props; a phone's SVG view needs the older ones.
function voice(label: string | undefined) {
  if (label === undefined) {
    return Platform.OS === 'web'
      ? ({ 'aria-hidden': true } as const)
      : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);
  }
  return Platform.OS === 'web'
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: label } as const);
}

// One spot drawing by name:
//   <Illustration name="no-files" />
//   <Illustration name="offline" size="lg" label={strings.offline} />
export function Illustration({ name, size = 'md', color, dotColor, label, style }: IllustrationProps) {
  const { colors } = useTheme();
  const drawing: IllustrationDef = ILLUSTRATIONS[name];
  const side = typeof size === 'number' ? size : SIZES[size];
  const line = color ?? colors.inkSoft;

  return (
    <Svg width={side} height={side} viewBox={VIEW_BOX} fill="none" style={style} {...voice(label)}>
      <Path d={drawing.d} stroke={line} strokeWidth={LINE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {drawing.dashed !== undefined ? (
        <Path
          d={drawing.dashed}
          stroke={line}
          strokeWidth={LINE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={DASHES}
          fill="none"
        />
      ) : null}
      <Circle cx={drawing.dot[0]} cy={drawing.dot[1]} r={drawing.dot[2]} fill={dotColor ?? colors.ink} />
    </Svg>
  );
}

// The same six, by name, for screens that know which one they want.
export type NamedIllustrationProps = Omit<IllustrationProps, 'name'>;

// Home before the first file is added.
export function NoFilesIllustration(props: NamedIllustrationProps) {
  return <Illustration name="no-files" {...props} />;
}

// Ask before the first question.
export function EmptyChatIllustration(props: NamedIllustrationProps) {
  return <Illustration name="empty-chat" {...props} />;
}

// Something needs the internet and there is none.
export function OfflineIllustration(props: NamedIllustrationProps) {
  return <Illustration name="offline" {...props} />;
}

// Today's free questions are used up.
export function DailyLimitIllustration(props: NamedIllustrationProps) {
  return <Illustration name="daily-limit" {...props} />;
}

// A screen could not be shown, or a file could not be opened.
export function SomethingBrokeIllustration(props: NamedIllustrationProps) {
  return <Illustration name="something-broke" {...props} />;
}

// Nothing left to fix: every check passed.
export function AllCheckedIllustration(props: NamedIllustrationProps) {
  return <Illustration name="all-checked" {...props} />;
}
