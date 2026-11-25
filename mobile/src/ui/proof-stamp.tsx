import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAppState } from '@/state/app-state';
import {
  MAX_FONT_SCALE,
  border,
  checkedTimeline,
  launchTimeline,
  lineHeightFor,
  radius,
  sizes,
  space,
  spring,
  timing,
  useReducedMotion,
  useTheme,
} from '@/theme';
import { success } from '@/ui/haptics';
import { Icon } from '@/ui/icon';
import { fillUIString, useUIStrings } from '@/ui/strings';
import { Txt } from '@/ui/text';

export type ProofStampProps = {
  // How many of the numbers in the words above matched the phone's own
  // calculation, and how many numbers there are. With no numbers at all
  // (total 0) nothing is drawn: such an answer shows its own line.
  checked: number;
  total: number;
  // The two counts as the app writes numbers, for the count line. Default:
  // plain digits.
  checkedText?: string;
  totalText?: string;
  // The whole count line, when the app needs another form of it than
  // UIStrings.checkedCount: "1 of 1 number checked on your phone".
  countLabel?: string;
  // The first line when not every number matched: what happened and what to
  // do next ("1 of the numbers above could not be matched with the
  // calculation. Check them before using them."), in the app's language.
  note?: string;
  // While the phone is still checking: the words that say so ("Checking each
  // number"). The place of the stamp is kept empty and the count shows how
  // far the check has come. Leave it out once checking has ended.
  checkingLabel?: string;
  // The check ended earlier (an answer scrolled back into view, an answer
  // from history): the stamp is simply there, with no bounce, no tap in the
  // hand and nothing read out.
  still?: boolean;
  // The 1 line above the footer, with 12 of room under it. Default true.
  // The filled note of "none matched" never has it.
  divider?: boolean;
  testID?: string;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// --- The stamp -------------------------------------------------------------------

// The sun stamp (brand spec, section 6): 28 across, a disc of radius 12 in
// the light, a 2 ring in the checked line, and a tick 2.5 wide with round
// ends. The tick is the check icon's own tick at five sixths of its size,
// 15.6 long. These sizes belong to this one drawing.
const STAMP = 28;
const DISC = 12;
const RING = border.strong;
const TICK_LINE = 2.5;
const TICK = 'M8.6 14.5l3.5 3.5 7.3-7.8';
const VIEW_BOX = `0 0 ${STAMP} ${STAMP}`;

// How the tick draws itself. Its stroke is one dash a little longer than the
// path, followed by a gap longer still, and the dash is slid along the path:
// at 0 it covers the whole tick, and slid its own length and half a line
// more it is clear of the path altogether, round end included.
const TICK_DASH = 16;
const TICK_DASHES = `${TICK_DASH} ${TICK_DASH + TICK_LINE}`;
const TICK_HIDDEN = TICK_DASH + TICK_LINE / 2;

// The stamp is the sun of the mark, and it comes on from the size the sun
// has when the launch brings it on. Never from nothing.
const FROM_SCALE = launchTimeline.sun.scale;
// The sun is at full strength a third of the way in, so it is never seen
// faint at full size.
const SOLID_BY = 1 / 3;

// The drawing never speaks: the words beside it do. The browser takes
// aria-hidden; a phone's SVG view needs the two older props.
const SILENT =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The one thing in the app that bounces. It lands once, on the pop spring,
// with one success tap in the hand; the tick starts a moment later and draws
// itself. With reduced motion, or when `still`, it is there at full size with
// its tick drawn.
function SunStamp({ still }: { still: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const atRest = still || reduced;
  // 0 before it lands, 1 at rest. On the way it passes 1 once: the bounce.
  const landed = useSharedValue(atRest ? 1 : 0);
  // How much of the tick is drawn, 0 to 1.
  const drawn = useSharedValue(atRest ? 1 : 0);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    // One tap for the whole check, as the stamp lands. Reduced motion does
    // not silence it.
    if (!still) success();
    if (atRest) return;
    landed.set(withSpring(1, spring('pop')));
    drawn.set(withDelay(checkedTimeline.tickDelay, withTiming(1, timing(checkedTimeline.tickDraw))));
  }, [still, atRest, landed, drawn]);

  const landing = useAnimatedStyle<ViewStyle>(() => {
    const progress = landed.get();
    return {
      opacity: Math.min(Math.max(progress / SOLID_BY, 0), 1),
      transform: [{ scale: FROM_SCALE + (1 - FROM_SCALE) * progress }],
    };
  });
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: TICK_HIDDEN * (1 - drawn.get()) }));

  return (
    <Animated.View style={[styles.stamp, landing]}>
      <Svg width={STAMP} height={STAMP} viewBox={VIEW_BOX} fill="none" {...SILENT}>
        <Circle
          cx={STAMP / 2}
          cy={STAMP / 2}
          r={DISC}
          fill={colors.light}
          stroke={colors.checkedLine}
          strokeWidth={RING}
        />
        <AnimatedPath
          d={TICK}
          stroke={colors.onLight}
          strokeWidth={TICK_LINE}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={TICK_DASHES}
          animatedProps={tickProps}
        />
      </Svg>
    </Animated.View>
  );
}

