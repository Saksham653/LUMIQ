import SegmentedControl from '@expo/ui/community/segmented-control';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon, type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Section } from '@/components/section';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Language, StringKey } from '@/i18n';
import { useAppState, useT } from '@/state/app-state';

const LANGUAGES: Language[] = ['en', 'hi'];
const LANGUAGE_LABELS = ['English', 'हिंदी'];

// The tools: a tool with an href opens; the others are still on the way.
const TOOLS: { icon: IconName; titleKey: StringKey; descKey: StringKey; href?: Href }[] = [
  { icon: { ios: 'slider.horizontal.3', android: 'tune' }, titleKey: 'more.whatIf', descKey: 'more.whatIfDesc', href: '/what-if' },
  { icon: { ios: 'checkmark.shield', android: 'verified' }, titleKey: 'more.fileCheck', descKey: 'more.fileCheckDesc' },
  { icon: { ios: 'doc.richtext', android: 'description' }, titleKey: 'more.report', descKey: 'more.reportDesc' },
];

// More: the app language, the tools, and the privacy promise in plain words.
export function More() {
  const colors = useTheme();
  const t = useT();
  const { language, setLanguage } = useAppState();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Section title={t('more.language')}>
        <SegmentedControl
          values={LANGUAGE_LABELS}
          selectedIndex={LANGUAGES.indexOf(language)}
          onChange={(event) => setLanguage(LANGUAGES[event.nativeEvent.selectedSegmentIndex] ?? 'en')}
          accessibilityLabel={t('more.language')}
          style={styles.segmented}
        />
      </Section>

      <Section title={t('more.tools')}>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TOOLS.map((tool, index) => {
            const href = tool.href;
            const divider = index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border };
            const text = (
              <View style={styles.rowText}>
                <AppText variant="label">{t(tool.titleKey)}</AppText>
                <AppText variant="small" tone="secondary">
                  {t(tool.descKey)}
                </AppText>
              </View>
            );
            return href ? (
              <Pressable
                key={tool.titleKey}
                onPress={() => router.push(href)}
                accessibilityRole="button"
                accessibilityLabel={`${t(tool.titleKey)}. ${t(tool.descKey)}`}
                android_ripple={{ color: colors.primaryContainer }}
                style={[styles.row, divider]}>
                <AppIcon name={tool.icon} size={24} color={colors.primary} />
                {text}
                <AppIcon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={22} color={colors.textSecondary} />
              </Pressable>
            ) : (
              <View
                key={tool.titleKey}
                style={[styles.row, divider]}
                accessible
                accessibilityState={{ disabled: true }}
                accessibilityLabel={`${t(tool.titleKey)}. ${t(tool.descKey)}. ${t('more.soon')}`}>
                <AppIcon name={tool.icon} size={24} color={colors.textSecondary} />
                {text}
                <View style={[styles.badge, { backgroundColor: colors.accentContainer }]}>
                  <AppText variant="small" tone="accent">
                    {t('more.soon')}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title={t('more.privacy')}>
        <View style={[styles.privacy, { backgroundColor: colors.successContainer }]}>
          <AppIcon name={{ ios: 'lock.shield.fill', android: 'shield_lock' }} size={24} color={colors.success} />
          <AppText style={styles.rowText}>{t('more.privacyText')}</AppText>
        </View>
      </Section>

      <AppText variant="small" tone="secondary" style={styles.version}>
        {t('more.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.xxxl },
  segmented: { height: 44 },
  group: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { minHeight: TouchTarget + 16, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg },
  rowText: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.pill },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg },
  version: { textAlign: 'center' },
});
