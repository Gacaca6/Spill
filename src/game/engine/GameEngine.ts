import type {
  ActiveTurn,
  ChallengeType,
  Consequence,
  EngineConfig,
  GameState,
  Intensity,
  Player,
  Prompt,
  Reaction,
  TurnRecord,
} from '@/types';
import { ALL_CONSEQUENCES, ADULT_PROMPTS, GENERAL_PROMPTS, getConsequence, getPrompt } from '@/data';
import { MODES } from '@/data/categories/modes';
import { buildTurnQueue } from '@/game/algorithms/queue';
import { intensityBandForRound } from '@/game/algorithms/intensity';
import { selectConsequence, selectPrompt } from '@/game/algorithms/selection';
import { STATE_VERSION, LIMITS } from '@/config';
import { createId } from '@/utils/id';
import { dedupeNames } from '@/utils/names';
import { defaultRandom, pick, type Rng } from '@/utils/random';

/**
 * The game engine.
 *
 * The UI never decides anything: it asks who is next, what type they get, which
 * prompt to show, and what happens when they refuse. Everything the engine
 * returns is derived from `GameState`, which is plain JSON — so the same engine
 * can later run against state synchronised from a server.
 */

/**
 * How strongly the engine leans toward switching challenge type, and the point
 * at which it stops leaning and simply switches.
 *
 * At 0.72 a repeat lands a little over a quarter of the time — often enough
 * that nobody at the table can call the next card, rare enough that the night
 * does not turn into a run of one type.
 */
const SWITCH_BIAS = 0.72;
const MAX_SAME_TYPE_RUN = 2;

/** Chaos Score weighting. Rewards playing along; refusing costs a little. */
const SCORE = {
  completed: 2,
  highIntensityBonus: 1,
  consequenceTaken: 1,
  doubleDown: 3,
  skip: -1,
  validReaction: 1,
  capReaction: -1,
  mercy: -1,
} as const;

export class GameEngine {
  private data: GameState;
  private readonly rng: Rng;
  private readonly now: () => number;

  private constructor(state: GameState, rng: Rng, now: () => number) {
    this.data = state;
    this.rng = rng;
    this.now = now;
  }

  // ── construction ───────────────────────────────────────────────────────────

  static create(config: EngineConfig): GameEngine {
    const rng = config.random ?? defaultRandom;
    const now = config.now ?? (() => Date.now());
    const makeId = config.idFactory ?? (() => createId());

    const names = dedupeNames(config.players).slice(0, LIMITS.maxPlayers);
    if (names.length < LIMITS.minPlayers) {
      throw new Error(`A game needs at least ${LIMITS.minPlayers} players.`);
    }

    const players: Player[] = names.map((name) => createPlayer(makeId(), name));
    const timestamp = now();
    const mode = MODES[config.mode];

    const state: GameState = {
      version: STATE_VERSION,
      gameId: makeId(),
      players,
      currentRound: 1,
      currentPlayerId: null,
      turnQueue: buildTurnQueue(
        players.map((player) => player.id),
        rng,
      ),
      history: [],
      mode: config.mode,
      ageRating: mode.ageRating,
      intensity: 1,
      startedAt: timestamp,
      updatedAt: timestamp,
      status: 'active',
      usedPromptIds: [],
      usedConsequenceIds: [],
      recentCategories: [],
      lastPlayerId: null,
      activeTurn: null,
    };

    return new GameEngine(state, rng, now);
  }

  /** Rehydrate from persisted state. Returns null when the state is unusable. */
  static resume(state: GameState, deps: { random?: Rng; now?: () => number } = {}): GameEngine | null {
    if (!isUsableState(state)) return null;
    return new GameEngine(state, deps.random ?? defaultRandom, deps.now ?? (() => Date.now()));
  }

  // ── reads ──────────────────────────────────────────────────────────────────

  get state(): Readonly<GameState> {
    return this.data;
  }

  /** Deep clone, for persistence and for handing state across a future network boundary. */
  snapshot(): GameState {
    return structuredClone(this.data);
  }

  getPlayer(id: string): Player | undefined {
    return this.data.players.find((player) => player.id === id);
  }

  get currentPlayer(): Player | null {
    return this.data.currentPlayerId ? (this.getPlayer(this.data.currentPlayerId) ?? null) : null;
  }

  get activePrompt(): Prompt | null {
    const turn = this.data.activeTurn;
    return turn ? (getPrompt(turn.promptId) ?? null) : null;
  }

  get activeConsequence(): Consequence | null {
    const id = this.data.activeTurn?.consequenceId;
    return id ? (getConsequence(id) ?? null) : null;
  }

