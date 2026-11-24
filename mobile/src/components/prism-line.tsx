import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppIcon } from '@/components/app-icon';
import { CSS_EASE_OUT } from '@/constants/motion';
import { Motion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HEIGHT = 3;

function Gradient({ id }: { id: string }) {
  const colors = useTheme();
  return (
    <Svg width="100%" height={HEIGHT} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.prism[0]} />
          <Stop offset="0.5" stopColor={colors.prism[1]} />
          <Stop offset="1" stopColor={colors.prism[2]} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={HEIGHT} rx={HEIGHT / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

// LUMIQ's one signature and the app's only gradient: a thin cyan → violet →
// amber line that appears only while LUMIQ is working something out, or once
// it has verified it.
// - "working": a short stretch of light flows along the line, on a loop, for
//   as long as the real work takes (never a timer pretending to be progress).
// - "verified": the line draws across (300 ms) and ends in a small check.
// Right-to-left languages run it from the right. With reduced motion the
// flow becomes a gentle fade and the line simply appears.
export function PrismLine({ state, label }: { state: 'working' | 'verified'; label?: string }) {
  const colors = useTheme();
  const reduced = useReducedMotion();
  const mirror = I18nManager.isRTL ? styles.mirror : null;

  if (state === 'working') {
    return (
      <View style={[styles.track, mirror]} accessible accessibilityLabel={label} accessibilityRole="progressbar">
        <Animated.View
          style={[
            styles.flow,
            reduced
              ? {
                  animationName: { '0%': { opacity: 0.35 }, '50%': { opacity: 1 }, '100%': { opacity: 0.35 } },
                  animationDuration: '1600ms',
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'linear',
                }
              : {
                  // Percent translations are of the segment's own width (38% of
                  // the track): from just off the start to just past the end.
                  animationName: {
                    '0%': { transform: [{ translateX: '-100%' }] },
                    '100%': { transform: [{ translateX: '264%' }] },
                  },
                  animationDuration: '1400ms',
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'linear',
                },
          ]}>
          <Gradient id="prism-flow" />
        </Animated.View>
      </View>
    );
  }

  // In right-to-left languages the row already runs from the right, so the
  // check lands at the end on its own; only the line itself is mirrored, so
  // its colours and its drawing start from the right.
  return (
    <View style={styles.verified} accessible accessibilityLabel={label}>
      <View style={[styles.line, mirror]}>
        <Animated.View
          style={[
            styles.fill,
            reduced
              ? { animationName: { from: { opacity: 0 }, to: { opacity: 1 } }, animationDuration: Motion.base }
              : {
                  transformOrigin: 'left',
                  animationName: { from: { transform: [{ scaleX: 0 }] }, to: { transform: [{ scaleX: 1 }] } },
                  animationDuration: 300,
                  animationTimingFunction: CSS_EASE_OUT,
                  animationFillMode: 'both',
                },
          ]}>
          <Gradient id="prism-done" />
        </Animated.View>
      </View>
      <Animated.View
        style={[
          styles.check,
          { backgroundColor: colors.success },
          {
            animationName: reduced
              ? { from: { opacity: 0 }, to: { opacity: 1 } }
              : { from: { opacity: 0, transform: [{ scale: 0.6 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } },
            animationDuration: Motion.fast,
            animationDelay: reduced ? 0 : 260,
            animationTimingFunction: CSS_EASE_OUT,
            animationFillMode: 'both',
          },
        ]}>
        <AppIcon name={{ ios: 'checkmark', android: 'check' }} size={11} color={colors.onSuccess} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: HEIGHT / 2, overflow: 'hidden' },
  flow: { width: '38%', height: HEIGHT },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { flex: 1, height: HEIGHT },
  fill: { height: HEIGHT },
  check: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mirror: { transform: [{ scaleX: -1 }] },
});
