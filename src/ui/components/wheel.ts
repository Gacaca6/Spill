import { h, svg } from '@/ui/dom';
import { haptic } from '@/ui/haptics';
import { prefersReducedMotion, wait } from '@/ui/motion';
import { initialsOf } from '@/utils/names';

/**
 * The player wheel.
 *
 * Critical contract: the wheel is a *renderer*, not a decider. `spinTo` is given
 * the player the engine already chose and computes the rotation needed to land
 * on them. There is no randomness in this file at all — the animation can never
 * disagree with the game state.
 */

interface WheelPlayer {
  id: string;
  name: string;
}

const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 186;

/** Phase durations, in ms. Tuned so the whole spin lands just under 4 seconds. */
const ANTICIPATION = 300;
const MAIN = 2900;
const CRAWL = 780;

export interface Wheel {
  el: HTMLElement;
  setPlayers(players: WheelPlayer[]): void;
  spinTo(playerId: string): Promise<void>;
  highlight(playerId: string | null): void;
  isSpinning(): boolean;
}

export function createWheel(): Wheel {
  let players: WheelPlayer[] = [];
  let rotation = 0;
  let spinning = false;

  const disc = svg('svg', {
    class: 'wheel__disc',
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    'aria-hidden': 'true',
  });

  const pointer = svg('svg', { class: 'wheel__pointer', viewBox: '0 0 20 24', 'aria-hidden': 'true' });
  pointer.appendChild(svg('path', { d: 'M10 24 L1 4 A 10 10 0 0 1 19 4 Z', fill: 'currentColor' }));

  const glow = h('div', { class: 'wheel__glow' });

  const el = h('div', { class: 'wheel', 'data-state': 'idle' }, glow, pointer as unknown as Node, disc as unknown as Node);

  function render(): void {
    while (disc.firstChild) disc.removeChild(disc.firstChild);
    if (players.length === 0) return;

    const step = 360 / players.length;
    // Names become unreadable slivers past eight players, so the wheel switches
    // to initials rather than shrinking the type into nothing.
    const useInitials = players.length > 8;

    players.forEach((player, index) => {
      const start = -90 + index * step;
      const end = start + step;

      disc.appendChild(
        svg('path', {
          class: 'wheel__segment',
          d: segmentPath(start, end),
          'data-player': player.id,
          // A barely-there alternation makes the segment boundaries readable
          // without turning the wheel into a fairground prop.
          'data-tone': index % 2 === 0 ? 'a' : 'b',
        }),
      );

      const mid = start + step / 2;
      const label = useInitials ? initialsOf(player.name) : truncate(player.name, players.length > 6 ? 8 : 11);

      // Text runs radially outward. A label is only upright when its rotation
      // falls within ±90°; beyond that it is placed on the opposite side and
      // spun a further 180° so it reads the right way up.
      const normalized = (((mid + 180) % 360) + 360) % 360 - 180;
      const flipped = Math.abs(normalized) > 90;

      const text = svg('text', {
        class: 'wheel__label',
        x: flipped ? CENTER - RADIUS * 0.58 : CENTER + RADIUS * 0.58,
        y: CENTER,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        transform: `rotate(${flipped ? mid + 180 : mid}, ${CENTER}, ${CENTER})`,
        'data-player': player.id,
        'font-size': labelSize(players.length, useInitials),
      });
      text.textContent = label;
      disc.appendChild(text);
    });

    disc.appendChild(svg('circle', { class: 'wheel__rim', cx: CENTER, cy: CENTER, r: RADIUS }));
    disc.appendChild(svg('circle', { class: 'wheel__hub', cx: CENTER, cy: CENTER, r: 26 }));
    disc.appendChild(svg('circle', { class: 'wheel__hub-mark', cx: CENTER, cy: CENTER, r: 5 }));

    applyRotation(rotation, null, 0);
  }

  function applyRotation(deg: number, easing: string | null, duration: number): void {
    disc.style.transition = easing ? `transform ${duration}ms ${easing}` : 'none';
    disc.style.transform = `rotate(${deg}deg)`;
  }

  function highlight(playerId: string | null): void {
    for (const node of disc.querySelectorAll('[data-player]')) {
      const selected = playerId !== null && node.getAttribute('data-player') === playerId;
      if (selected) node.setAttribute('data-selected', 'true');
      else node.removeAttribute('data-selected');
    }
  }

  /**
   * Rotation needed to bring a segment under the pointer at 12 o'clock.
   *
   * Segment `index` is centred at `-90 + (index + 0.5) * step`; rotating by the
   * negative of that offset moves it to the top.
   */
  function targetAngleFor(index: number): number {
    const step = 360 / players.length;
    const centre = (index + 0.5) * step;
    return -centre;
  }

  /**
   * Ticks that thin out as the wheel slows, so the hand feels the deceleration.
   * Spacing is quadratic, which approximates the crawl closely enough.
   */
  function scheduleTicks(total: number): number[] {
    const timers: number[] = [];
    const count = 16;
    for (let i = 1; i <= count; i++) {
      const progress = i / count;
      const at = total * (1 - (1 - progress) ** 2.2);
      timers.push(window.setTimeout(() => haptic('tick'), at));
    }
    return timers;
  }

  async function spinTo(playerId: string): Promise<void> {
    const index = players.findIndex((player) => player.id === playerId);
    if (index < 0 || spinning) return;

    spinning = true;
    highlight(null);
    el.dataset.state = 'spinning';

    // Always land on the same absolute angle, several full turns further on.
    const target = targetAngleFor(index);
    const turns = 5;
    const current = rotation;
    let final = target;
    while (final < current + turns * 360) final += 360;

    if (prefersReducedMotion()) {
      // No spin: go straight to the answer, but keep a readable beat so the
      // reveal still registers as an event rather than a flicker.
      rotation = final;
      applyRotation(rotation, null, 0);
      el.dataset.state = 'selected';
      highlight(playerId);
      haptic('select');
      await wait(420);
      spinning = false;
      return;
    }

    // 1. Anticipation — a short pull backwards before the throw.
    applyRotation(current - 10, 'cubic-bezier(0.4, 0, 0.6, 1)', ANTICIPATION);
    await wait(ANTICIPATION);

    // 2. The spin — accelerate away, then a long decay.
    const timers = scheduleTicks(MAIN + CRAWL);
    applyRotation(final - 7, 'cubic-bezier(0.22, 0.03, 0.12, 1)', MAIN);
    await wait(MAIN);

    // 3. The crawl — the last few degrees, agonisingly.
    el.dataset.state = 'settling';
    applyRotation(final, 'cubic-bezier(0.12, 0.86, 0.24, 1)', CRAWL);
    await wait(CRAWL);

    for (const timer of timers) clearTimeout(timer);
    rotation = final;

    el.dataset.state = 'selected';
    highlight(playerId);
    haptic('select');
    spinning = false;
  }

  return {
    el,
    setPlayers(next: WheelPlayer[]) {
      players = next;
      render();
    },
    spinTo,
    highlight,
    isSpinning: () => spinning,
  };
}

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function segmentPath(startDeg: number, endDeg: number): string {
  // A single-segment wheel would be a degenerate arc; two players give exactly
  // 180° each, which the arc flag below still handles correctly.
  const start = polar(startDeg, RADIUS);
  const end = polar(endDeg, RADIUS);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return `M ${CENTER} ${CENTER} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

/** Small groups get bigger names; crowded wheels shrink to stay inside their segment. */
function labelSize(count: number, initials: boolean): number {
  if (initials) return 20;
  if (count <= 4) return 21;
  if (count <= 6) return 18;
  return 16;
}

function truncate(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length <= max ? value : `${chars.slice(0, max - 1).join('')}…`;
}
