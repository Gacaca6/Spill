/** Random primitives. Every consumer takes an injectable `rng` so the engine is testable. */

export type Rng = () => number;

/** Deterministic PRNG (mulberry32). Used by tests and by seeded replays. */
export function seededRandom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRandom: Rng = () => Math.random();

/** Fisher–Yates. Returns a new array; the input is not mutated. */
export function shuffle<T>(items: readonly T[], rng: Rng = defaultRandom): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

export function pick<T>(items: readonly T[], rng: Rng = defaultRandom): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rng() * items.length)] ?? null;
}

export function randomInt(min: number, max: number, rng: Rng = defaultRandom): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
