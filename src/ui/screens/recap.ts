import type { App, ScreenView } from '@/ui/app';
import { h } from '@/ui/dom';
import { haptic } from '@/ui/haptics';
import { beat } from '@/ui/motion';
import { button, screen, stat, topbar } from '@/ui/components/ui';
import { computeAwards, leaderboard, sessionStats } from '@/game/selectors/stats';
import { MODES } from '@/data/categories/modes';

/**
 * Session recap.
 *
 * Not a game-over screen — a summary of the night worth reading out loud, then
 * an obvious route back into another round.
 */
export function recapScreen(app: App): ScreenView {
  const engine = app.requireEngine();
  const state = engine.state;
  const stats = sessionStats(state);
  const awards = computeAwards(state);
  const standings = leaderboard(state);
  const mode = MODES[state.mode];

  // The session ends here: the saved game is cleared so a later visit starts fresh.
  app.endGame();

  const lines: Array<[string, number]> = [
    ['Rounds', stats.rounds],
    ['Turns', stats.turns],
    ['Truths', stats.truths],
    ['Dares', stats.dares],
    ['Nopes', stats.skips],
    ['Consequences', stats.consequences],
    ['Mercies', stats.mercies],
    ['Double downs', stats.doubleDowns],
  ];

  const played = stats.turns > 0;

  const el = screen(
    'between',
    topbar({ status: [mode.name, 'Recap'] }),
    h(
      'div',
      { class: 'screen__body recap__scroll' },
      h(
        'div',
        { class: 'recap' },
        h(
          'div',
          { class: 'stack stack--3' },
          h('p', { class: 'eyebrow', text: "That's the night" }),
          h('h1', { class: 'display display--lg', text: "Tonight's lore" }),
        ),

        played
          ? h(
              'div',
              { class: 'stat-grid' },
              stat(stats.rounds, 'Rounds'),
              stat(stats.truths, 'Truths'),
              stat(stats.dares, 'Dares'),
              stat(stats.skips, 'Nopes'),
            )
          : h('p', { class: 'lede', text: 'Nobody actually played. Bold strategy.' }),

        played
          ? h(
              'div',
              { class: 'stack stack--3' },
              h('p', { class: 'eyebrow', text: 'The receipts' }),
              h(
                'div',
                {},
                ...lines
                  .filter(([, value]) => value > 0)
                  .map(([label, value]) =>
                    h('div', { class: 'recap__line' }, h('span', { text: label }), h('b', { text: String(value) })),
                  ),
              ),
            )
          : null,

        played
          ? h(
              'div',
              { class: 'stack stack--3' },
              h('p', { class: 'eyebrow', text: 'Awards' }),
              h(
                'div',
                { class: 'stagger' },
                ...awards.map((award, index) => {
                  const node = h(
                    'div',
                    { class: 'award' },
                    h('p', { class: 'award__name', text: award.playerName }),
                    h('p', { class: 'award__title', text: award.title }),
                    h('p', { class: 'award__detail', text: award.detail }),
                  );
                  node.style.setProperty('--i', String(index));
                  return node;
                }),
              ),
            )
          : null,

        played
          ? h(
              'div',
              { class: 'stack stack--3' },
              h('p', { class: 'eyebrow', text: 'Chaos score' }),
              h(
                'div',
                {},
                ...standings.map((player) =>
                  h(
                    'div',
                    { class: 'recap__line' },
                    h('span', { text: player.name }),
                    h('b', { text: String(player.chaosScore) }),
                  ),
                ),
              ),
            )
          : null,
      ),
    ),
    h(
      'div',
      { class: 'screen__actions' },
      button({
        label: 'Play again',
        hint: 'Same crew, same mode',
        variant: 'primary',
        size: 'lg',
        onPress: () => {
          try {
            app.startGame(state.mode);
            void app.go('wheel');
          } catch (error) {
            app.fail(error);
          }
        },
      }),
      button({
        label: 'New game',
        variant: 'secondary',
        onPress: () => {
          app.reset();
          void app.go('home');
        },
      }),
    ),
  );

  return {
    el,
    announce: `Recap. ${stats.rounds} rounds, ${stats.truths} truths, ${stats.dares} dares.`,
    async onEnter() {
      await beat(240);
      if (played) haptic('end');
    },
  };
}
