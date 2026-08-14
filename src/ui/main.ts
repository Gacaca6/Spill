import '@/styles/global.css';

import { App } from '@/ui/app';
import { errorScreen, homeScreen, howToScreen, resumeScreen, splashScreen } from '@/ui/screens/onboarding';
import { ageGateScreen, introScreen, modeScreen, setupScreen } from '@/ui/screens/setup';
import { challengeScreen, consequenceScreen, mercyScreen, reactionScreen, revealScreen, wheelScreen } from '@/ui/screens/play';
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
  app.register('challenge', challengeScreen);
  app.register('mercy', mercyScreen);
  app.register('consequence', consequenceScreen);
  app.register('reaction', reactionScreen);
  app.register('recap', recapScreen);
  app.register('error', errorScreen);

  void app.go('splash');

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

/** Offline support. Failure here is silent — the game works either way. */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is an enhancement, not a requirement */
    });
  });
}
