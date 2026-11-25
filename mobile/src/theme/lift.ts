import { Platform, type ViewStyle } from 'react-native';

import type { Palette } from './colors';
import { border } from './space';

// Depth (brand spec, section 6). Only four things float: the tab bar, a
// sheet, a toast, a floating button. Each carries a 1 `line` edge on every
// platform. On iOS and the web it also carries one soft warm shadow; on
// Android the edge alone (no shadow, no elevation: Android shadows show
// through light fills and cost a redraw).
//
// A card never floats: it is `surface` with a 1 `line` edge and no shadow, so
// it does not use lift. No glass, no blur, no gradient anywhere in the app.

// The shadows, copied from tokens.json (lift.*.ios).
const SHADOW = {
  // The tab bar and sheets.
  floating: '0px 12px 32px 0px rgba(40, 34, 20, 0.16)',
  // Toasts and floating buttons.
  raised: '0px 6px 16px 0px rgba(40, 34, 20, 0.12)',
} as const;

export type LiftLevel = keyof typeof SHADOW;

const cache = new WeakMap<Palette, Partial<Record<LiftLevel, ViewStyle>>>();

// The style that makes a surface float: lift('floating', colors). Put it on
// the outer view; if the content needs clipping, clip on an inner view so the
// shadow is not cut off. The same object comes back for the same palette, so
// it is safe to pass straight into a style array.
export function lift(level: LiftLevel, palette: Palette): ViewStyle {
  let byLevel = cache.get(palette);
  if (byLevel === undefined) {
    byLevel = {};
    cache.set(palette, byLevel);
  }
  let style = byLevel[level];
  if (style === undefined) {
    const edge: ViewStyle = { borderWidth: border.hairline, borderColor: palette.line };
    style = Platform.OS === 'android' ? edge : { ...edge, boxShadow: SHADOW[level] };
    byLevel[level] = style;
  }
  return style;
}
