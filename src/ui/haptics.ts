/**
 * Haptics.
 *
 * Vibration is a progressive enhancement: unsupported browsers (all of iOS
 * Safari, for one) simply get nothing, and the game never depends on it to
 * convey state.
 */

export type HapticPattern = 'tick' | 'select' | 'reveal' | 'consequence' | 'press' | 'end';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tick: 8,
  press: 12,
  reveal: 24,
  select: [30, 40, 90],
  consequence: [16, 60, 16],
  end: [40, 60, 40, 60, 120],
};

let enabled = true;

/**
 * Browsers refuse to vibrate before the user has interacted with the page, and
 * Chrome logs an error every time it blocks one. A timed reveal sequence can
 * fire several of those, so the first gesture is tracked and calls before it are
 * skipped rather than attempted.
 */
let gestureSeen = false;

if (typeof window !== 'undefined') {
  const markGesture = () => {
    gestureSeen = true;
  };
  window.addEventListener('pointerdown', markGesture, { once: true, capture: true });
  window.addEventListener('keydown', markGesture, { once: true, capture: true });
}

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function haptic(pattern: HapticPattern): void {
  if (!enabled || !gestureSeen) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* some browsers throw when the page is not visible */
  }
}
