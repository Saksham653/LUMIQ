import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { Group, IconCircle, ListRow } from '@/components/grouped';
import { PrivacyNote } from '@/components/privacy-note';
import { CSS_EASE_OUT } from '@/constants/motion';
import { Motion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';
import { brand } from '@/theme';

// Hidden from screen readers: the browser takes aria-hidden; a phone's SVG
// view needs the two older props.
const SILENT =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

// The logo, drawn here so it looks the same before any image has loaded. The
// numbers are the brand's own (brand/mark.svg, app-icon.svg, wordmark.svg):
// do not edit one without changing the brand.

// The side of the blue tile on this screen.
const TILE = 96;
// The mark is drawn on a grid of 48: an L (two edges of a spreadsheet cell,
// the two axes of a chart) and a sun (the number the phone has checked).
const MARK_GRID = 48;
const MARK_L =
  'M10 8H15A2 2 0 0 1 17 10V19A12 12 0 0 0 29 31H38A2 2 0 0 1 40 33V38A2 2 0 0 1 38 40H13A5 5 0 0 1 8 35V10A2 2 0 0 1 10 8Z';
const MARK_SUN = 'M37 19A8 8 0 1 1 21 19A8 8 0 0 1 37 19Z';
// On its tile the mark sits 1.5 units right and 1.5 up of centre, where it
// looks centred (an L is heavy at the bottom left). The tile's corner is 22.5
// percent of its width.
const MARK_SHIFT = 1.5;
const TILE_CORNER = MARK_GRID * 0.225;

// The name: five drawn letters in a box of 150 by 40, the letters 32 high,
// one path each. The Q is a ring crossed by a short tail that ends in a round
// dot; the tail is part of the letter and is never given a colour of its own.
const NAME_BOX = { width: 150, height: 40 };
const NAME_LETTERS = [
  'M0 5.5A1.5 1.5 0 0 1 1.5 4L5.5 4A1.5 1.5 0 0 1 7 5.5L7 29L16.5 29A1.5 1.5 0 0 1 18 30.5L18 34.5A1.5 1.5 0 0 1 16.5 36L4 36A4 4 0 0 1 0 32Z',
  'M23.5 4H27.5A1.5 1.5 0 0 1 29 5.5V23.5A6.5 6.5 0 0 0 42 23.5V5.5A1.5 1.5 0 0 1 43.5 4H47.5A1.5 1.5 0 0 1 49 5.5V23.5A13.5 13.5 0 0 1 22 23.5V5.5A1.5 1.5 0 0 1 23.5 4Z',
  'M56.5 5.5A1.5 1.5 0 0 1 58 4L64.27 4A1 1 0 0 1 65.17 4.57L73.96 22.87A.6 .6 0 0 0 75.04 22.87L83.83 4.57A1 1 0 0 1 84.73 4L91 4A1.5 1.5 0 0 1 92.5 5.5L92.5 34.5A1.5 1.5 0 0 1 91 36L87 36A1.5 1.5 0 0 1 85.5 34.5L85.5 15.87L76.06 35.55A.8 .8 0 0 1 75.34 36L73.66 36A.8 .8 0 0 1 72.94 35.55L63.5 15.87L63.5 34.5A1.5 1.5 0 0 1 62 36L58 36A1.5 1.5 0 0 1 56.5 34.5Z',
  'M100 5.5A1.5 1.5 0 0 1 101.5 4L105.5 4A1.5 1.5 0 0 1 107 5.5L107 34.5A1.5 1.5 0 0 1 105.5 36L101.5 36A1.5 1.5 0 0 1 100 34.5Z',
  'M139.79 34.24A17 17 0 1 1 144.74 29.29L148.96 33.51A3.5 3.5 0 0 1 148.96 38.46A3.5 3.5 0 0 1 144.01 38.46ZM139.6 24.15A10 10 0 1 0 134.65 29.1L133.33 27.78A1.5 1.5 0 0 1 133.33 25.66L136.16 22.83A1.5 1.5 0 0 1 138.28 22.83Z',
];
// The name on this screen: its box 135 by 36, so its letters are 28.8 high.
const NAME_SCALE = 0.9;

// The mark on its blue tile. The tile and the sun keep their own colours in
// light and in dark (the one place the yellow sits beside the blue).
function LogoTile() {
  return (
    <Svg
      width={TILE}
      height={TILE}
      viewBox={`${-MARK_SHIFT} ${MARK_SHIFT} ${MARK_GRID} ${MARK_GRID}`}
      {...SILENT}>
      <Rect x={-MARK_SHIFT} y={MARK_SHIFT} width={MARK_GRID} height={MARK_GRID} rx={TILE_CORNER} fill={brand.tile} />
      <Path d={MARK_L} fill={brand.onTile} />
      <Path d={MARK_SUN} fill={brand.sun} />
    </Svg>
  );
}

// The drawn name, in one colour (ink). It reads out as the app's name.
function LogoName({ color }: { color: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="LUMIQ" style={styles.name}>
      <Svg
        width={NAME_BOX.width * NAME_SCALE}
        height={NAME_BOX.height * NAME_SCALE}
        viewBox={`0 0 ${NAME_BOX.width} ${NAME_BOX.height}`}>
        {NAME_LETTERS.map((d) => (
          <Path key={d} d={d} fill={color} />
        ))}
      </Svg>
    </View>
  );
}

// First launch: what LUMIQ does in three steps, then start with a sample
// file or your own. Nothing to sign up for. The language is English unless
// changed under More, so nothing is asked here.
// The one long moment in the app: the mark on its tile settles (0.95 → 1),
// then the rest appears, all within 1.2 s. A tap anywhere skips it; with
// reduced motion everything is simply there.
export function Welcome() {
  const colors = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const { completeOnboarding, setActiveDatasetId } = useAppState();
  const { importFile } = useDatasets();
  const [skipped, setSkipped] = useState(false);
  const animate = !reduced && !skipped;

  const steps: { icon: IconName; title: string; desc: string }[] = [
    { icon: { ios: 'doc.text', android: 'description' }, title: t('welcome.step1.title'), desc: t('welcome.step1.desc') },
    { icon: { ios: 'chart.bar', android: 'bar_chart' }, title: t('welcome.step2.title'), desc: t('welcome.step2.desc') },
    {
      icon: { ios: 'bubble.left.and.bubble.right', android: 'forum' },
      title: t('welcome.step3.title'),
      desc: t('welcome.step3.desc'),
    },
  ];

  // The small shop's two months of sales: the sample closest to the people
  // trying the app (rupees, UPI, the festival rush).
  const startWithSample = () => {
    setActiveDatasetId('sample:shop');
    completeOnboarding();
  };

  // Straight to the phone's file picker; Home appears behind it.
  const openOwnFile = () => {
    completeOnboarding();
    void importFile();
  };

  const appear = (delay: number) =>
    animate
      ? {
          animationName: { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
          animationDuration: Motion.slow,
          animationDelay: delay,
          animationTimingFunction: CSS_EASE_OUT,
          animationFillMode: 'both' as const,
        }
      : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Any touch skips the opening moment and shows everything at once. */}
      <ScrollView contentContainerStyle={styles.content} onTouchStart={() => setSkipped(true)}>
        <Animated.View style={styles.hero}>
          <Animated.View
            style={[
              styles.logo,
              animate
                ? {
                    animationName: { from: { opacity: 0, transform: [{ scale: 0.95 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } },
                    animationDuration: 600,
                    animationTimingFunction: CSS_EASE_OUT,
                    animationFillMode: 'both',
                  }
                : null,
            ]}>
            <LogoTile />
          </Animated.View>
          <Animated.View style={[styles.heroText, appear(450)]}>
            <LogoName color={colors.text} />
            <AppText variant="display" style={styles.center} accessibilityRole="header">
              {t('welcome.title')}
            </AppText>
            <AppText tone="secondary" style={styles.center}>
              {t('welcome.subtitle')}
            </AppText>
          </Animated.View>
        </Animated.View>

        <Animated.View style={appear(650)}>
          <Group>
            {steps.map((step) => (
              <ListRow
                key={step.title}
                icon={<IconCircle icon={step.icon} />}
                title={step.title}
                subtitle={step.desc}
                accessibilityLabel={`${step.title}. ${step.desc}`}
              />
            ))}
          </Group>
        </Animated.View>

        <Animated.View style={[styles.actions, appear(800)]}>
          <BigButton label={t('welcome.trySample')} onPress={startWithSample} />
          <BigButton variant="tonal" label={t('welcome.openFile')} onPress={openOwnFile} />
          <PrivacyNote text={t('privacy.welcome')} />
          <AppText variant="small" tone="tertiary" style={styles.center}>
            {t('welcome.languageHint')}
          </AppText>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.xxxl },
  hero: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.xxl },
  logo: { width: TILE, height: TILE },
  name: { marginBottom: Spacing.sm },
  heroText: { alignItems: 'center', gap: Spacing.sm, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  actions: { gap: Spacing.md },
});