  /** Prompt pool for the current mode. Chosen by age rating, never mixed. */
  private get pool(): Prompt[] {
    return MODES[this.data.mode].ageRating === '18+' ? ADULT_PROMPTS : GENERAL_PROMPTS;
  }

  // ── turn lifecycle ─────────────────────────────────────────────────────────

  private refillIfNeeded(): void {
    if (this.data.turnQueue.length > 0) return;

    this.data.currentRound += 1;
    this.data.turnQueue = buildTurnQueue(
      this.data.players.map((player) => player.id),
      this.rng,
      this.data.lastPlayerId,
    );
  }

  /**
   * Who the wheel must land on, without consuming the turn.
   *
   * The wheel needs the answer before the animation starts, but a refresh
   * mid-spin must not cost anybody their turn — so the queue is only drained
   * once the spin has actually finished.
   */
  peekNextPlayer(): Player {
    this.refillIfNeeded();
    const nextId = this.data.turnQueue[0];
    const player = nextId ? this.getPlayer(nextId) : undefined;
    if (!player) throw new Error('Turn queue is empty and could not be refilled.');
    return player;
  }

  /**
   * Selects the next player. The queue is drained one player at a time and only
   * refilled once empty, which is what makes repeat picks impossible.
   */
  nextPlayer(): Player {
    this.refillIfNeeded();

    const nextId = this.data.turnQueue.shift();
    if (!nextId) throw new Error('Turn queue is empty and could not be refilled.');

    this.data.currentPlayerId = nextId;
    this.touch();

    const player = this.getPlayer(nextId);
    if (!player) throw new Error('Selected player is no longer in the game.');
    return player;
  }

  /**
   * Which type this player gets.
   *
   * Strict alternation was the original rule and it made the game predictable:
   * after a player's first turn, every card they would ever get was known to
   * the whole table, so "TRUTH." stopped being a reveal and the room settled
   * into a repeating pattern.
   *
   * So the rule keeps its intent — no dull runs, no gaming your way into an
   * all-truths night — without the certainty. Switching is strongly favoured but
   * never guaranteed, and the same type three times running is impossible. From
   * a player's seat the next card is genuinely unknown, while the long run still
   * comes out near an even split.
   */
  challengeTypeFor(playerId: string): ChallengeType {
    const player = this.getPlayer(playerId);
    if (!player || player.lastChallengeType === null) {
      return this.rng() < 0.5 ? 'truth' : 'dare';
    }

    const opposite: ChallengeType = player.lastChallengeType === 'truth' ? 'dare' : 'truth';
    if (player.sameTypeStreak >= MAX_SAME_TYPE_RUN) return opposite;

    return this.rng() < SWITCH_BIAS ? opposite : player.lastChallengeType;
  }

  /** Intensity band for a given player's next draw, including any Double Down boost. */
  bandFor(playerId: string): Intensity[] {
    const player = this.getPlayer(playerId);
    return intensityBandForRound(
      this.data.currentRound,
      MODES[this.data.mode].maxIntensity,
      player?.pendingIntensityBoost ?? 0,
    );
  }

  /**
   * Opens a turn: draws a prompt for the player and stores it on the state so a
   * refresh mid-challenge can restore the exact same card.
   */
  beginTurn(playerId: string): { prompt: Prompt; type: ChallengeType } {
    const type = this.challengeTypeFor(playerId);
    const band = this.bandFor(playerId);
    const prompt = this.draw(type, band) ?? this.draw(type === 'truth' ? 'dare' : 'truth', band);

    if (!prompt) throw new Error('No challenges are available for this mode.');

    const turn: ActiveTurn = {
      playerId,
      type: prompt.type,
      promptId: prompt.id,
      consequenceId: null,
      doubledDown: false,
      mercyUsed: false,
      partnerId: prompt.requiresPartner ? this.pickPartner(playerId) : null,
      partnerAccepted: false,
      band,
    };

    this.data.activeTurn = turn;
    this.data.currentPlayerId = playerId;
    this.data.intensity = prompt.intensity;
    this.touch();

    return { prompt, type: prompt.type };
  }

  /** Anyone but the player whose turn it is. */
  private pickPartner(playerId: string): string | null {
    const candidates = this.data.players.filter((player) => player.id !== playerId);
    return pick(candidates, this.rng)?.id ?? null;
  }

  get activePartner(): Player | null {
    const id = this.data.activeTurn?.partnerId;
    return id ? (this.getPlayer(id) ?? null) : null;
  }

