import { h, type Props } from '@/ui/dom';
import { haptic } from '@/ui/haptics';

/** Shared building blocks so every screen speaks the same visual language. */

export function screen(modifier: '' | 'center' | 'between', ...children: (Node | string | false | null)[]): HTMLElement {
  const classes = ['screen', modifier && `screen--${modifier}`].filter(Boolean).join(' ');
  return h('div', { class: classes }, ...children);
}

interface ButtonOptions extends Props {
  label: string;
  hint?: string;
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'lg';
  onPress: () => void;
}

export function button({ label, hint, variant = 'secondary', size, onPress, ...rest }: ButtonOptions): HTMLButtonElement {
  // A hint turns the button into a two-line stack; without it the label centres.
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, hint && 'btn--stacked', 'btn--full']
    .filter(Boolean)
    .join(' ');

  return h(
    'button',
    {
      class: classes,
      type: 'button',
      ...rest,
      onClick: () => {
        haptic('press');
        onPress();
      },
    },
    h('span', { text: label }),
    hint ? h('span', { class: 'btn__hint', text: hint }) : null,
  );
}

export function topbar(options: {
  back?: { label: string; onPress: () => void };
  status?: string[];
  action?: HTMLElement;
}): HTMLElement {
  const left = options.back
    ? h(
        'button',
        {
          class: 'topbar__back',
          type: 'button',
          onClick: options.back.onPress,
        },
        h('span', { 'aria-hidden': 'true', text: '←' }),
        h('span', { text: options.back.label }),
      )
    : h('span');

  const right = options.action
    ? options.action
    : options.status
      ? h(
          'div',
          { class: 'topbar__status' },
          ...options.status.flatMap((item, index) => [
            index > 0 ? h('span', { class: 'topbar__dot', 'aria-hidden': 'true' }) : null,
            h('span', { text: item }),
          ]),
        )
      : h('span');

  return h('header', { class: 'topbar' }, left, right);
}

export function eyebrow(text: string): HTMLElement {
  return h('p', { class: 'eyebrow', text });
}

export function stat(value: string | number, label: string): HTMLElement {
  return h('div', { class: 'stat' }, h('span', { class: 'stat__value', text: String(value) }), h('span', { class: 'stat__label', text: label }));
}

/** The consent note. Present wherever it matters, phrased as house rules rather than a lecture. */
export function consentNote(): HTMLElement {
  return h(
    'div',
    { class: 'consent' },
    h('p', { class: 'consent__title', text: 'Play with consent' }),
    h('p', {
      class: 'consent__body',
      text: 'Anyone can skip anything. No pressure, no touching without permission, nothing private leaves the room.',
    }),
  );
}
