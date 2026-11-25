import { Stack } from 'expo-router/stack';

import { NoFileChosen } from '@/components/no-file-chosen';
import { useLocalT } from '@/i18n/local';
import { HOME_STRINGS } from '@/screens/home/strings';
import { StoryScreen } from '@/screens/story';
import { useActiveDataset, useDatasets } from '@/state/datasets';
import { useTheme } from '@/theme';

// The Story of the open file, over the tabs in the root stack, so it covers
// the whole screen (the tab bar too). The story draws its own close button,
// so it has no title bar; with no file open the usual "no file" state is
// shown under a plain title bar with Back.
export default function StoryRoute() {
  const dataset = useActiveDataset();
  const { datasetName } = useDatasets();
  const tl = useLocalT(HOME_STRINGS);
  const { colors } = useTheme();

  if (!dataset) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: tl('story'),
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.ground },
            headerTitleStyle: { color: colors.ink },
            headerTintColor: colors.actionText,
          }}
        />
        <NoFileChosen />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Keyed by file: another file starts its own story at the first card. */}
      <StoryScreen key={dataset.id} dataset={dataset} name={datasetName(dataset.id) ?? dataset.name} />
    </>
  );
}
