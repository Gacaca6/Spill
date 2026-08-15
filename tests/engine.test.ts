import { describe, expect, it } from 'vitest';
import { GameEngine } from '@/game/engine/GameEngine';
import { getPrompt } from '@/data';
import { seededRandom } from '@/utils/random';
import type { ChallengeType, GameMode } from '@/types';

function makeEngine(names: string[], mode: GameMode = 'chaos', seed = 12345) {
  let counter = 0;
  return GameEngine.create({
    players: names,
    mode,
    random: seededRandom(seed),
    now: () => 1_700_000_000_000 + counter,
    idFactory: () => `id-${counter++}`,
  });
}

/** Plays `turns` complete turns, always completing the challenge. */
function playTurns(engine: GameEngine, turns: number) {
  for (let i = 0; i < turns; i++) {
    const player = engine.nextPlayer();
    engine.beginTurn(player.id);
    engine.completeTurn();
  }
}

describe('player selection fairness', () => {
  it('never picks the same player twice before everyone else has played', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const engine = makeEngine(['Alex', 'Sarah', 'Mike', 'Emma', 'John'], 'chaos', seed);
      playTurns(engine, 50);

      const order = engine.state.history.map((turn) => turn.playerId);
      const playerCount = engine.state.players.length;

      // Every window of N consecutive turns must contain N distinct players.
      for (let start = 0; start + playerCount <= order.length; start += playerCount) {
        const window = order.slice(start, start + playerCount);
        expect(new Set(window).size).toBe(playerCount);
      }
    }
  });

  it('never picks the same player on two consecutive turns, including across rounds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const engine = makeEngine(['A', 'B', 'C', 'D'], 'chaos', seed);
      playTurns(engine, 60);

      const order = engine.state.history.map((turn) => turn.playerId);
      for (let i = 1; i < order.length; i++) {
        expect(order[i]).not.toBe(order[i - 1]);
      }
    }
  });

  it('generates a new shuffled queue once every player has played', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    expect(engine.state.turnQueue).toHaveLength(4);

    playTurns(engine, 4);
    expect(engine.state.turnQueue).toHaveLength(0);
    expect(engine.state.currentRound).toBe(1);

    engine.nextPlayer();
    expect(engine.state.currentRound).toBe(2);
    expect(engine.state.turnQueue).toHaveLength(3);
  });

  it('works with the minimum group of two', () => {
    const engine = makeEngine(['A', 'B']);
    playTurns(engine, 20);

    const order = engine.state.history.map((turn) => turn.playerId);
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
  });

  it('works with a large group', () => {
    const names = Array.from({ length: 12 }, (_, i) => `Player ${i + 1}`);
    const engine = makeEngine(names);
    playTurns(engine, 36);

    const counts = new Map<string, number>();
    for (const turn of engine.state.history) counts.set(turn.playerId, (counts.get(turn.playerId) ?? 0) + 1);

    // Three complete rounds means everybody has played exactly three times.
    expect([...counts.values()].every((count) => count === 3)).toBe(true);
  });
});

describe('challenge alternation', () => {
  it('never gives a player the same challenge type twice in a row', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const engine = makeEngine(['A', 'B', 'C', 'D'], 'chaos', seed);
      playTurns(engine, 40);

      const byPlayer = new Map<string, ChallengeType[]>();
      for (const turn of engine.state.history) {
        const list = byPlayer.get(turn.playerId) ?? [];
        list.push(turn.type);
        byPlayer.set(turn.playerId, list);
      }

      for (const types of byPlayer.values()) {
        for (let i = 1; i < types.length; i++) expect(types[i]).not.toBe(types[i - 1]);
      }
    }
  });

  it('strictly alternates truth and dare for an individual player', () => {
    const engine = makeEngine(['A', 'B']);
    playTurns(engine, 12);

    const forA = engine.state.history.filter((turn) => turn.playerId === engine.state.players[0]!.id).map((t) => t.type);
    const first = forA[0]!;
    forA.forEach((type, index) => {
      expect(type).toBe(index % 2 === 0 ? first : first === 'truth' ? 'dare' : 'truth');
    });
  });

  it('preserves alternation when mercy replaces the challenge', () => {
    const engine = makeEngine(['A', 'B', 'C']);
    const player = engine.nextPlayer();
    const { type } = engine.beginTurn(player.id);

    const replacement = engine.grantMercy();
    expect(replacement).not.toBeNull();
    expect(replacement!.type).toBe(type);
  });
});

