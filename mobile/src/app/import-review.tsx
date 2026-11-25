import { Stack } from 'expo-router/stack';

import { ImportReview } from '@/screens/import-review';

// The import review, above the tabs: a big file being read (progress and
// Cancel), and a file waiting for the person before it is saved. Opened by
// the import in @/state/datasets; it draws its own top bar.
export default function ImportReviewRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImportReview />
    </>
  );
}