  /** True while the card must stay hidden — a partner has been asked but has not answered. */
  get awaitingPartner(): boolean {
    const turn = this.data.activeTurn;
    return Boolean(turn && turn.partnerId && !turn.partnerAccepted);
  }

  acceptPartner(): void {
    const turn = this.data.activeTurn;
    if (!turn?.partnerId) return;
    turn.partnerAccepted = true;
    this.touch();
  }

  /**
   * The partner passes.
   *
   * The dare is replaced with one that involves nobody else, and the partner
   * pays nothing for it. The turn keeps its stakes because the replacement is
   * still a dare the *dared* player can refuse into a consequence — the forfeit
   * belongs to whoever's turn it is, not to the person who was assigned to be
   * touched by a shuffle.
   */
  declinePartner(): Prompt | null {
    const turn = this.data.activeTurn;
    if (!turn) return null;

    const replacement = this.draw(turn.type, turn.band, { excludePartner: true });
    if (!replacement) return null;

    turn.promptId = replacement.id;
    turn.partnerId = null;
    turn.partnerAccepted = false;
    this.data.intensity = replacement.intensity;
    this.touch();

    return replacement;
  }

  private draw(type: ChallengeType, band: Intensity[], options: { excludePartner?: boolean } = {}): Prompt | null {
    const result = selectPrompt({
      pool: this.pool,
      type,
      mode: MODES[this.data.mode],
      playerCount: this.data.players.length,
      band,
      usedIds: this.data.usedPromptIds,
      recentCategories: this.data.recentCategories,
      rng: this.rng,
      excludePartner: options.excludePartner ?? false,
    });

    if (result.recycled) {
      // The fresh pool ran dry; forget history for this type so the next draws
      // are clean again rather than immediately repeating.
      this.data.usedPromptIds = this.data.usedPromptIds.filter((id) => getPrompt(id)?.type !== type);
    }

    const prompt = result.item;
    if (!prompt) return null;

    this.data.usedPromptIds.push(prompt.id);
    this.data.recentCategories = [prompt.category, ...this.data.recentCategories].slice(0, LIMITS.categoryMemory);
    return prompt;
  }

  /**
   * Mercy: the group votes a challenge away and the player gets a replacement of
   * the same type. Alternation is preserved because the type does not change.
   */
  grantMercy(): Prompt | null {
    const turn = this.data.activeTurn;
    if (!turn) return null;

    const replacement = this.draw(turn.type, turn.band);
    if (!replacement) return null;

    turn.promptId = replacement.id;
    turn.mercyUsed = true;
    // Mercy can land on a partner dare, which needs its own partner and its own
    // opt-in rather than inheriting the previous card's.
    turn.partnerId = replacement.requiresPartner ? this.pickPartner(turn.playerId) : null;
    turn.partnerAccepted = false;

    const player = this.getPlayer(turn.playerId);
    if (player) {
      player.mercies += 1;
      player.chaosScore += SCORE.mercy;
    }

    this.touch();
    return replacement;
  }

  /** Draws the consequence for a refusal and pins it to the active turn. */
  drawConsequence(): Consequence | null {
    const turn = this.data.activeTurn;
    if (!turn) return null;

    const result = selectConsequence({
      pool: ALL_CONSEQUENCES,
      ageRating: MODES[this.data.mode].ageRating,
      playerCount: this.data.players.length,
      usedIds: this.data.usedConsequenceIds,
      rng: this.rng,
    });

    if (result.recycled) this.data.usedConsequenceIds = [];
    if (!result.item) return null;

    this.data.usedConsequenceIds.push(result.item.id);
    turn.consequenceId = result.item.id;
    this.touch();

    return result.item;
  }

  /** True while Double Down is a sensible offer — it is withdrawn on a skid of skips. */
  canDoubleDown(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    return player.consecutiveSkips < LIMITS.skipStreakGuard;
  }

  // ── outcomes ───────────────────────────────────────────────────────────────

  completeTurn(reaction?: Reaction): TurnRecord | null {
    return this.close('completed', reaction);
  }

  /** Refused, consequence accepted. */
  takeConsequence(): TurnRecord | null {
    return this.close('consequence');
  }

  /** Refused, consequence dodged — the next challenge comes in hotter instead. */
  doubleDown(): TurnRecord | null {
    const turn = this.data.activeTurn;
    if (!turn) return null;
    turn.doubledDown = true;

    const player = this.getPlayer(turn.playerId);
    if (player) player.pendingIntensityBoost = 1;

    return this.close('skipped');
  }

