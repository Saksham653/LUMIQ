import * as Haptics from 'expo-haptics';

// One haptic per user action, fired in the same frame as the visual change,
// and never the only feedback (many phones have haptics off or silent).
// Failures are ignored: a missing vibrator must never break a tap.

// A value ticked past a step: a chip, a segment, a slider detent.
export function hapticSelection() {
  Haptics.selectionAsync().catch(() => {});
}

// Something landed: a file added, a sheet caught.
export function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// It worked: every number in an answer matched.
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
