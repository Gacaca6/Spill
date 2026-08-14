import type { App, ScreenView } from '@/ui/app';
import { TIMING } from '@/config';
import { h, clear, lengthClass } from '@/ui/dom';
import { haptic } from '@/ui/haptics';
import { beat, prefersReducedMotion } from '@/ui/motion';
import { button, screen, topbar } from '@/ui/components/ui';
import { createWheel } from '@/ui/components/wheel';
import { MODES, INTENSITY_LABELS } from '@/data/categories/modes';

/**
 * Gameplay.
 *
 * The turn loop is: anticipation → reveal → tension → laughter → reaction →
 * consequence → next. Each screen owns one beat of it and hands off cleanly.
 */

/**
 * Waits, but lets an impatient group tap through.
 *
 * Timed drama is great the first three times and irritating by the tenth — so
 * every pause in a reveal sequence is skippable by tapping anywhere.
 */
function tapThrough(el: HTMLElement) {
  /** Set while a pause is in flight, so a tap can end it early. */
  let finishEarly: (() => void) | null = null;

  const onTap = () => finishEarly?.();
  el.addEventListener('pointerdown', onTap);

  return {
    pause(ms: number): Promise<void> {
      return new Promise<void>((resolve) => {
        // One timer per pause, raced against a tap. Polling in small steps
        // instead would multiply into dozens of timers per reveal, and browsers
        // throttle timers hard in a backgrounded tab — which would stretch a
        // 1.1s beat into half a minute.
        const target = prefersReducedMotion() ? Math.min(ms, 320) : ms;

        const done = () => {
          clearTimeout(timer);
          finishEarly = null;
          resolve();
        };

        const timer = setTimeout(done, target);
        finishEarly = done;
      });
    },
    dispose() {
      finishEarly?.();
      el.removeEventListener('pointerdown', onTap);
    },
  };
}

/** The wheel screen. Central gameplay surface. */
export function wheelScreen(app: App): ScreenView {
  const engine = app.requireEngine();
  const mode = MODES[engine.state.mode];

  const wheel = createWheel();
  wheel.setPlayers(engine.state.players.map((player) => ({ id: player.id, name: player.name })));

  const status = h('p', { class: 'wheel-status', text: '' });
  const spin = h('button', {
    class: 'spin-btn',
    type: 'button',
    text: 'Spin',
  });

  let busy = false;

  async function runSpin(): Promise<void> {
    if (busy || wheel.isSpinning()) return;
    busy = true;
    spin.setAttribute('disabled', '');
    status.textContent = 'Choosing…';

    try {
      // The engine decides; the wheel only shows the decision.
      const chosen = engine.peekNextPlayer();
      await wheel.spinTo(chosen.id);

      status.textContent = '';
      app.announce(`${chosen.name} is up`);

      // Suspense: the wheel has stopped but the name has not landed yet.
      await beat(TIMING.suspense);

      engine.nextPlayer();
      engine.beginTurn(chosen.id);
      app.persist();
      await app.go('reveal', { instant: true });
    } catch (error) {
      app.fail(error);
    } finally {
      busy = false;
    }
  }

  spin.addEventListener('click', () => {
    haptic('press');
    void runSpin();
  });

  const el = screen(
    'between',
    topbar({
      back: { label: 'End game', onPress: () => void app.go('recap') },
      status: [`Round ${engine.state.currentRound}`, mode.name],
    }),
    h('div', { class: 'wheel-stage' }, wheel.el),
    h('div', { class: 'stack stack--3' }, status, spin),
  );

  return {
    el,
    announce: `Round ${engine.state.currentRound}. Spin the wheel.`,
    focus: () => spin,
    async onEnter() {
      // A short "next up" beat between turns, so rounds do not blur together.
      if (engine.state.history.length > 0) {
        status.textContent = 'Next up…';
        status.classList.add('anim-pulse');
        await beat(760);
        status.classList.remove('anim-pulse');
        status.textContent = '';
      }
    },
  };
}

/**
 * Player reveal into challenge type.
 *
 * Kept as one screen rather than three so the beats can be tuned as a single
 * rhythm — and so a tap can carry the group through all of them at once.
 */
