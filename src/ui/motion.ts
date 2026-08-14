/** Motion helpers. Every timed beat in the game goes through here. */

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * A dramatic pause.
 *
 * Under reduced motion the beat is shortened but never removed — the pacing is
 * information (something is about to be revealed), not decoration.
 */
export function beat(ms: number): Promise<void> {
  return wait(prefersReducedMotion() ? Math.min(ms, 320) : ms);
}

/** Forces a reflow so a freshly-set transition property is honoured. */
export function reflow(el: HTMLElement): void {
  void el.offsetHeight;
}
