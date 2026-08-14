import { LIMITS } from '@/config';

/**
 * Player name hygiene.
 *
 * Names are session-scoped display strings — they are never sent anywhere — but
 * they still need to survive being typed by six people in a hurry.
 */

/** Trims, collapses inner whitespace, and clamps length. Unicode and accents survive intact. */
export function normalizeName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= LIMITS.maxNameLength) return collapsed;
  // Slice by code points so an emoji or combining mark is never cut in half.
  return Array.from(collapsed).slice(0, LIMITS.maxNameLength).join('').trim();
}

export function isValidName(raw: string): boolean {
  return normalizeName(raw).length > 0;
}

/**
 * Disambiguates repeated names so the wheel and the reveal are never confusing:
 * `Alex, Alex` becomes `Alex, Alex 2`.
 */
export function dedupeNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];

  for (const name of names) {
    const clean = normalizeName(name);
    if (!clean) continue;

    const key = clean.toLocaleLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    out.push(count === 1 ? clean : `${clean} ${count}`);
  }

  return out;
}

/** Initials for compact chips on the wheel and recap. */
export function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return Array.from(parts[0] as string).slice(0, 2).join('').toLocaleUpperCase();
  const first = Array.from(parts[0] as string)[0] ?? '';
  const second = Array.from(parts[1] as string)[0] ?? '';
  return (first + second).toLocaleUpperCase();
}
