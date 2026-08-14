import type { Award, GameState, Player, SessionStats } from '@/types';
import { getPrompt } from '@/data';

/** Session-only statistics, derived entirely from history. Nothing is stored beyond the session. */
export function sessionStats(state: GameState): SessionStats {
  const stats: SessionStats = {
    rounds: state.history.length > 0 ? Math.max(...state.history.map((turn) => turn.round)) : 0,
    turns: state.history.length,
    truths: 0,
    dares: 0,
    skips: 0,
    consequences: 0,
    mercies: 0,
    doubleDowns: 0,
  };

  for (const turn of state.history) {
    if (turn.type === 'truth') stats.truths += 1;
    else stats.dares += 1;

    if (turn.outcome === 'skipped' || turn.outcome === 'consequence') stats.skips += 1;
    if (turn.outcome === 'consequence') stats.consequences += 1;
    if (turn.doubledDown) stats.doubleDowns += 1;
  }

  stats.mercies = state.players.reduce((total, player) => total + player.mercies, 0);
  return stats;
}

/** "1 dare" rather than "1 dares" — the recap gets read out loud. */
function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

interface AwardRule {
  id: string;
  title: string;
  /** Higher wins. Return null to disqualify a player from this award. */
  score: (player: Player, state: GameState) => number | null;
  detail: (player: Player) => string;
}

/**
 * Awards.
 *
 * Rules are evaluated in order and each player can only hold one, so a single
 * dominant player does not sweep the board and quieter players still get a
 * line in the recap. Every label is affectionate — nothing here is an insult.
 */
const RULES: AwardRule[] = [
  {
    id: 'chaos-champion',
    title: 'CHAOS CHAMPION',
    score: (player) => (player.turnsPlayed > 0 ? player.chaosScore : null),
    detail: (player) => count(player.chaosScore, 'chaos point'),
  },
  {
    id: 'zero-skip',
    title: 'ZERO SKIP LEGEND',
    score: (player) => (player.turnsPlayed >= 2 && player.skips === 0 ? player.turnsPlayed : null),
    detail: (player) => `${count(player.turnsPlayed, 'turn')}, never flinched`,
  },
  {
    id: 'dare-devil',
    title: 'DARE DEVIL',
    score: (player) => (player.daresReceived > 0 ? player.daresReceived : null),
    detail: (player) => `${count(player.daresReceived, 'dare')} taken on`,
  },
  {
    id: 'truth-master',
    title: 'TRUTH MASTER',
    score: (player) => (player.truthsReceived > 0 ? player.truthsReceived : null),
    detail: (player) => `${count(player.truthsReceived, 'truth')} answered`,
  },
  {
    id: 'most-unhinged',
    title: 'MOST UNHINGED',
    score: (player, state) => {
      const heavy = state.history.filter(
        (turn) => turn.playerId === player.id && turn.outcome === 'completed' && (getPrompt(turn.promptId)?.intensity ?? 0) >= 4,
      ).length;
      return heavy > 0 ? heavy : null;
    },
    detail: () => 'went somewhere nobody asked them to go',
  },
  {
    id: 'runner',
    title: 'MOST LIKELY TO SAY NOPE',
    score: (player) => (player.skips > 0 ? player.skips : null),
    detail: (player) => `${count(player.skips, 'strategic exit')}`,
  },
  {
    id: 'all-in',
    title: 'ALL IN',
    score: (player) => (player.doubleDowns > 0 ? player.doubleDowns : null),
    detail: (player) => `doubled down ${player.doubleDowns}×`,
  },
  {
    id: 'certified',
    title: 'CERTIFIED HONEST',
    score: (player) => (player.validVotes > 0 ? player.validVotes : null),
    detail: (player) => `${count(player.validVotes, 'answer')} the group believed`,
  },
  {
    id: 'under-review',
    title: 'UNDER INVESTIGATION',
    score: (player) => (player.capVotes > 0 ? player.capVotes : null),
    detail: (player) => `${count(player.capVotes, 'answer')} the group did not buy`,
  },
  {
    id: 'good-sport',
    title: 'GOOD SPORT',
    score: (player) => (player.consequencesTaken > 0 ? player.consequencesTaken : null),
    detail: (player) => `took ${count(player.consequencesTaken, 'consequence')} without complaining`,
  },
  {
    id: 'mercy',
    title: 'SAVED BY THE COURT',
    score: (player) => (player.mercies > 0 ? player.mercies : null),
    detail: (player) => `granted mercy ${player.mercies}×`,
  },
];

/** Given to anyone the rules missed, so nobody is left off the recap. */
const FALLBACK: Array<{ id: string; title: string; detail: string }> = [
  { id: 'quiet-storm', title: 'QUIET STORM', detail: 'said less, meant more' },
  { id: 'wildcard', title: 'WILDCARD', detail: 'impossible to predict all night' },
  { id: 'steady', title: 'THE CONSTANT', detail: 'held the whole night together' },
  { id: 'unexpected', title: 'MOST UNEXPECTED', detail: 'nobody saw that coming' },
];

export function computeAwards(state: GameState): Award[] {
  const awards: Award[] = [];
  const claimed = new Set<string>();

  for (const rule of RULES) {
    let best: Player | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const player of state.players) {
      if (claimed.has(player.id)) continue;
      const score = rule.score(player, state);
      if (score === null) continue;
      if (score > bestScore) {
        bestScore = score;
        best = player;
      }
    }

    if (!best) continue;
    claimed.add(best.id);
    awards.push({ id: rule.id, title: rule.title, playerId: best.id, playerName: best.name, detail: rule.detail(best) });
    if (claimed.size === state.players.length) break;
  }

  let fallbackIndex = 0;
  for (const player of state.players) {
    if (claimed.has(player.id)) continue;
    const fallback = FALLBACK[fallbackIndex % FALLBACK.length];
    fallbackIndex += 1;
    if (!fallback) continue;
    awards.push({ id: fallback.id, title: fallback.title, playerId: player.id, playerName: player.name, detail: fallback.detail });
  }

  return awards;
}

/** Players ordered for the scoreboard. */
export function leaderboard(state: GameState): Player[] {
  return [...state.players].sort((a, b) => b.chaosScore - a.chaosScore || b.turnsPlayed - a.turnsPlayed);
}
