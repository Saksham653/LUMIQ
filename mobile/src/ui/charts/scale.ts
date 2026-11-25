// Pure helpers for the chart layer: plain arithmetic on plain arrays. There is
// no React, no theme and no platform in this file, so every function can be
// tested alone. The charts turn the app's numbers into positions here and draw
// them elsewhere.
//
// Three promises the charts keep, which start here:
// - Nothing misleading. A bar's scale always holds zero. An unknown value is a
//   gap or a dash, never a zero. Two values that share the top have no single
//   peak.
// - The time axis never flips. Every position is measured from the physical
//   left edge of the plot, also in right-to-left languages.
// - The numbers are the app's. Nothing here rounds, sums or averages a value
//   the app shows: these helpers only decide where a mark goes.

// The dash shown where a value is not known.
export const UNKNOWN = '—';

// The lowest and the highest value of a scale.
export type Domain = readonly [low: number, high: number];
// The two ends of the room a scale draws into, in dp.
export type Span = readonly [from: number, to: number];
export type XY = { x: number; y: number };

// A value a chart can draw: a real, finite number.
export function isKnown(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// Also runs on the UI thread (scrubbing).
export function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(Math.max(value, low), high);
}

// The lowest and highest known value, or null when there is none.
export function extent(values: readonly (number | null | undefined)[]): Domain | null {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (!isKnown(value)) continue;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return low <= high ? [low, high] : null;
}

// The same domain, widened to hold zero. A bar is read by its length, so a
// bar chart that does not start at zero lies about every bar.
export function withZero(domain: Domain): Domain {
  return [Math.min(0, domain[0]), Math.max(0, domain[1])];
}

// --- Linear scale ------------------------------------------------------------

export type LinearScale = ((value: number) => number) & {
  // From a position back to a value.
  invert: (position: number) => number;
  domain: Domain;
  span: Span;
};

// A straight-line scale from values to positions:
//   const y = linearScale([0, 712], [88, 0]);   // the plot is 88 high, zero at its foot
//   y(356)   // 44
// A domain with no width (every value the same) puts everything in the middle
// of the span, which is the honest picture of "no difference".
export function linearScale(domain: Domain, span: Span): LinearScale {
  const [d0, d1] = domain;
  const [s0, s1] = span;
  const width = d1 - d0;
  const scale = (value: number): number => (width === 0 ? (s0 + s1) / 2 : s0 + ((value - d0) / width) * (s1 - s0));
  const invert = (position: number): number => (s1 === s0 ? d0 : d0 + ((position - s0) / (s1 - s0)) * width);
  return Object.assign(scale, { invert, domain, span });
}

// --- Nice ticks --------------------------------------------------------------

// Float arithmetic lands a hair under or over a whole step; this much
// forgiveness keeps 0.3 / 0.1 at 3.
const DUST = 1e-9;

// A step people count in: 1, 2 or 5 times a power of ten, close to
// span / count.
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || !(count > 0)) return 0;
  const rough = span / count;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const unit = rough / power;
  const nice = unit < 1.5 ? 1 : unit < 3 ? 2 : unit < 7 ? 5 : 10;
  return nice * power;
}

// Removes the dust of adding a step many times (0.30000000000000004).
function tidy(value: number, step: number): number {
  const decimals = Math.min(12, Math.max(0, -Math.floor(Math.log10(step))));
  return Number(value.toFixed(decimals));
}

// Round values that cover low to high, in steps close to a `count`-th of the
// way:
//   niceTicks(310, 712)      // [300, 400, 500, 600, 700, 800]
//   niceTicks(310, 712, 2)   // [200, 400, 600, 800]
// The first tick is at or below `low` and the last at or above `high`.
export function niceTicks(low: number, high: number, count = 4): number[] {
  if (!isKnown(low) || !isKnown(high)) return [];
  const from = Math.min(low, high);
  const to = Math.max(low, high);
  if (from === to) return [from];
  const step = niceStep(to - from, Math.max(1, count));
  const first = Math.floor(from / step + DUST);
  const last = Math.ceil(to / step - DUST);
  const ticks: number[] = [];
  for (let i = first; i <= Math.max(last, first + 1); i++) ticks.push(tidy(i * step, step));
  return ticks;
}

