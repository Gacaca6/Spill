import type { Consequence, Prompt } from '@/types';
import { generalTruths } from '@/data/truths/general';
import { adultTruths } from '@/data/truths/adult';
import { generalDares } from '@/data/dares/general';
import { adultDares } from '@/data/dares/adult';
import { consequences } from '@/data/consequences';

/**
 * The content library.
 *
 * General and adult pools are declared separately and only ever combined into
 * `ALL_PROMPTS` for lookup by id — selection always filters on `ageRating`, so
 * there is no code path where a general-mode draw can reach adult content.
 */

export const GENERAL_PROMPTS: Prompt[] = [...generalTruths, ...generalDares];
export const ADULT_PROMPTS: Prompt[] = [...adultTruths, ...adultDares];
export const ALL_PROMPTS: Prompt[] = [...GENERAL_PROMPTS, ...ADULT_PROMPTS];
export const ALL_CONSEQUENCES: Consequence[] = consequences;

const PROMPTS_BY_ID = new Map(ALL_PROMPTS.map((prompt) => [prompt.id, prompt]));
const CONSEQUENCES_BY_ID = new Map(ALL_CONSEQUENCES.map((item) => [item.id, item]));

export function getPrompt(id: string): Prompt | undefined {
  return PROMPTS_BY_ID.get(id);
}

export function getConsequence(id: string): Consequence | undefined {
  return CONSEQUENCES_BY_ID.get(id);
}

export interface ContentIssue {
  id: string;
  problem: string;
}

/**
 * Structural validation of the library. Run by the test suite so a malformed
 * entry fails the build rather than surfacing as an empty pool at 11pm.
 */
export function validateContent(): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const seen = new Set<string>();

  for (const prompt of ALL_PROMPTS) {
    if (seen.has(prompt.id)) issues.push({ id: prompt.id, problem: 'duplicate id' });
    seen.add(prompt.id);

    if (!prompt.text.trim()) issues.push({ id: prompt.id, problem: 'empty text' });
    if (prompt.intensity < 1 || prompt.intensity > 5) issues.push({ id: prompt.id, problem: 'intensity out of range' });
    if (prompt.ageRating === '18+' && prompt.category !== '18plus') {
      issues.push({ id: prompt.id, problem: '18+ prompt must use the 18plus category' });
    }
    if (prompt.ageRating === 'general' && prompt.category === '18plus') {
      issues.push({ id: prompt.id, problem: 'general prompt must not use the 18plus category' });
    }
    if ((prompt.minPlayers ?? 2) < 2) issues.push({ id: prompt.id, problem: 'minPlayers below 2' });
  }

  const consequenceIds = new Set<string>();
  for (const item of ALL_CONSEQUENCES) {
    if (consequenceIds.has(item.id)) issues.push({ id: item.id, problem: 'duplicate consequence id' });
    consequenceIds.add(item.id);
    if (!item.text.trim()) issues.push({ id: item.id, problem: 'empty consequence text' });
  }

  // Exact duplicates, once punctuation and case are stripped.
  const normalized = new Map<string, string>();
  const words = new Map<string, Set<string>>();

  for (const prompt of ALL_PROMPTS) {
    const key = prompt.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const existing = normalized.get(key);
    if (existing) issues.push({ id: prompt.id, problem: `duplicate wording with ${existing}` });
    else normalized.set(key, prompt.id);

    // Every word counts, including the short ones. Filtering by length looks
    // like a sensible stopword proxy and is not: it throws away "sex", "ex",
    // "act" and "bed", which are the words actually distinguishing one adult
    // prompt from another, and makes unrelated questions look identical.
    words.set(prompt.id, new Set(key.split(' ').filter(Boolean)));
  }

  /**
   * Near-duplicates.
   *
   * Exact matching misses the ones that actually happen — "your honest opinion
   * on grand romantic gestures" against "your honest, unfiltered opinion on
   * grand romantic gestures" is a repeat to a player and identical to nobody.
   * Comparing word overlap catches those. 0.85 is high enough that questions
   * sharing a "have you ever" scaffold but asking different things — a friend's
   * partner against a friend's ex — stay clear of each other.
   */
  const entries = [...words.entries()];
  for (let i = 0; i < entries.length; i++) {
    const [idA, setA] = entries[i] as [string, Set<string>];
    if (setA.size < 5) continue;

    for (let j = i + 1; j < entries.length; j++) {
      const [idB, setB] = entries[j] as [string, Set<string>];
      if (setB.size < 5) continue;

      let shared = 0;
      for (const word of setA) if (setB.has(word)) shared++;
      const union = setA.size + setB.size - shared;
      if (union > 0 && shared / union >= 0.85) {
        issues.push({ id: idB, problem: `near-duplicate of ${idA}` });
      }
    }
  }

  return issues;
}

export const CONTENT_COUNTS = {
  generalTruths: generalTruths.length,
  generalDares: generalDares.length,
  adultTruths: adultTruths.length,
  adultDares: adultDares.length,
  consequences: consequences.length,
};
