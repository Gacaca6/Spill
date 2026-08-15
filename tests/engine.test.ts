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

describe('player selection', () => {
  it('never picks the same player on two consecutive turns', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const engine = makeEngine(['A', 'B', 'C', 'D'], 'chaos', seed);
      playTurns(engine, 60);

      const order = engine.state.history.map((turn) => turn.playerId);
      for (let i = 1; i < order.length; i++) {
        expect(order[i]).not.toBe(order[i - 1]);
      }
    }
  });

  it('is not deducible from who has already gone', () => {
    /**
     * The reason the queue was dropped. Draining a shuffled queue meant that
     * once every player but one had gone, the last was certain — the final spin
     * of every round was a formality. This asserts the opposite: across many
     * games there are windows where everyone bar one has just played and the
     * wheel lands on somebody who already has.
     */
    let surprises = 0;

    for (let seed = 1; seed <= 60; seed++) {
      const engine = makeEngine(['A', 'B', 'C', 'D'], 'chaos', seed);
      playTurns(engine, 60);

      const order = engine.state.history.map((turn) => turn.playerId);
      const count = engine.state.players.length;

      for (let i = count - 1; i < order.length; i++) {
        const previous = order.slice(i - (count - 1), i);
        if (new Set(previous).size !== count - 1) continue;
        // Exactly one player sat out that window. A queue would force them next.
        const missing = engine.state.players.find((player) => !previous.includes(player.id));
        if (missing && order[i] !== missing.id) surprises++;
      }
    }

    expect(surprises).toBeGreaterThan(0);
  });

  it('still gives everyone a fair share of the night', () => {
    const names = ['A', 'B', 'C', 'D', 'E'];
    const engine = makeEngine(names, 'chaos', 5);
    playTurns(engine, 500);

    const counts = new Map<string, number>();
    for (const turn of engine.state.history) counts.set(turn.playerId, (counts.get(turn.playerId) ?? 0) + 1);

    const expected = 500 / names.length;
    for (const player of engine.state.players) {
      const share = counts.get(player.id) ?? 0;
      // Weighted selection is not a queue, so allow drift — but not much.
      expect(share).toBeGreaterThan(expected * 0.8);
      expect(share).toBeLessThan(expected * 1.2);
    }
  });

  it('never leaves anyone waiting more than two rotations', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const names = ['A', 'B', 'C', 'D', 'E'];
      const engine = makeEngine(names, 'chaos', seed);
      playTurns(engine, 200);

      const order = engine.state.history.map((turn) => turn.playerId);
      const lastSeen = new Map<string, number>();
      names.forEach((_, index) => lastSeen.set(engine.state.players[index]!.id, -1));

      order.forEach((id, index) => {
        for (const [playerId, seen] of lastSeen) {
          if (playerId === id) continue;
          expect(index - seen, 'gap between turns').toBeLessThanOrEqual(names.length * 2 + 1);
        }
        lastSeen.set(id, index);
      });
    }
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
    playTurns(engine, 120);

    const counts = new Map<string, number>();
    for (const turn of engine.state.history) counts.set(turn.playerId, (counts.get(turn.playerId) ?? 0) + 1);

    expect(counts.size).toBe(names.length);
    for (const count of counts.values()) expect(count).toBeGreaterThan(4);
  });

  it('holds the pending pick across a refresh instead of re-rolling it', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    const peeked = engine.peekNextPlayer();

    const resumed = GameEngine.resume(engine.snapshot());
    expect(resumed!.peekNextPlayer().id).toBe(peeked.id);
    expect(resumed!.nextPlayer().id).toBe(peeked.id);
  });
});

describe('challenge type selection', () => {
  /** Each player's sequence of challenge types, in order. */
  function sequences(engine: GameEngine) {
    const byPlayer = new Map<string, ChallengeType[]>();
    for (const turn of engine.state.history) {
      const list = byPlayer.get(turn.playerId) ?? [];
      list.push(turn.type);
      byPlayer.set(turn.playerId, list);
    }
    return [...byPlayer.values()];
  }

  it('never gives a player the same type three times in a row', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const engine = makeEngine(['A', 'B', 'C', 'D'], 'chaos', seed);
      playTurns(engine, 60);

      for (const types of sequences(engine)) {
        for (let i = 2; i < types.length; i++) {
          const run = types[i] === types[i - 1] && types[i] === types[i - 2];
          expect(run, `three ${types[i]}s in a row`).toBe(false);
        }
      }
    }
  });

  it('is not predictable from the previous card', () => {
    /**
     * The point of the whole rule. If a repeat never happened, the table could
     * call every card after a player's first turn and the reveal would be dead.
     */
    let repeats = 0;
    let opportunities = 0;

    for (let seed = 1; seed <= 40; seed++) {
      const engine = makeEngine(['A', 'B', 'C', 'D'], 'chaos', seed);
      playTurns(engine, 60);

      for (const types of sequences(engine)) {
        for (let i = 1; i < types.length; i++) {
          opportunities++;
          if (types[i] === types[i - 1]) repeats++;
        }
      }
    }

    const rate = repeats / opportunities;
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(0.45);
  });

  it('keeps truths and dares roughly balanced over a long night', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D'], 'chaos', 9);
    playTurns(engine, 400);

    const truths = engine.state.history.filter((turn) => turn.type === 'truth').length;
    const share = truths / engine.state.history.length;
    expect(share).toBeGreaterThan(0.35);
    expect(share).toBeLessThan(0.65);
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

  it('never selects a removed player again', () => {
    const engine = makeEngine(['A', 'B', 'C', 'D']);
    const victim = engine.state.players[2]!.id;

    // Force them to be the pending pick, so removal has something to clear.
    engine.state.players.forEach((player) => {
      if (player.id !== victim) player.lastTurnIndex = 0;
    });
    engine.peekNextPlayer();

    expect(engine.removePlayer(victim)).toBe(true);
    expect(engine.state.pendingPlayerId).not.toBe(victim);

    playTurns(engine, 24);
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