  private close(outcome: TurnRecord['outcome'], reaction?: Reaction): TurnRecord | null {
    const turn = this.data.activeTurn;
    if (!turn) return null;

    const player = this.getPlayer(turn.playerId);
    const prompt = getPrompt(turn.promptId);

    if (player) {
      player.turnsPlayed += 1;
      // Streak first — it is measured against the *previous* type, which the
      // next line is about to overwrite.
      player.sameTypeStreak = player.lastChallengeType === turn.type ? player.sameTypeStreak + 1 : 1;
      player.lastChallengeType = turn.type;
      if (turn.type === 'truth') player.truthsReceived += 1;
      else player.daresReceived += 1;

      if (outcome === 'completed') {
        player.consecutiveSkips = 0;
        player.chaosScore += SCORE.completed;
        if ((prompt?.intensity ?? 1) >= 4) player.chaosScore += SCORE.highIntensityBonus;
      } else {
        player.skips += 1;
        player.consecutiveSkips += 1;
        player.chaosScore += SCORE.skip;

        if (outcome === 'consequence') {
          player.consequencesTaken += 1;
          player.chaosScore += SCORE.consequenceTaken;
        }
        if (turn.doubledDown) {
          player.doubleDowns += 1;
          player.chaosScore += SCORE.doubleDown;
        }
      }

      if (reaction === 'valid') {
        player.validVotes += 1;
        player.chaosScore += SCORE.validReaction;
      } else if (reaction === 'cap') {
        player.capVotes += 1;
        player.chaosScore += SCORE.capReaction;
      }

      // The Double Down boost applies to the *next* challenge only, so it is
      // cleared here unless this very turn is the one that set it.
      if (!turn.doubledDown) player.pendingIntensityBoost = 0;
    }

    const record: TurnRecord = {
      round: this.data.currentRound,
      playerId: turn.playerId,
      type: turn.type,
      promptId: turn.promptId,
      outcome,
      at: this.now(),
    };
    if (turn.consequenceId) record.consequenceId = turn.consequenceId;
    if (reaction) record.reaction = reaction;
    if (turn.doubledDown) record.doubledDown = true;

    this.data.history.push(record);
    this.data.lastPlayerId = turn.playerId;
    this.data.activeTurn = null;
    this.data.currentPlayerId = null;
    this.touch();

    return record;
  }

  /** Attaches a reaction after the fact, for the flow where the vote follows completion. */
  recordReaction(reaction: Reaction): void {
    const last = this.data.history[this.data.history.length - 1];
    if (!last) return;

    last.reaction = reaction;
    const player = this.getPlayer(last.playerId);
    if (!player) return;

    if (reaction === 'valid') {
      player.validVotes += 1;
      player.chaosScore += SCORE.validReaction;
    } else {
      player.capVotes += 1;
      player.chaosScore += SCORE.capReaction;
    }
    this.touch();
  }

  // ── roster changes ─────────────────────────────────────────────────────────

  /** Removes a player mid-game, including from the pending queue. */
  removePlayer(playerId: string): boolean {
    if (this.data.players.length <= LIMITS.minPlayers) return false;

    this.data.players = this.data.players.filter((player) => player.id !== playerId);
    this.data.turnQueue = this.data.turnQueue.filter((id) => id !== playerId);
    if (this.data.currentPlayerId === playerId) this.data.currentPlayerId = null;
    if (this.data.lastPlayerId === playerId) this.data.lastPlayerId = null;
    if (this.data.activeTurn?.playerId === playerId) this.data.activeTurn = null;

    this.touch();
    return true;
  }

  endGame(): void {
    this.data.status = 'finished';
    this.data.activeTurn = null;
    this.touch();
  }

  private touch(): void {
    this.data.updatedAt = this.now();
  }
}

function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    turnsPlayed: 0,
    truthsReceived: 0,
    daresReceived: 0,
    skips: 0,
    consecutiveSkips: 0,
    consequencesTaken: 0,
    mercies: 0,
    doubleDowns: 0,
    validVotes: 0,
    capVotes: 0,
    lastChallengeType: null,
    sameTypeStreak: 0,
    chaosScore: 0,
    pendingIntensityBoost: 0,
  };
}

/** Guards against corrupted or stale persisted state. */
function isUsableState(state: unknown): state is GameState {
  if (!state || typeof state !== 'object') return false;
  const candidate = state as Partial<GameState>;

  return (
    candidate.version === STATE_VERSION &&
    Array.isArray(candidate.players) &&
    candidate.players.length >= LIMITS.minPlayers &&
    Array.isArray(candidate.turnQueue) &&
    Array.isArray(candidate.history) &&
    typeof candidate.gameId === 'string' &&
    typeof candidate.mode === 'string' &&
    candidate.mode in MODES
  );
}
