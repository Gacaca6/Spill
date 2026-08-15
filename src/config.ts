/**
 * Central branding + tuning configuration.
 *
 * The product name lives here and nowhere else, so it can be replaced without
 * touching the architecture.
 */

export const APP_NAME = 'SPILL';
export const APP_TAGLINE = 'Truth or dare, but make it personal.';
export const APP_DESCRIPTION =
  'A party game for people in the same room. Spin, get picked, tell the truth or take the dare. No accounts, no internet, no mercy.';

/** Bumping this invalidates any saved session that no longer matches the schema. */
export const STATE_VERSION = 1;

export const STORAGE_KEYS = {
  session: 'spill:session:v1',
  prefs: 'spill:prefs:v1',
  icon: 'spill:icon:v1',
} as const;

export const LIMITS = {
  minPlayers: 2,
  maxPlayers: 16,
  maxNameLength: 18,
  /** Consecutive skips before the game gently stops offering Double Down. */
  skipStreakGuard: 3,
  /** How many recent categories the selector tries to avoid repeating. */
  categoryMemory: 3,
} as const;

/** Motion timings, in ms. Kept in one place so the whole app feels consistent. */
export const TIMING = {
  /** Held long enough to read as a brand moment. Tapping skips it. */
  splash: 4000,
  spinMin: 3600,
  spinMax: 4600,
  suspense: 900,
  revealHold: 1100,
  typeHold: 1200,
  transition: 420,
} as const;