export function revealScreen(app: App): ScreenView {
  const engine = app.requireEngine();
  const player = engine.currentPlayer;
  const turn = engine.state.activeTurn;

  if (!player || !turn) {
    return { el: screen('center'), onEnter: () => void app.go('wheel') };
  }

  const stage = h('div', { class: 'reveal' });
  const el = screen('center', stage);
  const taps = tapThrough(el);

  return {
    el,
    announce: `${player.name}, you're up. ${turn.type}.`,
    onExit: () => taps.dispose(),
    async onEnter() {
      clear(stage);

      const name = h('h1', {
        class: 'display display--lg reveal__name anim-reveal-name',
        'data-length': lengthClass(player.name, 12),
        text: player.name,
      });
      stage.appendChild(name);
      haptic('reveal');

      await taps.pause(TIMING.revealHold);

      stage.appendChild(h('p', { class: 'reveal__line anim-rise', text: "You're up." }));
      await taps.pause(820);

      // The type is assigned, never chosen — stating it flatly makes the
      // alternation rule feel deliberate rather than restrictive.
      clear(stage);
      stage.appendChild(
        h(
          'div',
          { class: 'type-reveal' },
          h('p', { class: 'eyebrow', text: player.name }),
          h('p', { class: 'reveal__line', text: 'Your turn.' }),
          h('p', { class: 'type-reveal__word anim-stamp', text: `${turn.type}.` }),
        ),
      );
      haptic('reveal');

      await taps.pause(TIMING.typeHold);
      await app.go('challenge', { instant: true });
    },
  };
}

/** The challenge card. */
export function challengeScreen(app: App): ScreenView {
  const engine = app.requireEngine();
  const player = engine.currentPlayer;
  const prompt = engine.activePrompt;
  const turn = engine.state.activeTurn;

  if (!player || !prompt || !turn) {
    return { el: screen('center'), onEnter: () => void app.go('wheel') };
  }

  const canAskMercy = engine.state.players.length >= 3 && !turn.mercyUsed;

  const card = h(
    'article',
    { class: 'card card--challenge anim-card' },
    h('p', { class: 'card__label', text: turn.type }),
    h('p', { class: 'card__text', 'data-length': lengthClass(prompt.text), text: prompt.text }),
    h(
      'div',
      { class: 'card__footer' },
      h('span', { text: player.name }),
      h('span', { text: INTENSITY_LABELS[prompt.intensity] ?? '' }),
    ),
  );

  const el = screen(
    'between',
    topbar({ status: [`Round ${engine.state.currentRound}`, player.name] }),
    h(
      'div',
      { class: 'screen__body challenge' },
      card,
      h(
        'div',
        { class: 'challenge__actions' },
        button({
          label: 'I did it',
          variant: 'primary',
          size: 'lg',
          onPress: () => void app.go('reaction'),
        }),
        button({
          label: 'Nope',
          variant: 'secondary',
          onPress: () => {
            try {
              engine.drawConsequence();
              app.persist();
              void app.go('consequence', { instant: true });
            } catch (error) {
              app.fail(error);
            }
          },
        }),
        canAskMercy ? button({ label: 'Ask for mercy', variant: 'quiet', onPress: () => void app.go('mercy') }) : null,
      ),
    ),
  );

  return { el, announce: `${turn.type}. ${prompt.text}` };
}

/** The mercy vote. The group decides; the player keeps their nope either way. */
export function mercyScreen(app: App): ScreenView {
  const engine = app.requireEngine();
  const player = engine.currentPlayer;

  if (!player || !engine.state.activeTurn) {
    return { el: screen('center'), onEnter: () => void app.go('wheel') };
  }

  const el = screen(
    'center',
    h(
      'div',
      { class: 'stack stack--6' },
      h(
        'div',
        { class: 'stack stack--3' },
        h('p', { class: 'eyebrow', text: `${player.name} is begging` }),
        h('h1', { class: 'display display--md', text: 'The court will decide.' }),
        h('p', { class: 'lede', text: 'Everyone else votes. Majority wins, no appeals.' }),
      ),
      h(
        'div',
        { class: 'split' },
        button({
          label: 'Grant mercy',
          variant: 'primary',
          onPress: () => {
            const replacement = engine.grantMercy();
            app.persist();
            app.toast(replacement ? 'The court has spoken' : 'Nothing left to swap');
            void app.go('challenge', { instant: true });
          },
        }),
        button({
          label: 'No mercy',
          variant: 'secondary',
          onPress: () => {
            haptic('consequence');
            app.toast('No mercy');
            void app.go('challenge', { instant: true });
          },
        }),
      ),
      h('p', { class: 'meta', text: 'Mercy or not, they can still say nope.' }),
    ),
  );

  return { el, announce: 'Mercy vote. Grant mercy or no mercy?' };
}

