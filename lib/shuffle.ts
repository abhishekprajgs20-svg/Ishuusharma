// Deterministic per-question option shuffling.
//
// Why not Math.random(): pagination measures every fragment's real
// height in an off-screen pass, then places it in the final render.
// Both passes read this module in the same render cycle, so a
// non-deterministic shuffle would have the measurement pass see a
// different option order than the real render — silently corrupting
// pagination (a fragment measured at one height rendering at another).
// Seeding the shuffle from stable inputs (question id + a doc-level
// seed number) makes it reproducible within a render, while still
// varying per-question (so it doesn't just rotate every question the
// same way) and changeable on demand via the seed (a "Reshuffle"
// action bumps shuffleSeed, which changes every question's order at
// once without touching the stored option data).

function stringToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a new array with `items` in a deterministic shuffled order,
 * seeded from `key` + `seed`. Never mutates `items`. */
export function seededShuffle<T>(items: T[], key: string, seed: number): T[] {
  const rand = mulberry32(stringToSeed(`${key}::${seed}`));
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
