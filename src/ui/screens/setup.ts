import type { App, ScreenView } from '@/ui/app';
import type { GameMode } from '@/types';
import { LIMITS } from '@/config';
import { h, clear } from '@/ui/dom';
import { haptic } from '@/ui/haptics';
import { button, consentNote, screen, topbar } from '@/ui/components/ui';
import { MODES, MODE_ORDER } from '@/data/categories/modes';
import { normalizeName } from '@/utils/names';

/** Player setup. The only text entry in the entire product. */
export function setupScreen(app: App): ScreenView {
  const list = h('div', { class: 'setup__list' });
  const counter = h('span', { class: 'meta setup__count' });
  const addButton = button({ label: 'Add player', variant: 'secondary', onPress: () => addRow() });
  const continueButton = button({
    label: 'Choose a mode',
    variant: 'primary',
    size: 'lg',
    onPress: () => {
      commit();
      if (validNames().length < LIMITS.minPlayers) return;
      void app.go('mode');
    },
  });

  function validNames(): string[] {
    return app.draft.players.map(normalizeName).filter(Boolean);
  }

  function commit(): void {
    for (const [index, input] of inputs().entries()) {
      app.draft.players[index] = input.value;
    }
  }

  function inputs(): HTMLInputElement[] {
    return [...list.querySelectorAll<HTMLInputElement>('.player-row__input')];
  }

  function refreshState(): void {
    const count = validNames().length;
    counter.textContent = `${count} ${count === 1 ? 'player' : 'players'}`;
    continueButton.toggleAttribute('disabled', count < LIMITS.minPlayers);
    addButton.toggleAttribute('disabled', app.draft.players.length >= LIMITS.maxPlayers);
  }

  function addRow(): void {
    commit();
    if (app.draft.players.length >= LIMITS.maxPlayers) {
      app.toast(`${LIMITS.maxPlayers} players max`);
      return;
    }
    app.draft.players.push('');
    renderRows();
    inputs().at(-1)?.focus();
  }

  function removeRow(index: number): void {
    commit();
    if (app.draft.players.length <= LIMITS.minPlayers) {
      app.toast('You need at least two');
      return;
    }
    app.draft.players.splice(index, 1);
    haptic('press');
    renderRows();
  }

  function renderRows(): void {
    clear(list);

    if (app.draft.players.length === 0) {
      list.appendChild(
        h(
          'div',
          { class: 'empty-state' },
          h('p', { class: 'display display--sm', text: 'No players yet.' }),
          h('p', { class: 'lede', text: 'Add some friends.' }),
        ),
      );
      refreshState();
      return;
    }

    app.draft.players.forEach((name, index) => {
      const input = h('input', {
        class: 'player-row__input',
        type: 'text',
        value: name,
        placeholder: index === 0 ? 'First one in' : 'Name',
        maxlength: String(LIMITS.maxNameLength),
        autocomplete: 'off',
        autocapitalize: 'words',
        spellcheck: 'false',
        'aria-label': `Player ${index + 1} name`,
        // Sync the draft on every keystroke — the counter and the continue
        // button both read from it, so they would otherwise lag a screen behind.
        onInput: () => {
          commit();
          refreshState();
        },
        onKeydown: (event: KeyboardEvent) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          const next = inputs()[index + 1];
          if (next) next.focus();
          else addRow();
        },
      }) as HTMLInputElement;

      const remove = h('button', {
        class: 'icon-btn',
        type: 'button',
        'aria-label': `Remove player ${index + 1}`,
        text: '×',
        onClick: () => removeRow(index),
      });

      list.appendChild(
        h(
          'div',
          { class: 'player-row' },
          h('span', { class: 'player-row__index', text: String(index + 1).padStart(2, '0') }),
          input,
          remove,
        ),
      );
    });

    refreshState();
  }

  renderRows();

  const el = screen(
    'between',
    topbar({
      back: {
        label: 'Back',
        onPress: () => {
          commit();
          void app.go('home');
        },
      },
      status: ['Setup'],
    }),
    h(
      'div',
      { class: 'screen__body stack stack--5' },
      h(
        'div',
        { class: 'stack stack--2' },
        h('h1', { class: 'display display--md', text: "Who's here?" }),
        h('div', { class: 'row row--between' }, h('span', { class: 'meta', text: 'Two minimum. Six is the sweet spot.' }), counter),
      ),
      list,
      addButton,
    ),
    h('div', { class: 'screen__actions' }, continueButton),
  );

  return {
    el,
    announce: "Who's here? Add the players.",
    focus: () => list.querySelector<HTMLInputElement>('.player-row__input'),
    onExit: commit,
  };
}