/** The consequence, revealed with a little theatre. */
export function consequenceScreen(app: App): ScreenView {
  const engine = app.requireEngine();
  const player = engine.currentPlayer;
  const consequence = engine.activeConsequence;

  if (!player || !consequence) {
    return { el: screen('center'), onEnter: () => void app.go('wheel') };
  }

  const stage = h('div', { class: 'screen__body challenge', style: 'justify-content: center' });
  const el = screen('between', topbar({ status: [player.name] }), stage);
  const taps = tapThrough(el);

  return {
    el,
    announce: `Consequence. ${consequence.text}`,
    onExit: () => taps.dispose(),
    async onEnter() {
      clear(stage);

      const line = h('p', { class: 'consequence__intro anim-stamp', text: "Oh. You're running." });
      stage.appendChild(line);
      haptic('consequence');
      await taps.pause(900);

      line.textContent = 'Fair. We respect the nope.';
      line.classList.remove('anim-stamp');
      line.classList.add('anim-rise');
      await taps.pause(900);

      line.textContent = "But there's a consequence.";
      await taps.pause(760);

      clear(stage);
      stage.appendChild(
        h(
          'article',
          { class: 'card card--challenge card--consequence anim-card' },
          h('p', { class: 'card__label', text: 'Consequence' }),
          h('p', { class: 'card__text', 'data-length': lengthClass(consequence.text), text: consequence.text }),
        ),
      );
      haptic('reveal');

      stage.appendChild(
        h(
          'div',
          { class: 'challenge__actions anim-rise delay-2' },
          button({
            label: 'Take it',
            variant: 'primary',
            size: 'lg',
            onPress: () => {
              engine.takeConsequence();
              app.persist();
              void app.go('wheel');
            },
          }),
          engine.canDoubleDown(player.id)
            ? button({
                label: 'Double down',
                hint: 'Skip this — next one hits harder',
                variant: 'secondary',
                onPress: () => {
                  engine.doubleDown();
                  app.persist();
                  app.toast('Your next one hits harder');
                  void app.go('wheel');
                },
              })
            : null,
        ),
      );
    },
  };
}

/**
 * The verdict.
 *
 * Two taps at most: the group calls it, and if they call cap the player gets one
 * chance to defend before the room settles it.
 */
export function reactionScreen(app: App): ScreenView {
  const engine = app.requireEngine();
  const player = engine.currentPlayer;

  if (!player || !engine.state.activeTurn) {
    return { el: screen('center'), onEnter: () => void app.go('wheel') };
  }

  const stage = h('div', { class: 'stack stack--6' });
  const el = screen('center', stage);

  function finish(reaction: 'valid' | 'cap'): void {
    engine.completeTurn(reaction);
    app.persist();
    app.toast(reaction === 'valid' ? 'Logged' : 'Noted, allegedly');
    void app.go('wheel');
  }

  function renderVerdict(): void {
    clear(stage);
    stage.append(
      h(
        'div',
        { class: 'stack stack--3' },
        h('p', { class: 'eyebrow', text: player!.name }),
        h('h1', { class: 'display display--md', text: 'Was that valid?' }),
      ),
      h(
        'div',
        { class: 'split' },
        button({ label: 'Valid', variant: 'primary', onPress: () => finish('valid') }),
        button({ label: 'Cap', variant: 'secondary', onPress: renderDefence }),
      ),
    );
  }

  function renderDefence(): void {
    haptic('consequence');
    clear(stage);
    stage.append(
      h(
        'div',
        { class: 'stack stack--3 anim-rise' },
        h('p', { class: 'eyebrow', text: 'The room said cap' }),
        h('h1', { class: 'display display--md', text: 'Defend yourself.' }),
        h('p', { class: 'lede', text: 'Thirty seconds. No receipts required — just make it convincing.' }),
      ),
      h(
        'div',
        { class: 'split' },
        button({ label: "They're good", variant: 'primary', onPress: () => finish('valid') }),
        button({ label: 'Still cap', variant: 'secondary', onPress: () => finish('cap') }),
      ),
    );
  }

  renderVerdict();

  return { el, announce: 'Was that valid?' };
}
