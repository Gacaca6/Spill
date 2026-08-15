import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Offline is a hard requirement, not a feature.
 *
 * The service worker can only serve what it precached, so the guarantee really
 * rests on the app never *wanting* anything from the network in the first
 * place. That is easy to hold today and easy to break later with one innocent
 * font import or analytics snippet — which would fail silently in dev and only
 * show up as a dead app in a basement with no signal.
 *
 * So it is asserted rather than assumed.
 */

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|astro|css|js)$/.test(entry) ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((file) => ({
  path: path.relative(SRC, file).split(path.sep).join('/'),
  text: readFileSync(file, 'utf8'),
}));

describe('the app never reaches for the network', () => {
  it('has no runtime fetch, XHR or socket calls', () => {
    const patterns = [/\bfetch\s*\(/, /XMLHttpRequest/, /new WebSocket/, /EventSource/, /navigator\.sendBeacon/];

    const offenders = files
      // The worker is the one place allowed to fetch — that is its entire job,
      // and it is what fills the cache the rest of the app relies on.
      .filter((file) => !file.path.startsWith('pwa/'))
      .filter((file) => patterns.some((pattern) => pattern.test(file.text)))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('references no remote hosts', () => {
    const offenders = files
      .filter((file) => {
        const urls = file.text.match(/https?:\/\/[^\s'"`)]+/g) ?? [];
        // The SVG namespace is an identifier, not an address — nothing fetches it.
        return urls.some((url) => !url.startsWith('http://www.w3.org/'));
      })
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('loads no remote fonts or stylesheets', () => {
    const offenders = files
      .filter((file) => /@import\s+url\(\s*['"]?https?:/.test(file.text) || /@font-face/.test(file.text))
      .map((file) => file.path);

    // The type stack is system fonts by design: nothing to download, nothing to
    // license, and no invisible text on a train.
    expect(offenders).toEqual([]);
  });
});
