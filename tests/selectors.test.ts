import { describe, expect, it } from 'vitest';
import { GameEngine } from '@/game/engine/GameEngine';
import { computeAwards, sessionStats } from '@/game/selectors/stats';
import { intensityBandForRound } from '@/game/algorithms/intensity';
import { dedupeNames, initialsOf, normalizeName } from '@/utils/names';
import { seededRandom, shuffle } from '@/utils/random';
import { LIMITS } from '@/config';

function engineWith(names: string[], seed = 7) {
  let n = 0;
  return GameEngine.create({
    players: names,
    mode: 'chaos',
    random: seededRandom(seed),
    now: () => 1_700_000_000_000 + n,
    idFactory: () => `p${n++}`,
  });
}

describe('peekNextPlayer', () => {
  it('does not consume the turn', () => {
    const engine = engineWith(['A', 'B', 'C']);
    const before = [...engine.state.turnQueue];

    const peeked = engine.peekNextPlayer();
    expect(engine.state.turnQueue).toEqual(before);
    expect(engine.peekNextPlayer().id).toBe(peeked.id);

    // The player the wheel promised is the player the engine actually gives.
    expect(engine.nextPlayer().id).toBe(peeked.id);
    expect(engine.state.turnQueue).toHaveLength(before.length - 1);
  });

  it('does not advance the round twice when it refills the queue', () => {
    const engine = engineWith(['A', 'B']);
    for (let i = 0; i < 2; i++) {
      const player = engine.nextPlayer();
      engine.beginTurn(player.id);
      engine.completeTurn();
    }

    expect(engine.state.currentRound).toBe(1);
    engine.peekNextPlayer();
    engine.peekNextPlayer();
    expect(engine.state.currentRound).toBe(2);
  });
});

describe('session stats', () => {
  it('counts outcomes from history', () => {
    const engine = engineWith(['A', 'B', 'C']);

    for (let i = 0; i < 6; i++) {
      const player = engine.nextPlayer();
      engine.beginTurn(player.id);
      if (i % 3 === 0) {
        engine.drawConsequence();
        engine.takeConsequence();
      } else {
        engine.completeTurn('valid');
      }
    }

    const stats = sessionStats(engine.state);
    expect(stats.turns).toBe(6);
    expect(stats.consequences).toBe(2);
    expect(stats.skips).toBe(2);
    expect(stats.truths + stats.dares).toBe(6);
  });
});

describe('awards', () => {
  it('gives every player exactly one award', () => {
    const engine = engineWith(['A', 'B', 'C', 'D', 'E']);

    for (let i = 0; i < 20; i++) {
      const player = engine.nextPlayer();
      engine.beginTurn(player.id);
      if (i % 4 === 0) {
        engine.drawConsequence();
        engine.takeConsequence();
      } else {
        engine.completeTurn(i % 3 === 0 ? 'cap' : 'valid');
      }
    }

    const awards = computeAwards(engine.state);
    const winners = awards.map((award) => award.playerId);

    expect(new Set(winners).size).toBe(winners.length);
    expect(new Set(winners)).toEqual(new Set(engine.state.players.map((player) => player.id)));
  });

  it('still produces a recap for a game nobody played', () => {
    const engine = engineWith(['A', 'B']);
    const awards = computeAwards(engine.state);
    expect(awards).toHaveLength(2);
    expect(sessionStats(engine.state).turns).toBe(0);
  });
});

describe('intensity bands', () => {
  it('escalates as rounds progress', () => {
    const early = intensityBandForRound(1, 5);
    const late = intensityBandForRound(12, 5);
    expect(Math.max(...late)).toBeGreaterThan(Math.max(...early));
  });

  it('never exceeds the mode ceiling, even with a double-down boost', () => {
    for (let round = 1; round <= 20; round++) {
      for (const ceiling of [1, 2, 3, 4, 5] as const) {
        for (const boost of [0, 1, 2]) {
          const band = intensityBandForRound(round, ceiling, boost);
          expect(band.length).toBeGreaterThan(0);
          expect(Math.max(...band)).toBeLessThanOrEqual(ceiling);
        }
      }
    }
  });
});

describe('name handling', () => {
  it('trims, collapses whitespace and clamps length', () => {
    expect(normalizeName('  Sarah   Jane  ')).toBe('Sarah Jane');
    expect(normalizeName('')).toBe('');
    expect(normalizeName('   ')).toBe('');
    expect(normalizeName('x'.repeat(50)).length).toBeLessThanOrEqual(LIMITS.maxNameLength);
  });

  it('preserves accents and non-Latin scripts', () => {
    expect(normalizeName('Zoë')).toBe('Zoë');
    expect(normalizeName('Ștefan')).toBe('Ștefan');
    expect(normalizeName('さくら')).toBe('さくら');
  });

  it('does not split characters when clamping', () => {
    // Truncating by code unit would leave a broken surrogate half here.
      const clamped = normalizeName('👩‍🚀'.repeat(20));
    expect(clamped).not.toContain('�');
  });

  it('disambiguates duplicates case-insensitively', () => {
    expect(dedupeNames(['Alex', 'alex', 'ALEX', 'Sam'])).toEqual(['Alex', 'alex 2', 'ALEX 3', 'Sam']);
  });

  it('drops empty names', () => {
    expect(dedupeNames(['A', '   ', 'B'])).toEqual(['A', 'B']);
  });

  it('builds initials for the crowded wheel', () => {
    expect(initialsOf('Sarah')).toBe('SA');
    expect(initialsOf('Jonathan Alexander')).toBe('JA');
    expect(initialsOf('')).toBe('?');
  });
});

describe('shuffle', () => {
  it('is a permutation and leaves the input alone', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const result = shuffle(input, seededRandom(3));

    expect(input).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('reaches every position over many runs', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) seen.add(shuffle(['a', 'b', 'c'], seededRandom(seed)).join(''));
    expect(seen.size).toBe(6);
  });
});
