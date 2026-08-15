/**
 * Store screenshots, captured from the real running app.
 *
 *   npm run preview            # in one terminal
 *   node scripts/capture-screenshots.mjs
 *
 * Two things this exists to get right.
 *
 * **Real phone layout, not a stretched desktop.** Play wants 1080×1920. Setting
 * the viewport to 1080×1920 lays the app out as a 1080px-*wide desktop*, which
 * produces a stretched desktop UI at phone dimensions — it looks nothing like
 * the app on a phone and invites "this is just a website" scrutiny. So each form
 * factor renders at a real device viewport and scales up with
 * `deviceScaleFactor`.
 *
 * **No alpha for Play.** Chromium PNGs carry an alpha channel and Play rejects
 * screenshots that have one, so every shot is also written as JPEG for upload.
 * The PNGs are what the manifest references.
 */

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SHOT_BASE_URL ?? 'http://localhost:4322';

const MANIFEST_DIR = path.join(ROOT, 'public', 'screenshots');
const STORE_DIR = path.join(ROOT, 'store', 'screenshots');

/** Real device viewports, scaled up to the exact pixel sizes each store wants. */
const FORMS = {
  // Google Play phone — 1080×1920
  play: { width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  // Apple 6.9" iPhone — 1290×2796 (the required baseline; Apple scales it down)
  apple: { width: 430, height: 932, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  // Wide form factor for the manifest's rich install UI — 1920×1080
  wide: { width: 1280, height: 720, deviceScaleFactor: 1.5, isMobile: false, hasTouch: false },
};

const CHROME_CANDIDATES = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
  const found = CHROME_CANDIDATES.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error('No Chrome or Edge found. Set CHROME_PATH.');
  return process.env.CHROME_PATH ?? found;
}

/** Clicks the first button whose text matches. Returns false if there is none. */
async function tap(page, pattern) {
  const clicked = await page.evaluate((source) => {
    const re = new RegExp(source, 'i');
    const nodes = [...document.querySelectorAll('#app .btn, #app .tile, .spin-btn, .check')];
    const target = nodes.find((node) => re.test(node.textContent ?? '') && !node.hasAttribute('disabled'));
    if (!target) return false;
    target.click();
    return true;
  }, pattern);
  return clicked;
}

async function waitForText(page, pattern, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const seen = await page.evaluate((source) => new RegExp(source, 'i').test(document.body.innerText), pattern);
    if (seen) return true;
    await sleep(250);
  }
  return false;
}

/**
 * Walks the real UI into a given screen.
 *
 * Deliberately drives the app rather than seeding localStorage: a screenshot is
 * a claim about what the app looks like, and the only way that claim stays true
 * is to take it from the app actually running.
 */
