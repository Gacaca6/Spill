// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Zero-dependency service worker generation.
 *
 * Astro emits content-hashed asset filenames, so the precache list has to be
 * produced after the build. This integration walks `dist/`, builds a precache
 * manifest, and stamps it into `sw.js` along with a revision hash so a new
 * deploy reliably invalidates the old cache.
 */
function serviceWorker() {
  /** Extensions worth precaching for a fully offline first launch. */
  const PRECACHE = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.woff2', '.svg', '.png', '.ico']);
  /** Files that must never end up in the precache list. */
  const SKIP = new Set(['sw.js']);
  /**
   * iOS reads launch images itself at app-launch time, before any service
   * worker exists. Precaching ~15 full-screen PNGs would bloat the install for
   * assets the worker is never asked for.
   */
  const SKIP_DIRS = [
    'splash/',
    /**
     * Android trust data must never be served from a cache. A stale
     * `assetlinks.json` — say, one from before Play re-signed the app — makes
     * the browser address bar reappear in a shipped TWA, which is the single
     * most common way these launches go wrong.
     */
    '.well-known/',
  ];

  return {
    name: 'spill:service-worker',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);

        /** @param {string} current @returns {Promise<string[]>} */
        async function walk(current) {
          const entries = await readdir(current, { withFileTypes: true });
          /** @type {string[]} */
          const files = [];
          for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) files.push(...(await walk(full)));
            else files.push(full);
          }
          return files;
        }

        const all = await walk(outDir);
        const hash = createHash('sha256');
        /** @type {string[]} */
        const manifest = [];

        for (const file of all.sort()) {
          const rel = path.relative(outDir, file).split(path.sep).join('/');
          if (SKIP.has(rel)) continue;
          if (SKIP_DIRS.some((dir) => rel.startsWith(dir))) continue;
          if (!PRECACHE.has(path.extname(rel).toLowerCase())) continue;

          const info = await stat(file);
          // Keep very large assets out of the precache; they can be runtime-cached.
          if (info.size > 2_000_000) continue;

          // Hash contents, not size. Icons live at stable paths and can change
          // without changing length — which would leave the worker version
          // identical and keep the old icon cached indefinitely.
          hash.update(rel).update(await readFile(file));
          manifest.push('/' + rel);
        }

        const version = hash.digest('hex').slice(0, 12);
        const templatePath = path.join(fileURLToPath(new URL('./src/pwa/', import.meta.url)), 'sw.template.js');
        const template = await readFile(templatePath, 'utf8');

        const output = template
          .replace('__SW_VERSION__', version)
          .replace('"__SW_PRECACHE__"', JSON.stringify(manifest, null, 2));

        await writeFile(path.join(outDir, 'sw.js'), output, 'utf8');
        logger.info(`service worker generated — ${manifest.length} precached entries (v${version})`);
      },
    },
  };
}

export default defineConfig({
  output: 'static',
  integrations: [serviceWorker()],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      cssMinify: 'lightningcss',
    },
  },
});
