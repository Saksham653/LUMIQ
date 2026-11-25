import { useEffect, useId, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  border,
  brand,
  fade,
  launchTimeline,
  rise,
  spring,
  stagger,
  timing,
  useIsRTL,
  useReducedMotion,
  useTheme,
} from '@/theme';
import { LOGO_ART, Wordmark } from '@/ui/logo';

// The launch moment (brand spec, section 7, "Launch"): a layer over the app
// that turns the phone's start screen into Home. Every time in it comes from
// launchTimeline in the theme; none is typed here.
//
// The start screen the phone shows is the ground with the tile and the still
// L, no sun, the tile in the middle of the screen. This layer's first frame
// is the same picture in the same place, so nothing jumps when the app takes
// over. Then:
//
//   full   the first open, about 1.6 s
//     0 to 500      the name rises under the tile, letter by letter
//     500 to 820    the highlight crosses the name: the band of a checked
//                   number, with its line, the letters over it in onLight
//     900 to 1100   the highlight leaves
//     1100 to 1600  the sun rises out of the corner of the L and settles with
//                   the one bounce. Nothing else: no ring, no rays
//   short  every later open, about half a second: only the sun coming on
//
// After that the layer fades away in 200 ms and `onDone` is called: Home's
// rows may start to arrive. No sound and no haptic.
//
// When the phone asks for less motion nothing moves: the last frame is shown
// (the sun already on) and the layer fades away.
//
// The gate (expo-animation): rare, first-time tier, the one place the app
// spends delight; purpose, to prevent a jarring change from start screen to
// app. Transform and opacity on views, all on the UI thread; the one animated
// SVG prop is the optional drawing of the L.
//
// How to mount it: last in the root layout, over everything (the status bar's
// strip included, or the tile will not sit where the start screen put it),
// once per start.
//   <LaunchMoment
//     mode={firstOpen ? 'full' : 'short'}
//     playing={startScreenGone}
//     onReady={hideStartScreen}
//     onDone={() => setLaunched(true)}
//   />
// It fills its parent. While it is on screen it takes every touch, so nobody
// presses a Home they cannot see; a screen reader passes straight through it
// to Home. Mount it with its mode and leave the mode alone: to play it again,
// give it a new `key`.

export type LaunchMomentMode = 'full' | 'short';

export type LaunchMomentProps = {
  // full: the first open, the whole sequence. short: every later open, only
  // the sun coming on. Default full.
  mode?: LaunchMomentMode;
  // false holds the first frame, the same picture as the phone's start
  // screen, until that screen has gone. Once it has started it runs to its
  // end whatever this says next. Default true.
  playing?: boolean;
  // The first frame is laid out: the phone's start screen can be hidden now.
  onReady?: () => void;
  // Called once, when the layer has gone. It then draws nothing, so it may
  // stay mounted.
  onDone?: () => void;
  // The L draws itself in one stroke, top to corner to right, while the name
  // rises (full only). Off by default, and off whenever a start screen came
  // first: that screen already shows the whole L, and an L that vanished to be
  // drawn again would be the jump this layer exists to prevent. For places
  // with no start screen before them: the browser preview, a replay on the
  // welcome screen.
  drawMark?: boolean;
  // The side of the tile in dp. It must equal the tile on the phone's start
  // screen (112). The name, its highlight and the gaps keep their proportions
  // to it. Never under 48: a smaller tile holds another drawing.
  tileSize?: number;
  // Asks for stillness whatever the phone's setting is: the last frame, then
  // the fade. For the gallery; an app leaves it out and the phone decides.
  reduced?: boolean;
  // Layout only. Merged last.
  style?: StyleProp<ViewStyle>;
};

// --- The picture ---------------------------------------------------------------

// The stacked logo of the launch (brand spec, sections 2 and 7): a tile of
// 112, and under it the name at the size it is drawn (150 by 40, its letters
// 32 high), 16 below the tile. The highlight covers the name's box with 12
// more on each side and 4 more above and below. Every length here is measured
// under a tile of 112 and scales with the tile.
const TILE = 112;
const NAME_GAP = 16;
const BAND_PAD_X = 12;
const BAND_PAD_Y = 4;
// The highlight is the band under a checked number itself (brand spec,
// sections 6 and 11): top corners 6, foot corners 2, and the 2 line at its
// foot. These are the band's own and do not scale.
const BAND_TOP_RADIUS = 6;
const BAND_FOOT_RADIUS = 2;
const BAND_LINE = border.strong;

// How the parts fade while they move, as on the brand board. A letter is fully
// there when it has risen five eighths of the way, the sun a third of the way
// in: a slow fade would leave ghosts on the long tail of a spring.
const LETTER_FADE_LEAD = 1.6;
const SUN_FADE_LEAD = 3;

