import type { APIRoute } from 'astro';
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/config';
import assets from '@/pwa/assets.json';
import screenshots from '@/pwa/screenshots.json';

/** Same fingerprint as the <link> tags, so a changed icon is a changed URL. */
const v = assets.version;

/**
 * The web app manifest is generated rather than hand-written so branding stays
 * in one place — renaming the product in `config.ts` renames it everywhere.
 */
export const GET: APIRoute = () => {
  const manifest = {
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'fullscreen'],
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['games', 'entertainment', 'social'],
    lang: 'en',
    dir: 'ltr',
    /** Reuse the open window rather than stacking new ones. */
    launch_handler: { client_mode: 'navigate-existing' },
    /**
     * Long-press the home-screen icon. Both of these are handled for real in
     * `ui/main.ts` — a shortcut that lands on the splash like any other launch
     * is a manifest entry pretending to be a feature.
     */
    shortcuts: [
      {
        name: 'Start a game',
        short_name: 'New game',
        description: 'Skip straight to adding players',
        url: '/?action=new',
        icons: [{ src: `/icons/icon-96.png?v=${v}`, sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'How to play',
        short_name: 'Rules',
        description: 'The rules, and how consequences work',
        url: '/?action=howto',
        icons: [{ src: `/icons/icon-96.png?v=${v}`, sizes: '96x96', type: 'image/png' }],
      },
    ],
    icons: [
      { src: `/icons/icon-64.png?v=${v}`, sizes: '64x64', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-256.png?v=${v}`, sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-384.png?v=${v}`, sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/icons/maskable-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: `/icons/maskable-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    /**
     * Captured from the running app by `scripts/capture-screenshots.mjs`, so
     * this list can never drift from what the app actually looks like. Both a
     * wide and a narrow form factor are present, which is what unlocks the rich
     * install UI.
     */
    screenshots,
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