describe('prompt variety', () => {
  it('does not repeat a prompt while unused prompts remain', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    playTurns(engine, 60);

    const ids = engine.state.history.map((turn) => turn.promptId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps playing once the pool is exhausted rather than failing', () => {
    const engine = makeEngine(['A', 'B']);
    playTurns(engine, 400);
    expect(engine.state.history).toHaveLength(400);
    expect(engine.state.history.every((turn) => getPrompt(turn.promptId))).toBe(true);
  });

  it('avoids repeating the same category three times in a row', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D'], 'tea');
    playTurns(engine, 40);

    const categories = engine.state.history.map((turn) => getPrompt(turn.promptId)!.category);
    for (let i = 2; i < categories.length; i++) {
      const streak = categories[i] === categories[i - 1] && categories[i] === categories[i - 2];
      expect(streak).toBe(false);
    }
  });
});

describe('age filtering', () => {
  it('never returns 18+ content in general modes', () => {
    for (const mode of ['chill', 'tea', 'chaos', 'bold'] as GameMode[]) {
      const engine = makeEngine(['A', 'B', 'C'], mode);
      playTurns(engine, 120);

      for (const turn of engine.state.history) {
        const prompt = getPrompt(turn.promptId)!;
        expect(prompt.ageRating).toBe('general');
        expect(prompt.category).not.toBe('18plus');
      }
    }
  });

  it('only returns 18+ content in 18+ mode', () => {
    const engine = makeEngine(['A', 'B', 'C'], '18plus');
    playTurns(engine, 120);

    for (const turn of engine.state.history) {
      expect(getPrompt(turn.promptId)!.ageRating).toBe('18+');
    }
  });

  it('never serves a group prompt to a pair of players', () => {
    for (const mode of ['chill', 'tea', 'chaos', 'bold', '18plus'] as GameMode[]) {
      const engine = makeEngine(['A', 'B'], mode);
      playTurns(engine, 120);

      for (const turn of engine.state.history) {
        const prompt = getPrompt(turn.promptId)!;
        expect(prompt.playerMode, `${mode}/${prompt.id}`).toBe('individual');
        expect(prompt.minPlayers ?? 2).toBeLessThanOrEqual(2);
      }
    }
  });

  it('never exceeds the mode intensity ceiling', () => {
    const engine = makeEngine(['A', 'B', 'C'], 'chill');
    playTurns(engine, 120);

    for (const turn of engine.state.history) {
      expect(getPrompt(turn.promptId)!.intensity).toBeLessThanOrEqual(3);
    }
  });
});

describe('refusal, consequences and mercy', () => {
  it('offers a valid consequence for every refusal', () => {
    const engine = makeEngine(['A', 'B', 'C']);

    for (let i = 0; i < 40; i++) {
      const player = engine.nextPlayer();
      engine.beginTurn(player.id);
      const consequence = engine.drawConsequence();
      expect(consequence).not.toBeNull();
      expect(consequence!.text.length).toBeGreaterThan(0);
      engine.takeConsequence();
    }

    expect(engine.state.history.every((turn) => turn.outcome === 'consequence')).toBe(true);
    expect(engine.state.history.every((turn) => typeof turn.consequenceId === 'string')).toBe(true);
  });

  it('allows every single challenge to be refused', () => {
    const engine = makeEngine(['A', 'B']);
    for (let i = 0; i < 30; i++) {
      const player = engine.nextPlayer();
      engine.beginTurn(player.id);
      engine.drawConsequence();
      expect(engine.takeConsequence()).not.toBeNull();
    }
  });

  it('raises intensity on the next turn after a double down, then resets', () => {
    const engine = makeEngine(['A', 'B'], 'bold');

    const first = engine.nextPlayer();
    engine.beginTurn(first.id);
    engine.doubleDown();
    expect(engine.getPlayer(first.id)!.pendingIntensityBoost).toBe(1);

    const boosted = engine.bandFor(first.id);
    const normal = engine.bandFor(engine.state.players[1]!.id);
    expect(Math.max(...boosted)).toBeGreaterThanOrEqual(Math.max(...normal));

    engine.nextPlayer();
    engine.beginTurn(first.id);
    engine.completeTurn();
    expect(engine.getPlayer(first.id)!.pendingIntensityBoost).toBe(0);
  });

  it('withdraws double down after a run of skips', () => {
    const engine = makeEngine(['A', 'B']);
    const target = engine.state.players[0]!.id;

    expect(engine.canDoubleDown(target)).toBe(true);
    for (let i = 0; i < 3; i++) {
      engine.beginTurn(target);
      engine.drawConsequence();
      engine.takeConsequence();
    }
    expect(engine.canDoubleDown(target)).toBe(false);
  });
});