// The pen that draws the L: one stroke down the upright, round the corner and
// along the foot. The corner is an arc about the sun's own centre (29, 19),
// like the inside corner of the L, so the pen's leading edge swings round the
// sun. The stroke is wider than the L and is cut to the L's exact outline, so
// what appears is the real shape and never an approximation of it. Width 24
// reaches the L's outside corner (27.7 from the sun's centre) with room to
// spare and stays clear of the centre itself.
const PEN_PATH = 'M12.5 8V19A16.5 16.5 0 0 0 29 35.5H40';
const PEN_WIDTH = 24;
// Two straight runs of 11 and a quarter turn of radius 16.5.
const PEN_LENGTH = 22 + (Math.PI * 16.5) / 2;
// One dash a little longer than the path, then a gap longer than both, so
// the far end is covered and no second dash can show, however a phone
// measures the curve.
const PEN_DASH = PEN_LENGTH + 1;
const PEN_DASHES = [PEN_DASH, PEN_DASH * 2] as const;

const AnimatedPath = Animated.createAnimatedComponent(Path);

// --- The tile's parts ----------------------------------------------------------

// The L, already there: what the phone's start screen shows. It sits where
// the logo puts it on a tile, a little right and up of centre.
function StillL() {
  return (
    <Svg width="100%" height="100%" viewBox={LOGO_ART.mark.tileViewBox} fill="none">
      <Path d={LOGO_ART.mark.l} fill={brand.onTile} />
    </Svg>
  );
}

// The L drawing itself in one stroke. When the pen has finished, the plain
// filled L takes its place, so the resting shape has the same clean edge as
// everywhere else.
function DrawnL({ started }: { started: boolean }) {
  const id = useId();
  // Only letters and digits survive, so the name is safe inside url(#...).
  const clip = `launch-l-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
  // 0 nothing drawn, 1 the whole L.
  const drawn = useSharedValue(0);

  useEffect(() => {
    if (!started) return;
    const { from, to } = launchTimeline.name;
    drawn.set(withDelay(from, withTiming(1, timing(to - from, 'standard'))));
    return () => cancelAnimation(drawn);
  }, [started, drawn]);

  const pen = useAnimatedProps(() => {
    const done = drawn.get();
    return { strokeDashoffset: PEN_DASH * (1 - done), opacity: done < 1 ? 1 : 0 };
  });
  const whole = useAnimatedProps(() => {
    return { opacity: drawn.get() < 1 ? 0 : 1 };
  });

  return (
    <Svg width="100%" height="100%" viewBox={LOGO_ART.mark.tileViewBox} fill="none">
      <Defs>
        <ClipPath id={clip}>
          <Path d={LOGO_ART.mark.l} />
        </ClipPath>
      </Defs>
      <AnimatedPath
        d={PEN_PATH}
        stroke={brand.onTile}
        strokeWidth={PEN_WIDTH}
        strokeDasharray={PEN_DASHES}
        fill="none"
        clipPath={`url(#${clip})`}
        animatedProps={pen}
      />
      <AnimatedPath d={LOGO_ART.mark.l} fill={brand.onTile} animatedProps={whole} />
    </Svg>
  );
}

type SunProps = {
  // dp per unit of the mark's 48 grid.
  unit: number;
  // When it begins, in ms after the moment starts.
  at: number;
  started: boolean;
  moves: boolean;
};

// The sun: it rises out of the corner of the L, 6 units down and left and a
// fifth of its size, and settles on `pop`, the one bounce in the app. Only
// its size overshoots; it never travels past its place.
function Sun({ unit, at, started, moves }: SunProps) {
  const { sunX, sunY, sunRadius, tileShiftX, tileShiftY } = LOGO_ART.mark;
  // 0 in the corner, 1 in place. Without motion it is on from the first frame.
  const risen = useSharedValue(moves ? 0 : 1);

  useEffect(() => {
    if (!started || !moves) return;
    risen.set(withDelay(at, withSpring(1, spring('pop'))));
    return () => cancelAnimation(risen);
  }, [started, moves, at, risen]);

  const travel = launchTimeline.sun.offset * unit;
  const small = launchTimeline.sun.scale;
  const rising = useAnimatedStyle(() => {
    const value = risen.get();
    const arrived = Math.min(Math.max(value, 0), 1);
    const away = (1 - arrived) * travel;
    return {
      opacity: Math.min(1, arrived * SUN_FADE_LEAD),
      transform: [{ translateX: -away }, { translateY: away }, { scale: small + (1 - small) * value }],
    };
  });

  // Its place on the tile: the drawing's own, moved as the logo moves it.
  const disc: ViewStyle = {
    top: (sunY + tileShiftY - sunRadius) * unit,
    insetInlineStart: (sunX + tileShiftX - sunRadius) * unit,
    width: sunRadius * 2 * unit,
    height: sunRadius * 2 * unit,
    borderRadius: sunRadius * unit,
    backgroundColor: brand.sun,
  };

  return <Animated.View style={[styles.onTile, disc, rising]} />;
}

