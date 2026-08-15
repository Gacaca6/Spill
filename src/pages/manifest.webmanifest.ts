import type { APIRoute } from 'astro';
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/config';
import assets from '@/pwa/assets.json';

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
    icons: [
      { src: `/icons/icon-64.png?v=${v}`, sizes: '64x64', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-256.png?v=${v}`, sizes: '256x256', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-384.png?v=${v}`, sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/icons/maskable-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: `/icons/maskable-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
