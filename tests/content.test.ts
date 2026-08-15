import { describe, expect, it } from 'vitest';
import { ADULT_PROMPTS, ALL_CONSEQUENCES, CONTENT_COUNTS, GENERAL_PROMPTS, validateContent } from '@/data';
import { MODES, MODE_ORDER } from '@/data/categories/modes';

describe('content integrity', () => {
  it('has no structural problems', () => {
    expect(validateContent()).toEqual([]);
  });

  it('meets the library size targets', () => {
    expect(CONTENT_COUNTS.generalTruths).toBeGreaterThanOrEqual(400);
    expect(CONTENT_COUNTS.generalDares).toBeGreaterThanOrEqual(300);
    expect(CONTENT_COUNTS.consequences).toBeGreaterThanOrEqual(130);
    expect(CONTENT_COUNTS.adultTruths).toBeGreaterThanOrEqual(240);
    expect(CONTENT_COUNTS.adultDares).toBeGreaterThanOrEqual(120);
  });

  it('spreads the adult deck across the whole spice ladder', () => {
    // A deck that bunches at one intensity cannot escalate across a night.
    for (const level of [1, 2, 3, 4, 5] as const) {
      const truths = ADULT_PROMPTS.filter((p) => p.type === 'truth' && p.intensity === level);
      expect(truths.length, `adult truths at intensity ${level}`).toBeGreaterThanOrEqual(20);
    }
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
   * Banned in anything that *instructs* a player, unless it is a partner dare.
   *
   * Truths are questions about a player's own past and may reference these
   * things freely. An instruction saying the same word is telling someone to do
   * it — and if it lands on another person in the room, that person never chose
   * it. Partner dares are the one exception, because they route through an
   * explicit opt-in from the person on the receiving end.
   */
  const TARGET = '(?:your|the|them|him|her|someone|anyone|everyone)';

  const FORBIDDEN_IN_INSTRUCTIONS = [
    // Contact patterns are *directed* — a bare verb also matches "describe your
    // ideal first kiss", which instructs nothing and is fine in an adult deck.
    new RegExp(`\\bkiss ${TARGET}\\b`, 'i'),
    new RegExp(`\\btouch ${TARGET}\\b`, 'i'),
    new RegExp(`\\bsit on ${TARGET}\\b`, 'i'),
    /\blick\b/i,
    /\bmassage\b/i,
    /\bhold (?:your|their) hand\b/i,
    /\blap\b/i,
    /\bshot(?:s)? of\b/i,
    // Likewise: an instruction to drink, not the idiom "need a drink to admit".
    /\b(?:take|have|down|finish) a drink\b/i,
    /\bdrink (?:a|the|it|up)\b/i,
    /\bslap\b/i,
    /\bhit\b/i,
    /\bhurt\b/i,
    /\bdangerous\b/i,
    /\bclimb\b/i,
    /\brun outside\b/i,
    /\bcall (?:your|their) (?:ex|mum|mom|dad|boss)\b/i,
    /\bpost (?:this|it|a) .*(?:online|story|social)/i,
  ];

  /**
   * Banned even with an opt-in. Consent to a kiss in a party game is not consent
   * to undress or to a sexual act, and an app cannot referee the difference in
   * the moment — so it never asks for either.
   */
  const FORBIDDEN_EVEN_WITH_CONSENT = [
    /\bstrip\b/i,
    /take off (?:your|their|any)/i,
    /\bremove (?:your|their) \w+/i,
    /\bundress\b/i,
    /\bunderwear\b/i,
    /\bclothing\b/i,
    /\bbra\b/i,
    /\bgrind\b/i,
    /\bstraddle\b/i,
    /\bblindfold\b/i,
    /\btie (?:up|them|their)\b/i,
    /\bbedroom\b/i,
    /\bshower\b/i,
    /\bbed\b/i,
  ];

  const everything = [...GENERAL_PROMPTS, ...ADULT_PROMPTS];
  const allDares = everything.filter((prompt) => prompt.type === 'dare');
  const partnerDares = allDares.filter((prompt) => prompt.requiresPartner);
  const unconsentedInstructions = [...allDares.filter((prompt) => !prompt.requiresPartner), ...ALL_CONSEQUENCES];

  function offenders<T extends { id: string; text: string }>(items: readonly T[], patterns: RegExp[]) {
    return items.filter((item) => patterns.some((pattern) => pattern.test(item.text))).map((item) => `${item.id}: ${item.text}`);
  }

  it('never requests private material or real-world harm', () => {
    expect(offenders(everything, FORBIDDEN_ANYWHERE)).toEqual([]);
    expect(offenders(ALL_CONSEQUENCES, FORBIDDEN_ANYWHERE)).toEqual([]);
  });

  it('never instructs contact or anything unsafe outside a partner dare', () => {
    expect(offenders(unconsentedInstructions, FORBIDDEN_IN_INSTRUCTIONS)).toEqual([]);
  });

  it('never instructs undressing or a sexual act, even in a partner dare', () => {
    expect(offenders(allDares, FORBIDDEN_EVEN_WITH_CONSENT)).toEqual([]);
    expect(offenders(ALL_CONSEQUENCES, FORBIDDEN_EVEN_WITH_CONSENT)).toEqual([]);
  });

  it('routes every physical partner dare through the consent flag', () => {
    /**
     * Contact *directed at another person* must be flagged, or the dare would
     * skip the opt-in and land on someone who never agreed to it.
     *
     * Both halves are required. A contact verb alone catches innocent phrasing
     * — "dance with no music", "let it sit", "describe your ideal first kiss" —
     * and a test that cries wolf is a test that gets deleted.
     */
    const contactVerb = /\b(kiss|whisper|massage|hug|hold hands|rest your head|sit on|dance with|trace)\b/i;
    const aimedAtSomeone = /\b(your partner|the person (?:on|to|opposite)|them|their)\b/i;

    const unflagged = allDares.filter(
      (prompt) => contactVerb.test(prompt.text) && aimedAtSomeone.test(prompt.text) && !prompt.requiresPartner,
    );
    expect(unflagged.map((prompt) => prompt.id)).toEqual([]);
  });

  it('keeps partner dares out of the general deck entirely', () => {
    expect(GENERAL_PROMPTS.some((prompt) => prompt.requiresPartner)).toBe(false);
    expect(partnerDares.every((prompt) => prompt.ageRating === '18+')).toBe(true);
    expect(partnerDares.every((prompt) => (prompt.minPlayers ?? 2) >= 3)).toBe(true);
  });

  it('keeps every prompt short enough to read out loud', () => {
    const tooLong = everything.filter((prompt) => prompt.text.length > 170).map((prompt) => prompt.id);
    expect(tooLong).toEqual([]);
  });
});