// --- The name ------------------------------------------------------------------

type LetterProps = {
  // Its place in the name: each letter starts one beat after the one before.
  index: number;
  // Its drawing. The Q has two parts, its ring and its dot: one letter.
  paths: readonly string[];
  fill: string;
  started: boolean;
  moves: boolean;
};

// One letter of the name, in a layer the size of the whole name, so all five
// are placed by the same drawing and line up to the pixel with the highlight
// above them. It rises 12 and fades in on `settle`.
function Letter({ index, paths, fill, started, moves }: LetterProps) {
  // 0 below and unseen, 1 in place.
  const risen = useSharedValue(moves ? 0 : 1);

  useEffect(() => {
    if (!started || !moves) return;
    risen.set(withDelay(launchTimeline.name.from + index * stagger, withSpring(1, spring('settle'))));
    return () => cancelAnimation(risen);
  }, [started, moves, index, risen]);

  const rising = useAnimatedStyle(() => {
    const value = risen.get();
    return {
      opacity: Math.min(Math.max(value * LETTER_FADE_LEAD, 0), 1),
      transform: [{ translateY: (1 - value) * rise }],
    };
  });

  return (
    <Animated.View style={[styles.fill, rising]}>
      <Svg width="100%" height="100%" viewBox={LOGO_ART.wordmark.viewBox} fill="none">
        {paths.map((d, part) => (
          <Path key={part} d={d} fill={fill} />
        ))}
      </Svg>
    </Animated.View>
  );
}

type BandProps = {
  // The full width of the band: how far its window travels each way.
  travel: number;
  // The height of the letters, so the lit name matches the one under it.
  cap: number;
  padX: number;
  padY: number;
  started: boolean;
};

