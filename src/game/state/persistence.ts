import type { GameState } from '@/types';
import { STORAGE_KEYS, STATE_VERSION } from '@/config';

/**
 * Local persistence.
 *
 * Only game mechanics are stored — names, counters and prompt ids. Nothing a
 * player *says* is ever written down, so a saved session can never become a
 * record of anybody's secrets.
 *
 * Storage can be unavailable (private browsing, disabled cookies, full quota).
 * Every call is defensive: losing persistence degrades the resume feature, it
 * never breaks the game.
 */

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface SavedSession {
  state: GameState;
  /** Screen to restore to, so a refresh mid-challenge lands where it left off. */
  screen: string;
  savedAt: number;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__spill_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function saveSession(state: GameState, screen: string): void {
  const store = storage();
  if (!store) return;

  try {
    const payload: SavedSession = { state, screen, savedAt: Date.now() };
    store.setItem(STORAGE_KEYS.session, JSON.stringify(payload));
  } catch {
    /* quota or serialisation failure — the game continues in memory */
  }
}

export function loadSession(): SavedSession | null {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(STORAGE_KEYS.session);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedSession>;
    if (!parsed?.state || parsed.state.version !== STATE_VERSION) {
      clearSession();
      return null;
    }

    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearSession();
      return null;
    }

    if (parsed.state.status === 'finished') {
      clearSession();
      return null;
    }

    return { state: parsed.state, screen: parsed.screen ?? 'wheel', savedAt: parsed.savedAt };
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  try {
    storage()?.removeItem(STORAGE_KEYS.session);
  } catch {
    /* nothing to do */
  }
}

/**
 * Preferences.
 *
 * Deliberately tiny. The game ships with no sound at all — it has to work
 * perfectly muted in a loud room, and a monochrome product this quiet does not
 * need an audio layer to carry it.
 */
export interface Preferences {
  haptics: boolean;
}

const DEFAULT_PREFERENCES: Preferences = { haptics: true };

export function loadPreferences(): Preferences {
  const store = storage();
  if (!store) return { ...DEFAULT_PREFERENCES };

  try {
    const raw = store.getItem(STORAGE_KEYS.prefs);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : DEFAULT_PREFERENCES.haptics,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    storage()?.setItem(STORAGE_KEYS.prefs, JSON.stringify(preferences));
  } catch {
    /* preferences are a nicety, not a requirement */
  }
}