// The domain those ticks span.
export function niceDomain(low: number, high: number, count = 4): Domain {
  const ticks = niceTicks(low, high, count);
  return ticks.length > 1 ? [ticks[0], ticks[ticks.length - 1]] : [low, high];
}

// --- Band positions (bars) -----------------------------------------------------

export type Bands = {
  count: number;
  // The width of one slot. Slots tile the plot from edge to edge, so every x
  // belongs to exactly one bar: that slot is the bar's touch column.
  step: number;
  // The width of the bar drawn in the middle of its slot.
  band: number;
};

// Lays `count` bars across `width`: at most `gap` between neighbours (never
// more than a third of a slot, so many bars stay bars) and no bar wider than
// `widest` (so two bars do not become two walls).
export function bandLayout(count: number, width: number, gap: number, widest: number): Bands {
  if (count <= 0 || !(width > 0)) return { count: Math.max(0, count), step: 0, band: 0 };
  const step = width / count;
  const between = Math.min(gap, step / 3);
  return { count, step, band: Math.min(step, Math.max(1, Math.min(widest, step - between))) };
}

// The left edge of bar `index`.
export function bandStart(bands: Bands, index: number): number {
  return index * bands.step + (bands.step - bands.band) / 2;
}

// The middle of bar `index`, which is also the middle of its slot.
export function bandCenter(bands: Bands, index: number): number {
  return (index + 0.5) * bands.step;
}

// The bar whose slot holds x, or -1 when there are no bars. A finger past
// either edge reads the nearest bar. Runs on the UI thread.
export function bandIndexAt(x: number, step: number, count: number): number {
  'worklet';
  if (count <= 0 || !(step > 0)) return -1;
  return Math.min(count - 1, Math.max(0, Math.floor(x / step)));
}

// --- Point positions (lines) ---------------------------------------------------

export type Points = {
  count: number;
  // The distance between neighbours.
  step: number;
  // Where the first point sits: kept off the edge so its dot is not cut.
  inset: number;
};

// Lays `count` points evenly across `width`, the first and last `inset` from
// the edges. One point sits in the middle.
export function pointLayout(count: number, width: number, inset: number): Points {
  if (!(width > 0)) return { count: Math.max(0, count), step: 0, inset: 0 };
  if (count <= 1) return { count: Math.max(0, count), step: 0, inset: width / 2 };
  const edge = Math.min(inset, width / 4);
  return { count, step: (width - edge * 2) / (count - 1), inset: edge };
}

export function pointX(points: Points, index: number): number {
  return points.inset + index * points.step;
}

// The point nearest to x, or -1 when there are none. Runs on the UI thread.
export function pointIndexAt(x: number, inset: number, step: number, count: number): number {
  'worklet';
  if (count <= 0) return -1;
  if (!(step > 0)) return 0;
  return Math.min(count - 1, Math.max(0, Math.round((x - inset) / step)));
}

// --- Paths -----------------------------------------------------------------------

function fixed(value: number): string {
  return String(Math.round(value * 100) / 100);
}

// An SVG path through the points, in order, with straight segments (a curve
// would draw values between the points that nobody measured). `null` breaks
// the line: an unknown value is a gap, never a dip to zero. A point with a gap
// on both sides is drawn as a stroke of no length, which a round line end
// turns into a dot, so it is not lost.
export function linePath(points: readonly (XY | null)[]): string {
  let d = '';
  let drawing = false;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point === null) {
      drawing = false;
      continue;
    }
    if (drawing) {
      d += `L${fixed(point.x)} ${fixed(point.y)}`;
      continue;
    }
    d += `M${fixed(point.x)} ${fixed(point.y)}`;
    drawing = true;
    const next = i + 1 < points.length ? points[i + 1] : null;
    if (next === null) d += 'h0.01';
  }
  return d;
}

