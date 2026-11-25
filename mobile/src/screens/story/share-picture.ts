import type { RefObject } from 'react';
import type { ViewInstance } from 'react-native';

import { PICTURE_HEIGHT, PICTURE_WIDTH } from './share-card';

// What happened when a card was to be shared as a picture:
// shared       the phone's share sheet opened with the picture (and is closed
//              again; whether something was sent, the phone does not say);
// unavailable  this phone or build cannot share a file;
// failed       the picture could not be made or the sheet could not open.
// The screen shares the card as text after anything but `shared`.
export type PictureShare = 'shared' | 'unavailable' | 'failed';

// Captures `target` as a 1080 by 1350 PNG in the app's cache and opens the
// share sheet with it. Nothing is uploaded: the picture goes only where the
// person sends it. The file is kept until the next share (an app such as
// WhatsApp may still be reading it after the sheet closes), then deleted.
//
// The two packages are loaded here, when they are needed, so a build without
// them shares as text instead of failing to open the story.
// The picture of the last share, deleted when the next one is made.
let lastPicture: string | null = null;

export async function sharePicture(target: RefObject<ViewInstance | null>, dialogTitle: string): Promise<PictureShare> {
  const view = target.current;
  if (view === null) return 'unavailable';

  let sharing: typeof import('expo-sharing');
  let shot: typeof import('react-native-view-shot');
  try {
    [sharing, shot] = await Promise.all([import('expo-sharing'), import('react-native-view-shot')]);
    if (!(await sharing.isAvailableAsync())) return 'unavailable';
  } catch {
    return 'unavailable';
  }

  if (lastPicture !== null) {
    try {
      shot.releaseCapture(lastPicture);
    } catch {
      // Already gone: the phone clears its cache by itself.
    }
    lastPicture = null;
  }

  let uri: string;
  try {
    uri = await shot.captureRef(view, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: PICTURE_WIDTH,
      height: PICTURE_HEIGHT,
    });
  } catch {
    return 'failed';
  }

  lastPicture = uri;
  try {
    await sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
    return 'shared';
  } catch {
    return 'failed';
  }
}
