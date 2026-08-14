import type { Rng } from '@/utils/random';
import { shuffle } from '@/utils/random';

/**
 * Turn ordering.
 *
 * Fairness rule: nobody is picked twice until everybody has played. That is
 * guaranteed structurally — a round is a shuffled queue that is drained one
 * player at a time, so repetition inside a round is impossible by construction
 * rather than by probability.
 */
export function buildTurnQueue(playerIds: readonly string[], rng: Rng, avoidFirst?: string | null): string[] {
  const queue = shuffle(playerIds, rng);

  // A fresh queue may legally start with whoever ended the previous round, which
  // would read as the same person going twice in a row. Rotate them out of the
  // first slot — the round's contents are unchanged, only the order.
  if (avoidFirst && queue.length > 1 && queue[0] === avoidFirst) {
    const swapWith = 1 + Math.floor(rng() * (queue.length - 1));
    const head = queue[0] as string;
    const other = queue[swapWith] as string;
    queue[0] = other;
    queue[swapWith] = head;
  }

  return queue;
}
