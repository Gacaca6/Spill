import type { App, ScreenView } from '@/ui/app';
import { APP_NAME, APP_TAGLINE, TIMING } from '@/config';
import { h } from '@/ui/dom';
import { beat } from '@/ui/motion';
import { button, consentNote, screen, topbar } from '@/ui/components/ui';
import { loadSession } from '@/game/state/persistence';
import { MODES } from '@/data/categories/modes';

/**
 * Splash.
 *
 * A held brand moment — but a group waiting to play should never be blocked by
 * it, so a tap anywhere cuts it short and goes straight in.
 */
export function splashScreen(app: App): ScreenView {
  const el = screen(
    'center',
    h(
      'div',
      { class: 'splash' },
      // The tagline lives inside the wordmark so it hangs beneath it without
      // affecting what gets centred.
      h(
        'h1',
        { class: 'wordmark wordmark--xl splash__mark', text: APP_NAME },
        h('span', { class: 'splash__tagline', text: APP_TAGLINE }),
      ),
      h('p', { class: 'splash__skip', text: 'Tap to skip' }),
    ),
  );

  return {
    el,
    announce: APP_NAME,
    async onEnter() {
      let advanced = false;

      const proceed = () => {
        if (advanced) return;
        advanced = true;
        const saved = loadSession();
        void app.go(saved ? 'resume' : 'home');
      };

      const timer = window.setTimeout(proceed, TIMING.splash);
      el.addEventListener(
        'pointerdown',
        () => {
          clearTimeout(timer);
          proceed();
        },
        { once: true },
      );
    },
  };
}

/** Offered only when an unfinished session is found on this device. */
export function resumeScreen(app: App): ScreenView {
  const saved = loadSession();

  if (!saved) {
    return { el: screen('center'), onEnter: () => void app.go('home') };
  }

  const { state } = saved;
  const names = state.players.map((player) => player.name).join(', ');
  const round = state.currentRound;

  const el = screen(
    'center',
    h(
      'div',
      { class: 'stack stack--6' },
      h('div', { class: 'stack stack--3' },
        h('p', { class: 'eyebrow', text: 'Unfinished business' }),
        h('h1', { class: 'display display--md', text: 'Resume game?' }),
        h('p', { class: 'lede', text: `Round ${round} · ${MODES[state.mode].name} · ${names}` }),
      ),
      h(
        'div',
        { class: 'stack stack--3' },
        button({
          label: 'Resume',
          variant: 'primary',
          size: 'lg',
          onPress: () => {
            if (!app.resumeGame(state)) {
              app.reset();
              void app.go('home');
            }
          },
        }),
        button({
          label: 'Start new game',
          variant: 'secondary',
          onPress: () => {
            app.reset();
            void app.go('home');
          },
        }),
      ),
    ),
  );

  return { el, announce: 'Resume your unfinished game?' };
}

/** Home. One decision, one door. */
export function homeScreen(app: App): ScreenView {
  const el = screen(
    'between',
    topbar({ status: [APP_NAME] }),
    h(
      'div',
      { class: 'screen__body stack stack--6', style: 'justify-content: center' },
      h('h1', {
        class: 'display display--lg home__headline',
        text: 'Ready to get a little uncomfortable?',
      }),
      h('p', { class: 'lede', text: 'Two or more people, one room, no phones needed after this screen.' }),
    ),
    h(
      'div',
      { class: 'screen__actions' },
      button({
        label: 'Start a game',
        variant: 'primary',
        size: 'lg',
        onPress: () => void app.go('setup'),
      }),
      button({ label: 'How to play', variant: 'quiet', onPress: () => void app.go('howto') }),
    ),
  );

  return { el, announce: 'Ready to get a little uncomfortable?' };
}

export function howToScreen(app: App): ScreenView {
  const rules: Array<[string, string, string]> = [
    ['01', 'The wheel picks. Not you.', 'Nobody gets picked twice until everyone has had a turn.'],
    ['02', 'Truth or dare is assigned.', 'You never get the same type twice in a row. No choosing your way out.'],
    ['03', 'You can always say nope.', 'Refusing is allowed, always. It just costs you a consequence.'],
    ['04', 'The group can show mercy.', 'Ask the room. If they vote yes, you get a different challenge.'],
    ['05', 'Or double down.', 'Dodge the consequence and your next challenge comes back harder.'],
    ['06', 'It escalates.', 'The longer you play, the more personal it gets. That is the whole point.'],
  ];

  const el = screen(
    'between',
    topbar({ back: { label: 'Back', onPress: () => void app.go('home') }, status: ['How to play'] }),
    h(
      'div',
      { class: 'screen__body howto stack stack--6' },
      h('h1', { class: 'display display--md', text: 'How this works' }),
      h(
        'ol',
        { class: 'rules' },
        ...rules.map(([num, title, note]) =>
          h(
            'li',
            { class: 'rules__item' },
            h('span', { class: 'rules__num', text: num }),
            h('span', { class: 'rules__text', text: title }, h('span', { class: 'rules__note', text: note })),
          ),
        ),
      ),
      consentNote(),
      hapticsToggle(app),
    ),
    h('div', { class: 'screen__actions' }, button({ label: 'Got it', variant: 'primary', onPress: () => void app.go('home') })),
  );

  return { el, announce: 'How to play' };
}

/**
 * The one setting worth exposing. Hidden on devices without a vibration motor
 * rather than shown as a control that does nothing.
 */
function hapticsToggle(app: App): HTMLElement | null {
  const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  if (!supported) return null;

  const toggle = h('button', {
    class: 'toggle',
    type: 'button',
    role: 'switch',
    'aria-checked': String(app.preferences.haptics),
  },
    h('span', { class: 'toggle__label', text: 'Vibration' }),
    h('span', { class: 'toggle__state', text: app.preferences.haptics ? 'On' : 'Off' }),
  );

  toggle.addEventListener('click', () => {
    const next = !app.preferences.haptics;
    app.setPreference('haptics', next);
    toggle.setAttribute('aria-checked', String(next));
    const state = toggle.querySelector('.toggle__state');
    if (state) state.textContent = next ? 'On' : 'Off';
  });

  return toggle;
}

/** The only error surface. Never shows a stack trace to a room full of people. */
export function errorScreen(app: App): ScreenView {
  const el = screen(
    'center',
    h(
      'div',
      { class: 'error-screen stack stack--5' },
      h('h1', { class: 'display display--md', text: 'Something went sideways.' }),
      h('p', { class: 'lede', text: "Nothing's broken on your end. Let's pick it back up." }),
      h(
        'div',
        { class: 'stack stack--3' },
        app.engine
          ? button({ label: 'Back to the wheel', variant: 'primary', onPress: () => void app.go('wheel') })
          : null,
        button({
          label: 'Start over',
          variant: app.engine ? 'secondary' : 'primary',
          onPress: () => {
            app.reset();
            void app.go('home');
          },
        }),
      ),
    ),
  );

  return { el, announce: 'Something went wrong. Try again.' };
}
