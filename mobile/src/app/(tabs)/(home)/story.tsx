import { Stack } from 'expo-router/stack';

import { NoFileChosen } from '@/components/no-file-chosen';
import { StoryScreen } from '@/screens/story';
import { useActiveDataset, useDatasets } from '@/state/datasets';

// The Story of the open file, inside the Home tab's stack. The story is a
// full screen with its own close button, so the stack's title bar is hidden
// for it; with no file open the usual "no file" state is shown under the
// title bar the Home stack gives this route.
export default function StoryRoute() {
  const dataset = useActiveDataset();
  const { datasetName } = useDatasets();

  if (!dataset) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true }} />
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
