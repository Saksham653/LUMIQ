// A small seeded random number generator (mulberry32), so a sample file is
// made of exactly the same rows on every phone, every time it is opened.
// The sample files never use Math.random or the clock.

export type Random = {
  // A number from 0 up to, not including, 1.
  next: () => number;
  // A whole number from min to max, both included.
  int: (min: number, max: number) => number;
  // true with the given chance, from 0 to 1.
  chance: (probability: number) => boolean;
  // One of the items, each as likely as its weight.
  weighted: <T>(items: readonly T[], weightOf: (item: T) => number) => T;
};

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

  const chance = (probability: number) => next() < probability;

  const weighted = <T>(items: readonly T[], weightOf: (item: T) => number): T => {
    let total = 0;
    for (const item of items) total += weightOf(item);
    let roll = next() * total;
    for (const item of items) {
      roll -= weightOf(item);
      if (roll < 0) return item;
    }
    return items[items.length - 1];
  };

  return { next, int, chance, weighted };
}

// A calendar day as the file writes it: 2026-10-01. Month is 1 to 12.
export function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 0 for Sunday to 6 for Saturday. Worked out in UTC from the date alone, so
// the phone's time zone cannot move a day.
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