/** Mode selection. The adult mode is visible and labelled, never hidden. */
export function modeScreen(app: App): ScreenView {
  function choose(mode: GameMode): void {
    if (MODES[mode].adult) {
      app.draft.mode = mode;
      void app.go('agegate');
      return;
    }

    try {
      app.startGame(mode);
      void app.go('intro');
    } catch (error) {
      app.fail(error);
    }
  }

  const tiles = MODE_ORDER.map((mode) => {
    const definition = MODES[mode];

    return h(
      'button',
      {
        class: 'tile',
        type: 'button',
        'aria-pressed': 'false',
        onClick: () => choose(mode),
      },
      h(
        'span',
        {},
        h('span', { class: 'tile__name', text: definition.name }),
        h('span', { class: 'tile__tagline', text: definition.tagline }),
      ),
      definition.adult ? h('span', { class: 'tile__lock', text: '18+' }) : h('span', { 'aria-hidden': 'true', text: '→' }),
    );
  });

  const el = screen(
    'between',
    topbar({ back: { label: 'Players', onPress: () => void app.go('setup') }, status: ['Mode'] }),
    h(
      'div',
      { class: 'screen__body stack stack--5' },
      h('h1', { class: 'display display--md', text: 'Pick your poison' }),
      h('div', { class: 'stack stack--3 stagger' }, ...tiles.map((tile, index) => {
        tile.style.setProperty('--i', String(index));
        return tile;
      })),
      consentNote(),
    ),
  );

  return { el, announce: 'Choose a game mode' };
}

/**
 * Age gate.
 *
 * Self-attestation, and it says so. A local PWA cannot verify anyone's age, so
 * pretending otherwise with a date picker would only teach people to lie.
 */
export function ageGateScreen(app: App): ScreenView {
  const el = screen(
    'center',
    h(
      'div',
      { class: 'agegate' },
      h('p', { class: 'agegate__mark', text: '18+' }),
      h('h1', { class: 'display display--sm', text: 'Adults only' }),
      h('p', {
        class: 'lede',
        text: 'This mode contains adult-oriented questions and challenges — flirtation, dating and adult humour. Nothing in it is compulsory, and anyone can skip anything.',
      }),
      h('p', {
        class: 'meta',
        text: "We can't verify your age. This is you telling us the truth.",
      }),
      h(
        'div',
        { class: 'stack stack--3' },
        button({
          label: 'I am 18 or older',
          variant: 'primary',
          size: 'lg',
          onPress: () => {
            try {
              app.startGame('18plus');
              void app.go('intro');
            } catch (error) {
              app.fail(error);
            }
          },
        }),
        button({
          label: 'I am under 18',
          variant: 'secondary',
          onPress: () => {
            app.draft.mode = null;
            app.toast('Back to the general modes');
            void app.go('mode');
          },
        }),
      ),
    ),
  );

  return { el, announce: 'Adult mode. You must be 18 or older to continue.' };
}

/** The rules, stated once, right before the first spin. */
export function introScreen(app: App): ScreenView {
  const engine = app.engine;
  const mode = engine ? MODES[engine.state.mode] : null;

  const rules: Array<[string, string]> = [
    ['01', 'Nobody gets picked twice before everyone plays.'],
    ['02', 'No same challenge type twice in a row.'],
    ['03', 'You can always say nope.'],
    ['04', 'But nope has consequences.'],
  ];

  const el = screen(
    'between',
    topbar({ back: { label: 'Mode', onPress: () => void app.go('mode') }, status: mode ? [mode.name] : [] }),
    h(
      'div',
      { class: 'screen__body stack stack--6', style: 'justify-content: center' },
      h('h1', { class: 'display display--md', text: 'Everyone ready?' }),
      h(
        'ol',
        { class: 'rules stagger' },
        ...rules.map(([num, text], index) => {
          const item = h(
            'li',
            { class: 'rules__item' },
            h('span', { class: 'rules__num', text: num }),
            h('span', { class: 'rules__text', text }),
          );
          item.style.setProperty('--i', String(index + 1));
          return item;
        }),
      ),
    ),
    h(
      'div',
      { class: 'screen__actions' },
      button({ label: "Let's go", variant: 'primary', size: 'lg', onPress: () => void app.go('wheel') }),
    ),
  );

  return { el, announce: 'Everyone ready? The rules.' };
}
