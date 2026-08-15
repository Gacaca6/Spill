import type { Rng } from '@/utils/random';

/**
 * Who the wheel lands on.
 *
 * The original design drained a shuffled queue, which made fairness a structural
 * guarantee but leaked the ending: with four players, once three had gone the
 * fourth was certain, and the last spin of every round was theatre. A real
 * bottle can land anywhere, and that not-knowing is the whole point of spinning
 * it.
 *
 * So selection is weighted rather than queued. Every player is a candidate on
 * every spin, weighted by how long they have been waiting, which keeps the night
 * near-even without ever making the next name deducible.
 */

export interface Candidate {
  id: string;
  /** Index in history when this player last went; -1 if they never have. */
  lastTurnIndex: number;
}

/** Waiting longer means a heavier weight — squared, so the pull is decisive. */
function weightFor(candidate: Candidate, turnIndex: number): number {
  const gap = turnIndex - candidate.lastTurnIndex;
  return gap * gap;
}

export function selectNextPlayer(
  candidates: readonly Candidate[],
  turnIndex: number,
  lastPlayerId: string | null,
  rng: Rng,
): string | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]?.id ?? null;

  // Nobody goes twice in a row. With three or more players this removes one
  // name from a hat that still holds several, so it costs no unpredictability.
  const eligible = candidates.filter((candidate) => candidate.id !== lastPlayerId);
  const pool = eligible.length > 0 ? eligible : [...candidates];

  /**
   * Starvation guard. Weighting alone makes a long wait unlikely, not
   * impossible, and "unlikely" is no comfort to the person who has been skipped
   * five times. Anyone waiting longer than two full rotations is promoted to
   * the only candidate — which still keeps the choice open whenever more than
   * one of them qualifies.
   */
  const overdue = pool.filter((candidate) => turnIndex - candidate.lastTurnIndex >= candidates.length * 2);
  const finalPool = overdue.length > 0 ? overdue : pool;

  const weights = finalPool.map((candidate) => weightFor(candidate, turnIndex));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return finalPool[Math.floor(rng() * finalPool.length)]?.id ?? null;

  let ticket = rng() * total;
  for (let i = 0; i < finalPool.length; i++) {
    ticket -= weights[i] as number;
    if (ticket <= 0) return finalPool[i]?.id ?? null;
  }

  return finalPool[finalPool.length - 1]?.id ?? null;
}
