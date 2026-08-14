import { describe, expect, it } from 'vitest';
import { ADULT_PROMPTS, ALL_CONSEQUENCES, CONTENT_COUNTS, GENERAL_PROMPTS, validateContent } from '@/data';
import { MODES, MODE_ORDER } from '@/data/categories/modes';

describe('content integrity', () => {
  it('has no structural problems', () => {
    expect(validateContent()).toEqual([]);
  });

  it('meets the library size targets', () => {
    expect(CONTENT_COUNTS.generalTruths).toBeGreaterThanOrEqual(150);
    expect(CONTENT_COUNTS.generalDares).toBeGreaterThanOrEqual(150);
    expect(CONTENT_COUNTS.consequences).toBeGreaterThanOrEqual(75);
    expect(CONTENT_COUNTS.adultTruths).toBeGreaterThanOrEqual(40);
    expect(CONTENT_COUNTS.adultDares).toBeGreaterThanOrEqual(40);
  });

  it('keeps the general and adult decks completely separate', () => {
    expect(GENERAL_PROMPTS.every((prompt) => prompt.ageRating === 'general')).toBe(true);
    expect(ADULT_PROMPTS.every((prompt) => prompt.ageRating === '18+')).toBe(true);

    const generalIds = new Set(GENERAL_PROMPTS.map((prompt) => prompt.id));
    expect(ADULT_PROMPTS.some((prompt) => generalIds.has(prompt.id))).toBe(false);
  });

  it('only exposes the 18plus category through the adult mode', () => {
    for (const mode of MODE_ORDER) {
      const definition = MODES[mode];
      if (definition.ageRating === '18+') continue;
      expect(definition.categories).not.toContain('18plus');
    }
  });

  it('gives every general mode a usable pool of both types at two players', () => {
    for (const mode of MODE_ORDER) {
      const definition = MODES[mode];
      const pool = definition.ageRating === '18+' ? ADULT_PROMPTS : GENERAL_PROMPTS;

      for (const type of ['truth', 'dare'] as const) {
        const usable = pool.filter(
          (prompt) =>
            prompt.type === type &&
            prompt.ageRating === definition.ageRating &&
            definition.categories.includes(prompt.category) &&
            (prompt.minPlayers ?? 2) <= 2 &&
            prompt.playerMode !== 'group',
        );
        expect(usable.length, `${mode}/${type} at 2 players`).toBeGreaterThan(10);
      }
    }
  });
});

describe('content safety', () => {
  /**
   * Banned everywhere, in any phrasing. These are requests for private material
   * or real-world harm — there is no context in this game where they are fine.
   */
  const FORBIDDEN_ANYWHERE = [
    /\bpassword/i,
    /\bpasscode\b/i,
    /\bpin (?:code|number)\b/i,
    /\bnude/i,
    /\bnaked\b/i,
    /send (?:a |an )?(?:photo|picture|pic|image) of/i,
    /\bstalk/i,
    /\bblackmail/i,
    /\bdox/i,
    /credit card/i,
    /bank (?:details|account)/i,
    /social security/i,
    /\blog in(?:to)? (?:their|your) account\b/i,
    /\bhack\b/i,
    /\bknife\b/i,
    /\bunlock(?:ed)? (?:your|their) phone\b/i,
    /\bhand (?:over )?(?:your|their) phone\b/i,
  ];

  /**
   * Banned in anything that *instructs* a player — dares and consequences.
   *
   * Truths are questions about a person's own past and may reference these
   * things; a dare or consequence saying the same word would be telling someone
   * to do it to another person in the room, which the design forbids outright.
   */
  const FORBIDDEN_IN_INSTRUCTIONS = [
    /\bkiss\b/i,
    /\btouch\b/i,
    /\blick\b/i,
    /\bstrip\b/i,
    /take off (?:your|their)/i,
    /\bsit on\b/i,
    /\blap\b/i,
    /\bshot(?:s)? of\b/i,
    /\bdrink\b/i,
    /\bslap\b/i,
    /\bhit\b/i,
    /\bhurt\b/i,
    /\bdangerous\b/i,
    /\bclimb\b/i,
    /\brun outside\b/i,
    /\bcall (?:your|their) (?:ex|mum|mom|dad|boss)\b/i,
    /\bpost (?:this|it|a) .*(?:online|story|social)/i,
  ];

  const everything = [...GENERAL_PROMPTS, ...ADULT_PROMPTS];
  const instructions = [...everything.filter((prompt) => prompt.type === 'dare'), ...ALL_CONSEQUENCES];

  function offenders<T extends { id: string; text: string }>(items: readonly T[], patterns: RegExp[]) {
    return items.filter((item) => patterns.some((pattern) => pattern.test(item.text))).map((item) => `${item.id}: ${item.text}`);
  }

  it('never requests private material or real-world harm', () => {
    expect(offenders(everything, FORBIDDEN_ANYWHERE)).toEqual([]);
    expect(offenders(ALL_CONSEQUENCES, FORBIDDEN_ANYWHERE)).toEqual([]);
  });

  it('never instructs physical contact, drinking or anything unsafe', () => {
    expect(offenders(instructions, FORBIDDEN_IN_INSTRUCTIONS)).toEqual([]);
  });

  it('keeps every prompt short enough to read out loud', () => {
    const tooLong = everything.filter((prompt) => prompt.text.length > 170).map((prompt) => prompt.id);
    expect(tooLong).toEqual([]);
  });
});