// The closed shape between an upper and a lower edge, for every unbroken run
// where both are known (a forecast range). A run of one point has no area and
// draws nothing.
export function areaPath(upper: readonly (XY | null)[], lower: readonly (XY | null)[]): string {
  let d = '';
  let run: { up: XY; down: XY }[] = [];
  const close = () => {
    if (run.length > 1) {
      for (let n = 0; n < run.length; n++) d += `${n === 0 ? 'M' : 'L'}${fixed(run[n].up.x)} ${fixed(run[n].up.y)}`;
      for (let n = run.length - 1; n >= 0; n--) d += `L${fixed(run[n].down.x)} ${fixed(run[n].down.y)}`;
      d += 'Z';
    }
    run = [];
  };
  const length = Math.min(upper.length, lower.length);
  for (let i = 0; i < length; i++) {
    const up = upper[i];
    const down = lower[i];
    if (up !== null && down !== null) run.push({ up, down });
    else close();
  }
  close();
  return d;
}

// --- The one mark to point at ------------------------------------------------------

function topIndex(values: readonly (number | null | undefined)[], sole: boolean, sign: 1 | -1): number {
  let best = -1;
  let shared = false;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!isKnown(value)) continue;
    const top = best < 0 ? null : (values[best] as number);
    if (top === null || value * sign > top * sign) {
      best = i;
      shared = false;
    } else if (value === top) {
      shared = true;
    }
  }
  return sole && shared ? -1 : best;
}

// The index of the highest known value, or -1 when there is none. With `sole`,
// also -1 when two values share the top: a tie has no single peak, and
// painting one of them would say something the numbers do not.
export function maxIndex(values: readonly (number | null | undefined)[], sole = false): number {
  return topIndex(values, sole, 1);
}

// The same for the lowest known value.
export function minIndex(values: readonly (number | null | undefined)[], sole = false): number {
  return topIndex(values, sole, -1);
}

// --- Arrival -----------------------------------------------------------------------

// The wait before mark `index` of `count` starts to arrive: `beat` ms after
// its neighbour, squeezed so that the whole cascade never lasts longer than
// `beats` beats however many marks there are. (Rows clamp at the sixth beat;
// a row of bars that did the same would arrive half as a wave and half as a
// block, so bars share the six beats out instead.)
export function cascadeDelay(index: number, count: number, beat: number, beats: number): number {
  if (index <= 0 || count <= 1) return 0;
  const apart = Math.min(beat, (beat * beats) / (count - 1));
  return Math.round(index * apart);
}

// --- Axis labels -------------------------------------------------------------------

// A rough width for a piece of text, good enough to decide how many axis
// labels fit. It errs wide; every label is also cut with an ellipsis, so a
// wrong guess costs a letter, never an overlap.
export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x2e80) em += 1; // Chinese, Japanese, full-width forms
    else if (code >= 0x0900 && code <= 0x097f) em += 0.5; // Devanagari: letters and the signs that ride on them
    else if (code >= 0x0590 && code <= 0x05ff) em += 0.52; // Hebrew
    else if (code === 0x20 || code === 0xa0 || code === 0x202f) em += 0.28;
    else if ('ijlI.,:;\'!|()[]'.includes(char)) em += 0.3;
    else if (char === 'M' || char === 'W' || char === 'm' || char === 'w' || char === '%') em += 0.86;
    else if ((code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x5a)) em += 0.64;
    else em += 0.55;
  }
  return em * fontSize;
}

// How many slots apart axis labels must stand for the widest of them to fit
// with `gap` beside it. 1 is every slot.
export function labelEvery(slot: number, widest: number, gap: number): number {
  if (!(slot > 0)) return 1;
  return Math.max(1, Math.ceil((widest + gap) / slot));
}

export type AxisCell = {
  // Which mark this label belongs to.
  index: number;
  // The cell's width. The cells of a row tile the plot from edge to edge.
  width: number;
  // Padding that leaves the label a box centred on its mark.
  padStart: number;
  padEnd: number;
  align: 'start' | 'center' | 'end';
};

