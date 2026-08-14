import type { GameMode, GameState } from '@/types';
import { GameEngine } from '@/game/engine/GameEngine';
import { clearSession, loadPreferences, loadSession, saveSession, savePreferences, type Preferences } from '@/game/state/persistence';
import { setHapticsEnabled } from '@/ui/haptics';
import { h, clear } from '@/ui/dom';
import { prefersReducedMotion, wait } from '@/ui/motion';

export type ScreenName =
  | 'splash'
  | 'resume'
  | 'home'
  | 'howto'
  | 'setup'
  | 'mode'
  | 'agegate'
  | 'intro'
  | 'wheel'
  | 'reveal'
  | 'challenge'
  | 'mercy'
  | 'consequence'
  | 'reaction'
  | 'recap'
  | 'error';

export interface ScreenView {
  el: HTMLElement;
  /** Runs once the screen is in the document. Drives timed reveal sequences. */
  onEnter?: () => void | Promise<void>;
  onExit?: () => void;
  /** Announced to screen readers on entry, since much of the drama is visual. */
  announce?: string;
  focus?: () => HTMLElement | null;
}

export type ScreenFactory = (app: App) => ScreenView;

/**
 * Where a hardware/browser Back gesture should go from each screen.
 *
 * `null` means "stay put" — mid-turn, Back is almost always a misfire, and
 * letting it close an installed PWA in the middle of someone's dare would be
 * the worst possible time to lose the room.
 */
const BACK_TARGETS: Partial<Record<ScreenName, ScreenName>> = {
  howto: 'home',
  setup: 'home',
  mode: 'setup',
  agegate: 'mode',
  intro: 'mode',
  resume: 'home',
};

export interface DraftGame {
  players: string[];
  mode: GameMode | null;
}

export class App {
  readonly root: HTMLElement;
  private readonly live: HTMLElement;
  private screens = new Map<ScreenName, ScreenFactory>();
  private current: ScreenView | null = null;
  private currentName: ScreenName = 'splash';
  private transitioning = false;
  private toastTimer: number | null = null;

  engine: GameEngine | null = null;
  draft: DraftGame = { players: ['', ''], mode: null };
  preferences: Preferences;

  constructor(root: HTMLElement) {
    this.root = root;
    this.preferences = loadPreferences();
    setHapticsEnabled(this.preferences.haptics);

    this.live = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.appendChild(this.live);

    // Nothing technical should ever reach a player mid-game.
    window.addEventListener('error', (event) => this.fail(event.error));
    window.addEventListener('unhandledrejection', (event) => this.fail(event.reason));

    this.installBackGuard();
  }

  /**
   * Keeps a spare history entry on the stack at all times so a Back gesture is
   * something the app can respond to rather than an exit.
   */
  private installBackGuard(): void {
    if (typeof history === 'undefined') return;
    history.pushState({ spill: true }, '');

    window.addEventListener('popstate', () => {
      // Immediately restore the buffer entry — otherwise the next Back leaves.
      history.pushState({ spill: true }, '');

      const target = BACK_TARGETS[this.currentName];
      if (target) void this.go(target);
      else if (this.currentName === 'recap') void this.go('home');
      else this.toast('Use the buttons — this one stays put');
    });
  }

  register(name: ScreenName, factory: ScreenFactory): void {
    this.screens.set(name, factory);
  }

  get screen(): ScreenName {
    return this.currentName;
  }

  /**
   * Navigates to a screen.
   *
   * `instant` skips the exit animation — used between the fast beats of a turn
   * (reveal → challenge) where a crossfade would break the rhythm.
   */
  async go(name: ScreenName, options: { instant?: boolean } = {}): Promise<void> {
    const factory = this.screens.get(name);
    if (!factory) {
      this.fail(new Error(`Unknown screen: ${name}`));
      return;
    }

    if (this.transitioning) return;
    this.transitioning = true;

    try {
      const outgoing = this.current;
      if (outgoing) {
        outgoing.onExit?.();
        if (!options.instant && !prefersReducedMotion()) {
          outgoing.el.classList.add('anim-page-exit');
          await wait(180);
        }
      }

      const view = factory(this);
      clear(this.root);
      view.el.classList.add('anim-page-enter');
      this.root.appendChild(view.el);

      this.current = view;
      this.currentName = name;
      document.body.dataset.app = isPlaying(name) ? 'playing' : 'browsing';

      if (view.announce) this.announce(view.announce);
      this.persist();

      // Focus management: give the screen a chance to place focus, otherwise
      // reset to the top so keyboard and screen-reader users are not stranded.
      const target = view.focus?.() ?? null;
      if (target) target.focus({ preventScroll: true });

      this.transitioning = false;
      await view.onEnter?.();
    } catch (error) {
      this.transitioning = false;
      this.fail(error);
    }
  }

  announce(message: string): void {
    this.live.textContent = '';
    // Re-setting after a tick guarantees repeat messages are announced again.
    setTimeout(() => {
      this.live.textContent = message;
    }, 60);
  }

  toast(message: string): void {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    if (this.toastTimer) clearTimeout(this.toastTimer);

    const node = h('div', { class: 'toast', role: 'status', text: message });
    document.body.appendChild(node);
    this.toastTimer = window.setTimeout(() => node.remove(), 2200);
  }

  // ── game lifecycle ─────────────────────────────────────────────────────────

  startGame(mode: GameMode): void {
    const names = this.draft.players.map((name) => name.trim()).filter(Boolean);
    this.engine = GameEngine.create({ players: names, mode });
    this.draft.mode = mode;
    this.persist();
  }

  resumeGame(state: GameState): boolean {
    const engine = GameEngine.resume(state);
    if (!engine) return false;

    this.engine = engine;
    this.draft.mode = state.mode;
    this.draft.players = state.players.map((player) => player.name);

    // `activeTurn` decides where to land. A turn in flight is restored to its
    // card — or to its consequence, if one had already been drawn — so nobody
    // loses a turn to a stray refresh. With no turn in flight, back to the wheel.
    const turn = engine.state.activeTurn;
    const landing: ScreenName = !turn ? 'wheel' : turn.consequenceId ? 'consequence' : 'challenge';

    void this.go(landing);
    return true;
  }

  endGame(): void {
    this.engine?.endGame();
    clearSession();
  }

  /** Discards the session entirely and returns to a clean slate. */
  reset(): void {
    this.engine = null;
    this.draft = { players: ['', ''], mode: null };
    clearSession();
  }

  persist(): void {
    if (!this.engine) return;
    if (this.engine.state.status !== 'active') return;
    if (!isPlaying(this.currentName)) return;

    saveSession(this.engine.snapshot(), this.currentName);
  }

  setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    this.preferences = { ...this.preferences, [key]: value };
    savePreferences(this.preferences);
    if (key === 'haptics') setHapticsEnabled(this.preferences.haptics);
  }

  /** Requires an engine; anything reaching a play screen without one is a bug. */
  requireEngine(): GameEngine {
    if (!this.engine) throw new Error('No game in progress.');
    return this.engine;
  }

  // ── failure ────────────────────────────────────────────────────────────────

  fail(error: unknown): void {
    // Useful detail stays in the console for development; players see a sentence.
    console.error('[spill]', error);
    if (this.currentName === 'error') return;
    void this.go('error', { instant: true });
  }

  static boot(root: HTMLElement): { app: App; saved: ReturnType<typeof loadSession> } {
    const app = new App(root);
    return { app, saved: loadSession() };
  }
}

function isPlaying(name: ScreenName): boolean {
  return ['wheel', 'reveal', 'challenge', 'mercy', 'consequence', 'reaction'].includes(name);
}
