import SegmentedControl from '@expo/ui/community/segmented-control';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BigButton } from '@/components/big-button';
import { PrivacyNote } from '@/components/privacy-note';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Language } from '@/i18n';
import { useAppState, useT } from '@/state/app-state';

const LANGUAGES: Language[] = ['en', 'hi'];
const LANGUAGE_LABELS = ['English', 'हिंदी'];

// First launch: pick a language, see the three steps, then start with a
// sample file or your own. Nothing to sign up for.
export function Welcome() {
  const colors = useTheme();
  const t = useT();
  const { language, setLanguage, completeOnboarding, setActiveDatasetId } = useAppState();

  const steps: { icon: IconName; title: string; desc: string; background: string; color: string }[] = [
    {
      icon: { ios: 'doc.text.fill', android: 'description' },
      title: t('welcome.step1.title'),
      desc: t('welcome.step1.desc'),
      background: colors.primaryContainer,
      color: colors.onPrimaryContainer,
    },
    {
      icon: { ios: 'chart.bar.fill', android: 'bar_chart' },
      title: t('welcome.step2.title'),
      desc: t('welcome.step2.desc'),
      background: colors.secondaryContainer,
      color: colors.secondary,
    },
    {
      icon: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum' },
      title: t('welcome.step3.title'),
      desc: t('welcome.step3.desc'),
      background: colors.accentContainer,
      color: colors.accent,
    },
  ];

  const startWithSample = () => {
    setActiveDatasetId('sample:sales');
    completeOnboarding();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.language}>
          <AppText variant="small" tone="secondary">
            {t('welcome.languageLabel')}
          </AppText>
          <SegmentedControl
            values={LANGUAGE_LABELS}
            selectedIndex={LANGUAGES.indexOf(language)}
            onChange={(event) => setLanguage(LANGUAGES[event.nativeEvent.selectedSegmentIndex] ?? 'en')}
            accessibilityLabel={t('welcome.languageLabel')}
            style={styles.segmented}
          />
        </View>

        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/lumiq-prism.svg')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="LUMIQ"
          />
          <AppText variant="title" style={styles.wordmark}>
            LUMIQ
          </AppText>
          <AppText variant="display" style={styles.center} accessibilityRole="header">
            {t('welcome.title')}
          </AppText>
          <AppText tone="secondary" style={styles.center}>
            {t('welcome.subtitle')}
          </AppText>
        </View>

        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={step.title} style={[styles.step, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.stepIcon, { backgroundColor: step.background }]}>
                <AppIcon name={step.icon} size={26} color={step.color} />
              </View>
              <View style={styles.stepText}>
                <AppText variant="heading">{`${index + 1}. ${step.title}`}</AppText>
                <AppText variant="small" tone="secondary">
                  {step.desc}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <BigButton label={t('welcome.trySample')} onPress={startWithSample} />
          <BigButton variant="outlined" label={t('welcome.openFile')} onPress={completeOnboarding} />
          <PrivacyNote text={t('privacy.welcome')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.xxxl },
  language: { gap: Spacing.sm, alignItems: 'center' },
  segmented: { alignSelf: 'stretch', height: 44 },
  hero: { alignItems: 'center', gap: Spacing.sm },
  logo: { width: 88, height: 88, borderRadius: Radius.xl },
  wordmark: { letterSpacing: 6 },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  steps: { gap: Spacing.md },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  stepIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: 2 },
  actions: { gap: Spacing.md },
});