describe('partner dares', () => {
  /** Plays until a partner dare comes up, so the mechanic can be exercised. */
  function drawPartnerDare(names: string[], seed: number) {
    const engine = makeEngine(names, '18plus', seed);
    for (let i = 0; i < 200; i++) {
      const player = engine.nextPlayer();
      engine.beginTurn(player.id);
      if (engine.state.activeTurn?.partnerId) return engine;
      engine.completeTurn();
    }
    return null;
  }

  it('assigns a partner who is never the player themselves', () => {
    let found = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const engine = drawPartnerDare(['A', 'B', 'C', 'D'], seed);
      if (!engine) continue;
      found++;
      const turn = engine.state.activeTurn!;
      expect(turn.partnerId).not.toBe(turn.playerId);
      expect(engine.state.players.some((p) => p.id === turn.partnerId)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('withholds the card until the partner has answered', () => {
    const engine = drawPartnerDare(['A', 'B', 'C', 'D'], 3);
    expect(engine).not.toBeNull();
    expect(engine!.awaitingPartner).toBe(true);

    engine!.acceptPartner();
    expect(engine!.awaitingPartner).toBe(false);
  });

  it('silently swaps to a dare involving nobody else when the partner passes', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const engine = drawPartnerDare(['A', 'B', 'C', 'D'], seed);
      if (!engine) continue;

      const original = engine.state.activeTurn!.promptId;
      const replacement = engine.declinePartner();

      expect(replacement).not.toBeNull();
      expect(replacement!.id).not.toBe(original);
      // The replacement must not drag in another partner, and the type is kept
      // so the alternation rule still holds.
      expect(replacement!.requiresPartner).toBeFalsy();
      expect(replacement!.type).toBe('dare');
      expect(engine.state.activeTurn!.partnerId).toBeNull();
      expect(engine.awaitingPartner).toBe(false);
    }
  });

  it('never serves a partner dare to a pair, who have no third person', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const engine = makeEngine(['A', 'B'], '18plus', seed);
      playTurns(engine, 120);
      for (const turn of engine.state.history) {
        expect(getPrompt(turn.promptId)?.requiresPartner).toBeFalsy();
      }
    }
  });

  it('never serves a partner dare in a general mode', () => {
    for (const mode of ['chill', 'tea', 'chaos', 'bold'] as GameMode[]) {
      const engine = makeEngine(['A', 'B', 'C', 'D'], mode);
      playTurns(engine, 150);
      for (const turn of engine.state.history) {
        expect(getPrompt(turn.promptId)?.requiresPartner).toBeFalsy();
      }
    }
  });

  it('restores an unanswered partner prompt after a refresh', () => {
    const engine = drawPartnerDare(['A', 'B', 'C', 'D'], 3);
    expect(engine).not.toBeNull();

    const resumed = GameEngine.resume(engine!.snapshot());
    expect(resumed!.awaitingPartner).toBe(true);
    expect(resumed!.activePartner?.id).toBe(engine!.state.activeTurn!.partnerId);
  });
});

describe('state integrity', () => {
  it('restores an in-flight turn from a snapshot', () => {
    const engine = makeEngine(['A', 'B', 'C']);
    const player = engine.nextPlayer();
    const { prompt } = engine.beginTurn(player.id);

    const resumed = GameEngine.resume(engine.snapshot());
    expect(resumed).not.toBeNull();
    expect(resumed!.activePrompt?.id).toBe(prompt.id);
    expect(resumed!.currentPlayer?.id).toBe(player.id);
  });

  it('rejects corrupted or stale state', () => {
    expect(GameEngine.resume({} as never)).toBeNull();
    const engine = makeEngine(['A', 'B']);
    const broken = { ...engine.snapshot(), version: 999 };
    expect(GameEngine.resume(broken as never)).toBeNull();
  });

  it('drops a removed player from the pending queue', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    const victim = engine.state.players[2]!.id;

    expect(engine.removePlayer(victim)).toBe(true);
    expect(engine.state.turnQueue).not.toContain(victim);
    playTurns(engine, 12);
    expect(engine.state.history.some((turn) => turn.playerId === victim)).toBe(false);
  });

  it('refuses to shrink the group below two players', () => {
    const engine = makeEngine(['A', 'B']);
    expect(engine.removePlayer(engine.state.players[0]!.id)).toBe(false);
  });

  it('disambiguates duplicate names', () => {
    const engine = makeEngine(['Alex', 'Alex', 'alex']);
    expect(engine.state.players.map((player) => player.name)).toEqual(['Alex', 'Alex 2', 'alex 3']);
  });

  it('rejects a group that is too small', () => {
    expect(() => makeEngine(['Solo'])).toThrow();
  });
});
