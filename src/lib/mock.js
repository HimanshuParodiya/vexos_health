// Helpers for building believable, deterministic mock data.
// Only mock modules should import this file.

// Seeded PRNG (mulberry32): same seed gives the same numbers on every reload.
export function createRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

// ISO dates for the last `days` days, oldest first, ending today.
export function lastNDays(days, end = new Date()) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - 1 - index));
    return date.toISOString();
  });
}

export const isWeekend = (isoDate) => [0, 6].includes(new Date(isoDate).getDay());

export const sum = (values) => values.reduce((total, value) => total + value, 0);

export const round = (value, digits = 0) => Number(value.toFixed(digits));

export const mockDelay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

// Today at the given hour/minute, as ISO string.
export function todayAt(hours, minutes = 0) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
