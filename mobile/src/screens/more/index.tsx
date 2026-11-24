import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { type IconName } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { Chevron, Group, IconCircle, ListRow, SectionTitle } from '@/components/grouped';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { languageInfo, type StringKey } from '@/i18n';
import { useAppState, useT } from '@/state/app-state';

const TOOLS: { icon: IconName; titleKey: StringKey; descKey: StringKey; href: Href }[] = [
  { icon: { ios: 'slider.horizontal.3', android: 'tune' }, titleKey: 'more.whatIf', descKey: 'more.whatIfDesc', href: '/what-if' },
  { icon: { ios: 'checkmark.shield', android: 'verified' }, titleKey: 'more.fileCheck', descKey: 'more.fileCheckDesc', href: '/file-check' },
  { icon: { ios: 'doc.richtext', android: 'description' }, titleKey: 'more.report', descKey: 'more.reportDesc', href: '/report' },
];

// More: the tools, the settings (language, numbers & currency) and the
// privacy promise in plain words.
export function More() {
  const colors = useTheme();
  const t = useT();
  const { language, numberStyle } = useAppState();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <View>
        <SectionTitle title={t('more.tools')} />
        <Group>
          {TOOLS.map((tool) => (
            <ListRow
              key={tool.titleKey}
              onPress={() => router.push(tool.href)}
              accessibilityLabel={`${t(tool.titleKey)}. ${t(tool.descKey)}`}
              icon={<IconCircle icon={tool.icon} color={colors.primary} />}
              title={t(tool.titleKey)}
              subtitle={t(tool.descKey)}
              trailing={<Chevron />}
            />
          ))}
        </Group>
      </View>

      <View>
        <SectionTitle title={t('more.settings')} />
        <Group>
          <ListRow
            onPress={() => router.push('/language')}
            accessibilityLabel={`${t('more.language')}: ${languageInfo(language).native}`}
            icon={<IconCircle icon={{ ios: 'globe', android: 'language' }} />}
            title={t('more.language')}
            subtitle={languageInfo(language).native}
            trailing={<Chevron />}
          />
          <ListRow
            onPress={() => router.push('/numbers')}
            icon={<IconCircle icon={{ ios: 'number', android: 'numbers' }} />}
            title={t('more.numbers')}
            subtitle={numberStyle === 'auto' ? t('numbers.auto') : undefined}
            trailing={<Chevron />}
          />
        </Group>
      </View>

      <View>
        <SectionTitle title={t('more.privacy')} />
        <Group>
          <ListRow
            icon={<IconCircle icon={{ ios: 'lock.shield.fill', android: 'shield_lock' }} color={colors.success} background={colors.successContainer} />}
            title={<AppText>{t('more.privacyText')}</AppText>}
            accessibilityLabel={t('more.privacyText')}
          />
        </Group>
      </View>

      <AppText variant="small" tone="tertiary" style={styles.version}>
        {t('more.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.xxl, paddingBottom: Spacing.huge },
  version: { textAlign: 'center', alignSelf: 'stretch' },
});