// The cells of a row of axis labels under `count` marks: one label every
// `every` marks, counted so that mark `anchor` keeps its label. Each label is
// centred under its own mark. The first and last may have too little room on
// their outer side to be centred; those lean on the plot's edge instead.
export function axisCells(
  count: number,
  width: number,
  centerOf: (index: number) => number,
  every: number,
  anchor: number,
  widthOf: (index: number) => number,
): AxisCell[] {
  const cells: AxisCell[] = [];
  if (count <= 0 || !(width > 0)) return cells;
  const stride = Math.max(1, Math.round(every));
  const first = ((Math.round(anchor) % stride) + stride) % stride;
  const shown: number[] = [];
  for (let i = first; i < count; i += stride) shown.push(i);
  for (let n = 0; n < shown.length; n++) {
    const index = shown[n];
    const center = centerOf(index);
    const from = n === 0 ? 0 : (centerOf(shown[n - 1]) + center) / 2;
    const to = n === shown.length - 1 ? width : (center + centerOf(shown[n + 1])) / 2;
    const before = Math.max(0, center - from);
    const after = Math.max(0, to - center);
    const half = Math.min(before, after);
    const atEdge = n === 0 || n === shown.length - 1;
    if (!atEdge || widthOf(index) <= half * 2) {
      cells.push({ index, width: to - from, padStart: before - half, padEnd: after - half, align: 'center' });
    } else {
      cells.push({ index, width: to - from, padStart: 0, padEnd: 0, align: before < after ? 'start' : 'end' });
    }
  }
  return cells;
}

// --- Figures inside a formatted number ----------------------------------------------

export type FigureRun = { text: string; figures: boolean };

// Digits, with the separators that sit between digits, and the signs that
// belong to a number: a plus or a minus just before it, a percent sign just
// after it (brand spec, section 5).
const DIGITS = "[+\\-\\u2212]?[0-9]+(?:[.,' \\u00a0\\u202f][0-9]+)*%?";

// Splits an already formatted number into its figures and everything else, so
// a chart can set "712" in the figures face and "K", "₹" or "लाख" in the text
// face (the figures face has no letters and no currency signs):
//   figureRuns('₹4.68M')   // ₹ | 4.68 | M
//   figureRuns('-18.5%')   // -18.5%
// Only the digits 0 to 9 count: digits of other scripts stay with the text.
export function figureRuns(text: string): FigureRun[] {
  const runs: FigureRun[] = [];
  const pattern = new RegExp(DIGITS, 'g');
  let at = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    if (match.index > at) runs.push({ text: text.slice(at, match.index), figures: false });
    runs.push({ text: match[0], figures: true });
    at = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (at < text.length) runs.push({ text: text.slice(at), figures: false });
  return runs;
}

// --- Histogram bins ------------------------------------------------------------------

export type Bin = {
  // The bin holds from <= value < to. The last bin also holds its upper edge.
  from: number;
  to: number;
  count: number;
};

// Sorts values into about `target` bins with round edges, for Distribution.
// It only counts: it does not change, round or drop a known value, and an
// unknown value is left out, never counted as zero. If the app's own engine
// already has the bins, pass those to the chart instead and skip this.
export function binValues(values: readonly (number | null | undefined)[], target = 8): Bin[] {
  const known = values.filter(isKnown);
  const range = extent(known);
  if (range === null) return [];
  const [low, high] = range;
  if (low === high) return [{ from: low, to: high, count: known.length }];
  const step = niceStep(high - low, Math.max(1, target));
  const first = Math.floor(low / step + DUST) * step;
  const size = Math.max(1, Math.ceil((high - first) / step - DUST));
  const bins: Bin[] = [];
  for (let i = 0; i < size; i++) {
    bins.push({ from: tidy(first + i * step, step), to: tidy(first + (i + 1) * step, step), count: 0 });
  }
  for (const value of known) {
    const at = Math.min(size - 1, Math.max(0, Math.floor((value - first) / step + DUST)));
    bins[at].count += 1;
  }
  return bins;
}
