/**
 * Domain types for the SPILL game engine.
 *
 * These types are deliberately transport-agnostic: `GameState` is a plain,
 * JSON-serialisable object so that a future multiplayer layer can synchronise
 * it over WebSockets/WebRTC without touching the engine or the UI.
 */

export type ChallengeType = 'truth' | 'dare';

export type Category =
  | 'funny'
  | 'tea'
  | 'friendship'
  | 'awkward'
  | 'crush'
  | 'deep'
  | 'chaos'
  | 'bold'
  | '18plus';

export type Intensity = 1 | 2 | 3 | 4 | 5;

export type AgeRating = 'general' | '18+';

export type PlayerMode = 'individual' | 'group';

export type GameMode = 'chill' | 'tea' | 'chaos' | 'bold' | '18plus';

export interface Prompt {
  id: string;
  text: string;
  type: ChallengeType;
  category: Category;
  intensity: Intensity;
  ageRating: AgeRating;
  playerMode: PlayerMode;
  requiresPhysicalAction: boolean;
  requiresAnotherPerson: boolean;
  /**
   * This dare is performed *with* a second player, who the engine picks and who
   * must opt in before the card is shown to the room.
   *
   * `requiresAnotherPerson` only means the prompt mentions someone else — a
   * compliment, an impression. `requiresPartner` means somebody else is
   * physically involved, which is a different thing entirely and is the flag the
   * consent step keys off.
   */
  requiresPartner?: boolean;
  /** Smallest group this prompt still works with. Defaults to 2. */
  minPlayers?: number;
}

export interface Consequence {
  id: string;
  text: string;
  intensity: Intensity;
  ageRating: AgeRating;
  playerMode: PlayerMode;
  requiresPhysicalAction: boolean;
  minPlayers?: number;
}

export interface Player {
  id: string;
  name: string;
  turnsPlayed: number;
  truthsReceived: number;
  daresReceived: number;
  skips: number;
  consecutiveSkips: number;
  consequencesTaken: number;
  mercies: number;
  doubleDowns: number;
  validVotes: number;
  capVotes: number;
  lastChallengeType: ChallengeType | null;
  /** How many times in a row this player has had `lastChallengeType`. */
  sameTypeStreak: number;
  /** History index of this player's last turn; -1 if they have not had one. */
  lastTurnIndex: number;
  chaosScore: number;
  /** Set by Double Down — raises the intensity band for this player's next turn only. */
  pendingIntensityBoost: number;
}

export type TurnOutcome = 'completed' | 'skipped' | 'consequence' | 'mercy' | 'abandoned';

export type Reaction = 'valid' | 'cap';

export interface TurnRecord {
  round: number;
  playerId: string;
  type: ChallengeType;
  promptId: string;
  outcome: TurnOutcome;
  consequenceId?: string;
  reaction?: Reaction;
  doubledDown?: boolean;
  at: number;
}

export type GameStatus = 'setup' | 'active' | 'finished';

/**
 * The turn currently in flight.
 *
 * Lives inside `GameState` rather than in the UI so a mid-challenge refresh can
 * be restored exactly, and so a future multiplayer layer can show every device
 * the same card.
 */
export interface ActiveTurn {
  playerId: string;
  type: ChallengeType;
  promptId: string;
  consequenceId: string | null;
  doubledDown: boolean;
  mercyUsed: boolean;
  /**
   * The second player in a partner dare. Set when the drawn prompt has
   * `requiresPartner`, and cleared if they decline — at which point the dare is
   * silently swapped for one that involves nobody else.
   */
  partnerId: string | null;
  /** True once the partner has opted in, which is when the card may be shown. */
  partnerAccepted: boolean;
  /** Intensity band actually used for the draw, for display and debugging. */
  band: Intensity[];
}

export interface GameState {
  /** Schema version — persisted state from an older shape is discarded on load. */
  version: number;
  gameId: string;
  players: Player[];
  currentRound: number;
  currentPlayerId: string | null;
  /**
   * Who the wheel is about to land on, decided before the spin animation starts
   * so the two can never disagree — and held in state so a refresh mid-spin
   * does not silently re-roll it.
   */
  pendingPlayerId: string | null;
  history: TurnRecord[];
  mode: GameMode;
  ageRating: AgeRating;
  intensity: Intensity;
  startedAt: number;
  updatedAt: number;
  status: GameStatus;
  /** Prompt ids already served this session, so the pool does not repeat. */
  usedPromptIds: string[];
  usedConsequenceIds: string[];
  /** Categories of the last few prompts, used to keep variety in selection. */
  recentCategories: Category[];
  /** Player id of the most recent turn, used to avoid back-to-back turns across rounds. */
  lastPlayerId: string | null;
  activeTurn: ActiveTurn | null;
}

export interface EngineConfig {
  players: string[];
  mode: GameMode;
  /** Deterministic RNG hook — tests inject a seeded generator. */
  random?: () => number;
  now?: () => number;
  idFactory?: () => string;
}

export interface ModeDefinition {
  id: GameMode;
  name: string;
  tagline: string;
  description: string;
  categories: Category[];
  ageRating: AgeRating;
  /** Highest intensity this mode will ever serve. */
  maxIntensity: Intensity;
  adult: boolean;
}

export interface SessionStats {
  rounds: number;
  turns: number;
  truths: number;
  dares: number;
  skips: number;
  consequences: number;
  mercies: number;
  doubleDowns: number;
}

export interface Award {
  id: string;
  title: string;
  playerId: string;
  playerName: string;
  detail: string;
}
