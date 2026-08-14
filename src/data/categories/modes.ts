import type { GameMode, ModeDefinition } from '@/types';

/**
 * Game modes.
 *
 * A mode is a content lens: which categories are eligible, how far the intensity
 * escalation is allowed to climb, and which age rating the pool is drawn from.
 * `ageRating` is the hard gate — `18+` content is only ever reachable from the
 * one mode that declares it.
 */
export const MODES: Record<GameMode, ModeDefinition> = {
  chill: {
    id: 'chill',
    name: 'CHILL',
    tagline: 'Low stakes. High laughs.',
    description: 'Funny, easy, nothing anyone regrets in the morning. Good for warming a room up.',
    categories: ['funny', 'friendship', 'awkward'],
    ageRating: 'general',
    maxIntensity: 3,
    adult: false,
  },
  tea: {
    id: 'tea',
    name: 'TEA',
    tagline: 'Secrets have a price.',
    description: 'Gossip, friendships, the things nobody says out loud. Expect at least one revelation.',
    categories: ['tea', 'crush', 'awkward', 'friendship', 'deep'],
    ageRating: 'general',
    maxIntensity: 4,
    adult: false,
  },
  chaos: {
    id: 'chaos',
    name: 'CHAOS',
    tagline: 'No plan. No survivors.',
    description: 'Unpredictable, loud and stupid in the best way. The room will not stay calm.',
    categories: ['chaos', 'funny', 'bold', 'awkward'],
    ageRating: 'general',
    maxIntensity: 4,
    adult: false,
  },
  bold: {
    id: 'bold',
    name: 'BOLD',
    tagline: 'Say it to their face.',
    description: 'Flirtier, sharper, more honest. For groups that can take it.',
    categories: ['bold', 'crush', 'tea', 'chaos', 'deep'],
    ageRating: 'general',
    maxIntensity: 5,
    adult: false,
  },
  '18plus': {
    id: '18plus',
    name: '18+',
    tagline: 'Adults only.',
    description: 'A separate deck. Flirtation, dating and adult humour. Nothing here is compulsory.',
    categories: ['18plus'],
    ageRating: '18+',
    maxIntensity: 5,
    adult: true,
  },
};

/** Display order for the mode selector. */
export const MODE_ORDER: GameMode[] = ['chill', 'tea', 'chaos', 'bold', '18plus'];

export function getMode(id: GameMode): ModeDefinition {
  return MODES[id];
}

/** Human-readable label for the current escalation band. */
export const INTENSITY_LABELS: Record<number, string> = {
  1: 'WARM UP',
  2: 'GETTING INTERESTING',
  3: 'THINGS ARE GETTING PERSONAL',
  4: 'NO WAY',
  5: 'CHAOS',
};
