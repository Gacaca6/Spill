import type { Intensity } from '@/types';

/**
 * Escalation.
 *
 * The night should build. Early rounds stay light, later rounds get personal —
 * but the band is always clamped by the mode's ceiling, so escalation can never
 * push a Chill game into territory the players did not choose.
 */
const BANDS: Array<{ untilRound: number; band: Intensity[] }> = [
  { untilRound: 2, band: [1, 2] },
  { untilRound: 5, band: [1, 2, 3] },
  { untilRound: 9, band: [2, 3, 4] },
  { untilRound: Number.POSITIVE_INFINITY, band: [3, 4, 5] },
];

function clamp(value: number): Intensity {
  return Math.min(5, Math.max(1, value)) as Intensity;
}

export function intensityBandForRound(round: number, maxIntensity: Intensity, boost = 0): Intensity[] {
  const base = BANDS.find((entry) => round <= entry.untilRound)?.band ?? [3, 4, 5];

  const shifted = base.map((level) => clamp(level + boost));
  const allowed = shifted.filter((level) => level <= maxIntensity);

  // If the mode ceiling sits below the whole band, fall back to the ceiling
  // itself rather than returning nothing.
  const band = allowed.length > 0 ? allowed : [clamp(maxIntensity)];

  return [...new Set(band)].sort((a, b) => a - b);
}

/** Headline intensity for display — the top of the current band. */
export function peakIntensity(band: readonly Intensity[]): Intensity {
  return band.reduce<Intensity>((max, level) => (level > max ? level : max), 1);
}
