import '@/styles/global.css';

import { App } from '@/ui/app';
import { errorScreen, homeScreen, howToScreen, resumeScreen, splashScreen } from '@/ui/screens/onboarding';
import { ageGateScreen, introScreen, modeScreen, setupScreen } from '@/ui/screens/setup';
import {
  challengeScreen,
  consentScreen,
  consequenceScreen,
  mercyScreen,
  reactionScreen,
  revealScreen,
  wheelScreen,
} from '@/ui/screens/play';
import { recapScreen } from '@/ui/screens/recap';

/** Entry point: wire the screens together and start the app. */
function boot(): void {
  const root = document.getElementById('app');
  if (!root) return;

  const app = new App(root);

  app.register('splash', splashScreen);
  app.register('resume', resumeScreen);
  app.register('home', homeScreen);
  app.register('howto', howToScreen);
  app.register('setup', setupScreen);
  app.register('mode', modeScreen);
  app.register('agegate', ageGateScreen);
  app.register('intro', introScreen);
  app.register('wheel', wheelScreen);
  app.register('reveal', revealScreen);
  app.register('consent', consentScreen);
  app.register('challenge', challengeScreen);
  app.register('mercy', mercyScreen);
  app.register('consequence', consequenceScreen);
  app.register('reaction', reactionScreen);
  app.register('recap', recapScreen);
  app.register('error', errorScreen);

  /**
   * Launcher shortcuts arrive as `?action=`. They skip the splash, because a
   * shortcut that dumps you on the same brand animation as a cold launch has
   * done nothing for you.
   *
   * The parameter is read before anything else and stripped from the URL, so a
   * refresh mid-game does not re-trigger it.
   */
  const action = new URLSearchParams(location.search).get('action');
  if (action) history.replaceState(null, '', location.pathname);

  if (action === 'new') void app.go('setup');
  else if (action === 'howto') void app.go('howto');
  else void app.go('splash');

  // Backgrounding a PWA on mobile can end the process without warning, so the
  // last known good state is written whenever the app leaves the foreground.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') app.persist();
  });
  window.addEventListener('pagehide', () => app.persist());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

/**
 * The service worker is registered by an inline script in the document head
 * rather than from here — see the comment in `layouts/Base.astro`. Registering
 * from this bundle made the app look worker-less to store scanners, which read
 * the page long before a module finishes parsing.
 */
