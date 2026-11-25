import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// The four haptic signals (brand spec, section 9). No sounds in this version.
//
//   select()   a choice changed: chip, tab, language, slider step, radio
//   tap()      finger down on the main button of a screen; a sheet comes to rest
//   success()  every number in an answer was checked; a file finished opening
//   error()    something was refused or failed, together with words that say why
//
// One haptic per action, at contact (never on release, never on scroll), in
// the same frame as the visual change, and never the only feedback: many
// phones have haptics off or no motor at all. Reduced motion does not silence
// them.
//
// Every call is safe everywhere: the browser preview does nothing, and a
// phone without a motor never throws. From a worklet, hop back with
// scheduleOnRN(select) from react-native-worklets, once, at the threshold.

let enabled = true;

// The app's own switch (Settings). Off silences all four.
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

function fire(signal: () => Promise<void>): void {
  if (!enabled || Platform.OS === 'web') return;
  try {
    signal().catch(() => {});
  } catch {
    // A missing motor must never break a tap.
  }
}

// A choice changed.
export function select(): void {
  fire(() => Haptics.selectionAsync());
}

// Light contact.
export function tap(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

// It worked.
export function success(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

// It was refused or it failed. Always with words that say why.
export function error(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
