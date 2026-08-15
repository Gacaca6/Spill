import type { Category, ChallengeType, Consequence, Intensity, ModeDefinition, Prompt } from '@/types';
import type { Rng } from '@/utils/random';
import { pick } from '@/utils/random';

/**
 * Content selection.
 *
 * The engine narrows the pool in stages — hard filters first (age rating, mode,
 * group size), then soft preferences (intensity band, category variety). Hard
 * filters are never relaxed; only preferences are, so widening the search can
 * make the game feel repetitive but can never make it unsafe.
 */

export interface SelectionInput {
  pool: readonly Prompt[];
  type: ChallengeType;
  mode: ModeDefinition;
  playerCount: number;
  band: readonly Intensity[];
  usedIds: readonly string[];
  recentCategories: readonly Category[];
  rng: Rng;
  /** Set when a partner has declined, so the replacement involves nobody else. */
  excludePartner?: boolean;
}

export interface SelectionResult<T> {
  item: T | null;
  /** True when the fresh pool was exhausted and previously used items were reopened. */
  recycled: boolean;
}

/** Hard eligibility. Nothing below this line is ever bypassed. */
function isEligible(prompt: Prompt, input: SelectionInput): boolean {
  if (prompt.type !== input.type) return false;

  // The age gate. A general mode can only ever see general content, and 18+ mode
  // can only ever see adult content — the check is an equality, not an allowance.
  if (prompt.ageRating !== input.mode.ageRating) return false;

  if (!input.mode.categories.includes(prompt.category)) return false;

  // The mode ceiling is a hard guarantee, not a preference. Without this, an
  // exhausted low-intensity pool would let the fallback below reach for a
  // harder prompt than the mode ever promised.
  if (prompt.intensity > input.mode.maxIntensity) return false;

  if ((prompt.minPlayers ?? 2) > input.playerCount) return false;
  if (prompt.playerMode === 'group' && input.playerCount < 3) return false;
  if (prompt.requiresAnotherPerson && input.playerCount < 2) return false;

  // A partner dare needs a third person: the player, the partner, and enough
  // room that the partner is not simply the only other person present.
  if (prompt.requiresPartner && (input.excludePartner || input.playerCount < 3)) return false;

  return true;
}

export function selectPrompt(input: SelectionInput): SelectionResult<Prompt> {
  const eligible = input.pool.filter((prompt) => isEligible(prompt, input));
  if (eligible.length === 0) return { item: null, recycled: false };

  const used = new Set(input.usedIds);
  let candidates = eligible.filter((prompt) => !used.has(prompt.id));
  let recycled = false;

  // Pool exhausted: reopen everything rather than leaving the player with nothing.
  if (candidates.length === 0) {
    candidates = eligible;
    recycled = true;
  }

  const inBand = candidates.filter((prompt) => input.band.includes(prompt.intensity));
  const banded = inBand.length > 0 ? inBand : nearestToBand(candidates, input.band);

  // Soft preference: avoid the categories that just came up, so three crush
  // questions in a row cannot happen while other categories are available.
  const recent = new Set(input.recentCategories);
  const varied = banded.filter((prompt) => !recent.has(prompt.category));
  const finalPool = varied.length > 0 ? varied : banded;

  return { item: pick(finalPool, input.rng), recycled };
}

/** Fallback when no prompt sits inside the band: take the closest intensities available. */
function nearestToBand(candidates: readonly Prompt[], band: readonly Intensity[]): Prompt[] {
  const target = band.length > 0 ? band[Math.floor(band.length / 2)] ?? 3 : 3;
  let bestDistance = Number.POSITIVE_INFINITY;
  let best: Prompt[] = [];

  for (const prompt of candidates) {
    const distance = Math.abs(prompt.intensity - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = [prompt];
    } else if (distance === bestDistance) {
      best.push(prompt);
    }
  }

  return best;
}

export interface ConsequenceSelectionInput {
  pool: readonly Consequence[];
  ageRating: ModeDefinition['ageRating'];
  playerCount: number;
  usedIds: readonly string[];
  rng: Rng;
}

export function selectConsequence(input: ConsequenceSelectionInput): SelectionResult<Consequence> {
  // Adult mode may draw from both decks — the adult consequences are a tonal
  // variation, not a separate safety class. General modes stay general-only.
  const eligible = input.pool.filter((item) => {
    if (input.ageRating === 'general' && item.ageRating !== 'general') return false;
    if ((item.minPlayers ?? 2) > input.playerCount) return false;
    if (item.playerMode === 'group' && input.playerCount < 3) return false;
    return true;
  });

  if (eligible.length === 0) return { item: null, recycled: false };

  const used = new Set(input.usedIds);
  let candidates = eligible.filter((item) => !used.has(item.id));
  let recycled = false;

  if (candidates.length === 0) {
    candidates = eligible;
    recycled = true;
  }

  return { item: pick(candidates, input.rng), recycled };
}
