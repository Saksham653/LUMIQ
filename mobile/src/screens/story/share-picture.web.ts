import type { RefObject } from 'react';
import type { ViewInstance } from 'react-native';

// The browser preview cannot make the picture (the capture package needs a
// web helper the app does not ship), so a card is shared as text there. The
// preview of the picture still shows.
export type PictureShare = 'shared' | 'unavailable' | 'failed';

export async function sharePicture(_target: RefObject<ViewInstance | null>, _dialogTitle: string): Promise<PictureShare> {
  return 'unavailable';
}