// --- The footer ------------------------------------------------------------------

// checking  the phone is still working through the numbers.
// all       every number matched: the stamp.
// some      at least one did not: the warning sign and a plain line.
// none      not one matched: the warning sign in a filled warning note.
// The three results are told apart by shape, not only by their digits.
type Outcome = 'checking' | 'all' | 'some' | 'none';

function outcomeOf(matched: number, total: number, checkingLabel: string | undefined): Outcome | null {
  // No numbers, nothing to count: the stamp is never given for an empty
  // check.
  if (!Number.isFinite(total) || total <= 0) return null;
  if (checkingLabel !== undefined && checkingLabel !== '') return 'checking';
  if (matched >= total) return 'all';
  return matched <= 0 ? 'none' : 'some';
}

// The line under words the app wrote, saying what the phone's own check of
// their numbers found (brand spec, section 11):
//   <ProofStamp checked={4} total={4} checkedText={numbers.count(4)} totalText={numbers.count(4)} />
//   <ProofStamp checked={3} total={4} note={t('ask.someUnmatched', { n: 1 })} />
//   <ProofStamp checked={done} total={4} checkingLabel={t('ask.checking')} />
//
// The count is always there. The stamp is earned: it shows only when every
// number matched, and it lands once. "Could not be matched" is the warning
// colour with the warning sign; when nothing matched the whole footer is a
// filled warning note. When checking ends the result is read out once.
//
// Its own words come from UIStrings (allChecked, checkedCount).
//
// Needs AppStateProvider above it.
export function ProofStamp({
  checked,
  total,
  checkedText,
  totalText,
  countLabel,
  note,
  checkingLabel,
  still = false,
  divider = true,
  testID,
  style,
}: ProofStampProps) {
  const { colors } = useTheme();
  const { language } = useAppState();
  const { fontScale } = useWindowDimensions();
  const strings = useUIStrings();

  // Never more than there are, never less than none.
  const matched = Math.min(Math.max(Number.isFinite(checked) ? Math.floor(checked) : 0, 0), Math.max(total, 0));
  const outcome = outcomeOf(matched, total, checkingLabel);

  const count =
    countLabel ??
    fillUIString(strings.checkedCount, {
      checked: checkedText ?? String(matched),
      total: totalText ?? String(total),
    });
  const first = outcome === 'checking' ? checkingLabel : outcome === 'all' ? strings.allChecked : note;
  const lead = first === undefined || first === '' ? null : first;

  // When checking ends the footer is read out once: the first line, then the
  // count. The count rising while the phone checks is not read out.
  const said = outcome === null || outcome === 'checking' ? '' : lead === null ? count : `${lead} ${count}`;
  useEffect(() => {
    // Android and the browser read a live region out by themselves. An iPhone
    // has to be told.
    if (Platform.OS === 'ios' && !still && said !== '') AccessibilityInfo.announceForAccessibility(said);
  }, [said, still]);

  if (outcome === null) return null;

  const unsure = outcome === 'some' || outcome === 'none';
  // The mark is centred on the first line of words, whatever the script and
  // however large the phone sets its text. A line shorter than the stamp is
  // moved down to the stamp's middle.
  const firstLine = Math.round(lineHeightFor('label', language, lead ?? count) * Math.min(fontScale, MAX_FONT_SCALE));
  const slot = Math.max(STAMP, firstLine);
  const nudge = Math.max(0, (STAMP - firstLine) / 2);

  return (
    <View
      testID={testID}
      style={[
        styles.footer,
        outcome === 'none'
          ? [styles.note, { backgroundColor: colors.warnSoft }]
          : divider
            ? [styles.ruled, { borderTopColor: colors.line }]
            : null,
        style,
      ]}>
      {/* While the phone checks, the stamp's place is kept empty: the words do not move when it lands. */}
      <View aria-hidden style={[styles.slot, { height: slot }]}>
        {outcome === 'all' ? <SunStamp still={still} /> : null}
        {unsure ? <Icon name="warning" size={sizes.icon} color={colors.warn} /> : null}
      </View>
      {/* One stop for a screen reader: the first line, then the count. */}
      <View
        accessible
        aria-live={outcome === 'checking' ? undefined : 'polite'}
        style={[styles.words, { paddingTop: nudge }]}>
        {lead === null ? null : <Txt variant="label">{lead}</Txt>}
        <Txt variant={lead === null ? 'label' : 'small'} color={unsure ? colors.warn : colors.inkSoft}>
          {count}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The mark and the words beside it, lined up at the top so long words wrap
  // under their own first line. The board's 10 between them is 12 on the
  // spacing scale.
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  // The rule that parts the footer from the words above it.
  ruled: { borderTopWidth: border.hairline, paddingTop: space.md },
  // None matched: a warning note, corner `control`, 12 inside (brand spec,
  // section 11).
  note: { padding: space.md, borderRadius: radius.control },
  // Holds the mark in the middle of the first line.
  slot: { width: STAMP, alignItems: 'center', justifyContent: 'center' },
  // Takes the room that is left, so long words wrap inside it.
  words: { flex: 1, gap: space.xs },
  stamp: { width: STAMP, height: STAMP },
});
