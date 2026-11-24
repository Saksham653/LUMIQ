import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { Group, IconCircle, ListRow } from '@/components/grouped';
import { PrivacyNote } from '@/components/privacy-note';
import { CSS_EASE_IN_OUT, CSS_EASE_OUT } from '@/constants/motion';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useT } from '@/state/app-state';
import { useDatasets } from '@/state/datasets';

const LOGO = 96;

// One soft band of light that crosses the logo once.
function Sweep() {
  return (
    <Svg width={LOGO} height={LOGO * 2}>
      <Defs>
        <LinearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={LOGO} height={LOGO * 2} fill="url(#sweep)" />
    </Svg>
  );
}

// First launch: what LUMIQ does in three steps, then start with a sample
// file or your own. Nothing to sign up for. The language is English unless
// changed under More, so nothing is asked here.
// The one long moment in the app: the prism logo settles (0.95 → 1) with a
// single sweep of light, then the rest appears, all within 1.2 s. A tap
// anywhere skips it; with reduced motion everything is simply there.
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

  const startWithSample = () => {
    setActiveDatasetId('sample:sales');
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
            <Image
              source={require('@/assets/images/lumiq-prism.svg')}
              style={styles.logoImage}
              contentFit="contain"
              accessibilityLabel="LUMIQ"
            />
            {animate ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sweep,
                  {
                    animationName: {
                      from: { transform: [{ rotate: '20deg' }, { translateX: -LOGO * 1.4 }] },
                      to: { transform: [{ rotate: '20deg' }, { translateX: LOGO * 1.4 }] },
                    },
                    animationDuration: 700,
                    animationDelay: 300,
                    animationTimingFunction: CSS_EASE_IN_OUT,
                    animationFillMode: 'both',
                  },
                ]}>
                <Sweep />
              </Animated.View>
            ) : null}
          </Animated.View>
          <Animated.View style={[styles.heroText, appear(450)]}>
            <AppText variant="title" style={styles.wordmark}>
              LUMIQ
            </AppText>
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
                icon={<IconCircle icon={step.icon} color={colors.primary} size={44} />}
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
  logo: { width: LOGO, height: LOGO, borderRadius: Radius.xxl, overflow: 'hidden' },
  logoImage: { width: LOGO, height: LOGO },
  sweep: { position: 'absolute', top: -LOGO / 2, left: 0 },
  heroText: { alignItems: 'center', gap: Spacing.sm, alignSelf: 'stretch' },
  wordmark: { letterSpacing: 6, textAlign: 'center', alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  actions: { gap: Spacing.md },
});