// The highlight crossing the name. It is the band of a checked number itself:
// `lightSoft` with the `checkedLine` line at its foot and the letters over it
// in `onLight`. It is a clipped layer moved with translate, never an animated
// width. A window slides over the name and the lit copy inside it slides back
// by the same amount, so the copy stands still and only the edge of the light
// moves. It comes in from the reading edge on `sweep` and goes out on `exit`.
// The letters never mirror; only the side the light comes from does.
function Band({ travel, cap, padX, padY, started }: BandProps) {
  const { colors } = useTheme();
  const side = useIsRTL() ? -1 : 1;
  // -1 before the name, 0 over it, 1 past it.
  const at = useSharedValue(-1);

  useEffect(() => {
    if (!started) return;
    const { sweepIn, sweepOut } = launchTimeline;
    at.set(
      withSequence(
        withDelay(sweepIn.from, withTiming(0, timing(sweepIn.to - sweepIn.from, 'sweep'))),
        withDelay(sweepOut.from - sweepIn.to, withTiming(1, timing(sweepOut.to - sweepOut.from, 'exit'))),
      ),
    );
    return () => cancelAnimation(at);
  }, [started, at]);

  const sliding = useAnimatedStyle(() => {
    const value = at.get();
    return {
      // Off the name it is not drawn at all, so no sliver of light can show
      // at an edge.
      opacity: value > -1 && value < 1 ? 1 : 0,
      transform: [{ translateX: value * travel * side }],
    };
  });
  const standing = useAnimatedStyle(() => {
    return { transform: [{ translateX: -at.get() * travel * side }] };
  });

  return (
    <View style={[styles.fill, styles.band]}>
      <Animated.View style={[styles.fill, styles.clip, sliding]}>
        <Animated.View
          style={[
            styles.fill,
            styles.ltr,
            { backgroundColor: colors.lightSoft, paddingHorizontal: padX, paddingVertical: padY },
            standing,
          ]}>
          <Wordmark color={colors.onLight} size={cap} />
          <View style={[styles.bandLine, { backgroundColor: colors.checkedLine }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

type NameProps = {
  // How much larger than the picture of 112 everything is drawn.
  scale: number;
  started: boolean;
  moves: boolean;
};

// The name under the tile, and the highlight over it. The name is one colour,
// the dot of the Q included: ink on the ground, onLight on the band.
function Name({ scale, started, moves }: NameProps) {
  const { colors } = useTheme();
  const art = LOGO_ART.wordmark;
  const width = art.width * scale;
  const padX = BAND_PAD_X * scale;
  const padY = BAND_PAD_Y * scale;

  return (
    <View style={{ paddingHorizontal: padX, paddingVertical: padY }}>
      <View style={[styles.ltr, { width, height: art.height * scale }]}>
        {art.letters.map((paths, index) => (
          <Letter key={index} index={index} paths={paths} fill={colors.ink} started={started} moves={moves} />
        ))}
      </View>
      {moves ? (
        <Band travel={width + padX * 2} cap={art.capHeight * scale} padX={padX} padY={padY} started={started} />
      ) : null}
    </View>
  );
}

// --- The moment ----------------------------------------------------------------

export function LaunchMoment({
  mode = 'full',
  playing = true,
  onReady,
  onDone,
  drawMark = false,
  tileSize = TILE,
  reduced: still = false,
  style,
}: LaunchMomentProps) {
  const { colors } = useTheme();
  const reducedByPhone = useReducedMotion();
  const moves = !(still || reducedByPhone);
  const full = mode === 'full';

  // A latch: once it has started it runs to its end.
  const [started, setStarted] = useState(playing);
  if (playing && !started) setStarted(true);
  const [gone, setGone] = useState(false);

  // The newest callbacks, kept out of the effect below so that a parent which
  // draws again never restarts the moment.
  const latest = useRef({ onReady, onDone });
  useEffect(() => {
    latest.current = { onReady, onDone };
  }, [onReady, onDone]);
  const readied = useRef(false);

  // The whole layer: 1 there, 0 gone.
  const shown = useSharedValue(1);
  // How long the picture plays before the layer leaves. Without motion there
  // is nothing to wait for.
  const wait = !moves ? 0 : full ? launchTimeline.first : launchTimeline.later;

  useEffect(() => {
    // Once gone it never plays again, so `onDone` is called exactly once.
    if (!started || gone) return;
    const finish = () => {
      setGone(true);
      latest.current.onDone?.();
    };
    // A change of opacity, so it stays when the phone asks for less motion.
    shown.set(
      withDelay(
        wait,
        withTiming(0, fade(launchTimeline.leave, 'exit'), (finished) => {
          'worklet';
          if (finished) scheduleOnRN(finish);
        }),
      ),
    );
    return () => cancelAnimation(shown);
  }, [started, gone, wait, shown]);

  const leaving = useAnimatedStyle(() => {
    return { opacity: shown.get() };
  });

  if (gone) return null;

  const ready = () => {
    if (readied.current) return;
    readied.current = true;
    latest.current.onReady?.();
  };

  // The launch uses the 48 drawing, which no tile under 48 may hold.
  const side = Math.max(tileSize, LOGO_ART.mark.box);
  const unit = side / LOGO_ART.mark.box;
  const scale = side / TILE;
  // In `short` the sun is the whole moment, so it starts at once.
  const sunAt = full ? launchTimeline.sun.from : 0;
  const tile: ViewStyle = {
    width: side,
    height: side,
    borderRadius: side * LOGO_ART.mark.tileRadius,
    backgroundColor: brand.tile,
  };

  return (
    <Animated.View
      aria-hidden
      onLayout={ready}
      style={[styles.layer, { backgroundColor: colors.ground }, style, leaving]}>
      <View style={styles.room} />
      <View style={[styles.tile, tile]}>
        {drawMark && full && moves ? <DrawnL started={started} /> : <StillL />}
        <Sun unit={unit} at={sunAt} started={started} moves={moves} />
      </View>
      {/* The highlight reaches a little above the name's box, into the gap. */}
      <View style={[styles.room, { paddingTop: (NAME_GAP - BAND_PAD_Y) * scale }]}>
        {full ? <Name scale={scale} started={started} moves={moves} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Fills what it is laid over, the tile exactly in the middle: the room
  // above the tile and the room below it share what is left equally, so the
  // name never pushes the tile off the spot the start screen put it on.
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  room: { flex: 1, alignSelf: 'stretch', alignItems: 'center' },
  // The mark never mirrors: its parts are placed from the left in every
  // language. The tile cuts the rising sun off at its own corners.
  tile: { overflow: 'hidden', direction: 'ltr' },
  onTile: { position: 'absolute' },
  // The name never mirrors either.
  ltr: { direction: 'ltr' },
  fill: { ...StyleSheet.absoluteFill },
  clip: { overflow: 'hidden' },
  // The band's own corners, which cut the light as it comes and goes.
  band: {
    overflow: 'hidden',
    borderTopStartRadius: BAND_TOP_RADIUS,
    borderTopEndRadius: BAND_TOP_RADIUS,
    borderBottomStartRadius: BAND_FOOT_RADIUS,
    borderBottomEndRadius: BAND_FOOT_RADIUS,
  },
  bandLine: { position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, bottom: 0, height: BAND_LINE },
});
