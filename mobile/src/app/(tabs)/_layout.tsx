import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/state/app-state';

// Open on Home. Without this the router picks the alphabetically first tab
// folder, (ask), when the app is relaunched.
export const unstable_settings = {
  anchor: '(home)',
};

// The four bottom tabs: the phone's own tab bar (Material 3 on Android, the
// system tab bar on iOS). Every tab always shows its text label, not just the
// selected one: icons alone are hard for first-time users.
export default function TabsLayout() {
  const colors = useTheme();
  const t = useT();

  return (
    <NativeTabs
      labelVisibilityMode="labeled"
      tintColor={colors.primary}
      backgroundColor={colors.card}
      indicatorColor={colors.primaryContainer}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(insights)">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="insights" />
        <NativeTabs.Trigger.Label>{t('tabs.insights')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(ask)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }}
          md="forum"
        />
        <NativeTabs.Trigger.Label>{t('tabs.ask')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(more)">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
        <NativeTabs.Trigger.Label>{t('tabs.more')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
