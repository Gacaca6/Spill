import type { AgeRating, Category, ChallengeType, Consequence, Intensity, PlayerMode, Prompt } from '@/types';

/**
 * Compact constructors for the content library.
 *
 * Every prompt carries full metadata, but authoring 500+ entries as object
 * literals would bury the writing under punctuation — so the defaults live here
 * and each entry stays one readable line.
 */

interface PromptOptions {
  playerMode?: PlayerMode;
  physical?: boolean;
  needsOther?: boolean;
  /** Performed with a second player, who has to opt in first. */
  partner?: boolean;
  minPlayers?: number;
}

function build(
  type: ChallengeType,
  ageRating: AgeRating,
  id: string,
  text: string,
  category: Category,
  intensity: Intensity,
  options: PromptOptions = {},
): Prompt {
  const prompt: Prompt = {
    id,
    text,
    type,
    category,
    intensity,
    ageRating,
    playerMode: options.playerMode ?? 'individual',
    requiresPhysicalAction: options.physical ?? false,
    // A partner dare necessarily involves someone else, so the flag implies it
    // rather than making every entry declare both.
    requiresAnotherPerson: options.needsOther ?? options.partner ?? false,
  };
  if (options.partner) prompt.requiresPartner = true;
  if (options.minPlayers !== undefined) prompt.minPlayers = options.minPlayers;
  return prompt;
}

/** General-audience truth. */
export const truth = (id: string, text: string, category: Category, intensity: Intensity, options?: PromptOptions) =>
  build('truth', 'general', id, text, category, intensity, options);

/** General-audience dare. */
export const dare = (id: string, text: string, category: Category, intensity: Intensity, options?: PromptOptions) =>
  build('dare', 'general', id, text, category, intensity, options);

/** 18+ truth. Always tagged `18plus` so it can never leak through a category filter. */
export const adultTruth = (id: string, text: string, intensity: Intensity, options?: PromptOptions) =>
  build('truth', '18+', id, text, '18plus', intensity, options);

/** 18+ dare. Always tagged `18plus` so it can never leak through a category filter. */
export const adultDare = (id: string, text: string, intensity: Intensity, options?: PromptOptions) =>
  build('dare', '18+', id, text, '18plus', intensity, options);

interface ConsequenceOptions {
  playerMode?: PlayerMode;
  physical?: boolean;
  minPlayers?: number;
  ageRating?: AgeRating;
}

export function consequence(
  id: string,
  text: string,
  intensity: Intensity,
  options: ConsequenceOptions = {},
): Consequence {
  const item: Consequence = {
    id,
    text,
    intensity,
    ageRating: options.ageRating ?? 'general',
    playerMode: options.playerMode ?? 'individual',
    requiresPhysicalAction: options.physical ?? false,
  };
  if (options.minPlayers !== undefined) item.minPlayers = options.minPlayers;
  return item;
}