async function driveTo(page, screen) {
  // `?action=new` is a launcher shortcut, which also skips the splash hold.
  await page.goto(`${BASE}/?action=new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/?action=new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForText(page, "who's here");

  if (screen === 'setup') {
    await page.evaluate(() => {
      const names = ['Sarah', 'Mike', 'Emma', 'Jonathan'];
      const add = [...document.querySelectorAll('#app .btn')].find((b) => /add player/i.test(b.textContent));
      while (document.querySelectorAll('.player-row').length < names.length) add.click();
      document.querySelectorAll('.player-row__input').forEach((input, index) => {
        input.value = names[index] ?? '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      document.activeElement?.blur();
    });
    await sleep(400);
    return;
  }

  await page.evaluate(() => {
    const names = ['Sarah', 'Mike', 'Emma', 'Jonathan'];
    const add = [...document.querySelectorAll('#app .btn')].find((b) => /add player/i.test(b.textContent));
    while (document.querySelectorAll('.player-row').length < names.length) add.click();
    document.querySelectorAll('.player-row__input').forEach((input, index) => {
      input.value = names[index] ?? '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await sleep(300);

  await tap(page, 'choose a mode');
  await waitForText(page, 'pick your poison');
  if (screen === 'modes') return;

  await tap(page, '^\\s*tea');
  await waitForText(page, 'everyone ready');
  await tap(page, "let's go");
  await waitForText(page, 'spin');
  await sleep(1200);
  if (screen === 'wheel') return;

  // One full turn: spin, sit through the reveal, land on the card.
  await tap(page, '^\\s*spin\\s*$');
  await waitForText(page, 'your turn', 25000);
  await waitForText(page, 'i did it', 25000);
  await sleep(700);
  if (screen === 'challenge') return;

  if (screen === 'consequence') {
    await tap(page, '^\\s*nope\\s*$');
    await waitForText(page, 'consequence', 20000);
    await sleep(1400);
    return;
  }

  if (screen === 'recap') {
    for (let turn = 0; turn < 5; turn++) {
      if (await tap(page, '^\\s*i did it\\s*$')) await sleep(900);
      if (await tap(page, '^\\s*valid\\s*$')) await sleep(1400);
      if (await tap(page, '^\\s*spin\\s*$')) {
        await waitForText(page, 'i did it', 25000);
        await sleep(600);
      }
    }
    await page.evaluate(() => {
      const end = [...document.querySelectorAll('.topbar__back')].find((b) => /end game/i.test(b.textContent));
      end?.click();
    });
    await waitForText(page, "tonight's lore", 15000);
    await sleep(1000);
  }
}

const SHOTS = [
  { name: 'home', screen: 'home', forms: ['play', 'apple', 'wide'], caption: 'The pitch' },
  { name: 'wheel', screen: 'wheel', forms: ['play', 'apple', 'wide'], caption: 'The wheel' },
  { name: 'challenge', screen: 'challenge', forms: ['play', 'apple'], caption: 'A card' },
  { name: 'modes', screen: 'modes', forms: ['play', 'apple'], caption: 'Five decks' },
  { name: 'recap', screen: 'recap', forms: ['play', 'apple'], caption: 'The recap' },
];

async function main() {
  mkdirSync(MANIFEST_DIR, { recursive: true });
  mkdirSync(STORE_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  });

  const captured = [];

  for (const shot of SHOTS) {
    for (const form of shot.forms) {
      const page = await browser.newPage();
      await page.setViewport(FORMS[form]);
      // Screenshots must show the app as players see it, and the product is
      // black. Emulating light here would ship a listing of the wrong app.
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

      if (shot.screen === 'home') {
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.evaluate(() => localStorage.clear());
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForText(page, 'uncomfortable', 20000);
        await sleep(900);
      } else {
        await driveTo(page, shot.screen);
      }

      const base = `${shot.name}-${form}`;
      await page.screenshot({ path: path.join(MANIFEST_DIR, `${base}.png`) });
      await page.screenshot({ path: path.join(STORE_DIR, `${base}.jpg`), type: 'jpeg', quality: 92 });

      const size = await page.evaluate(() => ({ w: innerWidth * devicePixelRatio, h: innerHeight * devicePixelRatio }));
      captured.push({ name: base, form, width: size.w, height: size.h, caption: shot.caption });
      console.log(`  ${base.padEnd(22)} ${size.w}x${size.h}`);
      await page.close();
    }
  }

  /** Play's feature graphic. Rendered here so it matches the app's real type and palette. */
  const feature = await browser.newPage();
  await feature.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await feature.setContent(`<!doctype html><html><body style="margin:0;height:500px;display:grid;place-items:center;
    background:#000;font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
    <div style="text-align:center">
      <div style="font-size:118px;font-weight:900;letter-spacing:-.045em;color:#fff;line-height:1">SPILL</div>
      <div style="margin-top:18px;font-size:20px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.42)">
        Truth or dare, but make it personal
      </div>
    </div></body></html>`);
  await sleep(400);
  await feature.screenshot({ path: path.join(STORE_DIR, 'feature-graphic.jpg'), type: 'jpeg', quality: 95 });
  console.log(`  ${'feature-graphic'.padEnd(22)} 1024x500`);
  await feature.close();

  await browser.close();

  // Emitted for the manifest route to read, so the screenshot list is generated
  // from what was actually captured rather than hand-maintained beside it.
  const manifestEntries = captured
    .filter((shot) => shot.form !== 'apple')
    .map((shot) => ({
      src: `/screenshots/${shot.name}.png`,
      sizes: `${shot.width}x${shot.height}`,
      type: 'image/png',
      form_factor: shot.form === 'wide' ? 'wide' : 'narrow',
      label: shot.caption,
    }));

  writeFileSync(path.join(ROOT, 'src', 'pwa', 'screenshots.json'), JSON.stringify(manifestEntries, null, 2), 'utf8');
  console.log(`\n${captured.length} screenshots + feature graphic. ${manifestEntries.length} referenced by the manifest.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
