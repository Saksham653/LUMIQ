import { NativeTabs } from 'expo-router/native-tabs';

import { useT } from '@/state/app-state';
import { useTheme } from '@/theme';

// Open on Home. Without this the router picks the alphabetically first tab
// folder, (ask), when the app is relaunched.
export const unstable_settings = {
  anchor: '(home)',
};

// The four bottom tabs: the phone's own tab bar (Material 3 on Android, the
// system tab bar on iOS). Every tab always shows its text label, not just the
// selected one: icons alone are hard for first-time users.
// Its colours come from the new palette: opaque tab-bar paper, the chosen tab
// in the action blue on a soft blue pill, the others in soft ink. The labels
// stay in the phone's own font: the bar is the phone's, and its height is
// made for that font.
export default function TabsLayout() {
  const { colors } = useTheme();
  const t = useT();

  return (
    <NativeTabs
      labelVisibilityMode="labeled"
      tintColor={colors.action}
      backgroundColor={colors.tabBar}
      indicatorColor={colors.actionSoft}
      iconColor={{ default: colors.inkSoft, selected: colors.onActionSoft }}
      labelStyle={{ default: { color: colors.inkSoft }, selected: { color: colors.actionText } }}>
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
