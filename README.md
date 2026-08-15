# SPILL

A party game for people in the same room. Spin, get picked, tell the truth or take the dare.
No accounts, no server, no internet after first load.

Monochrome by design — black, white, and opacity. Nothing else.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on :4321 |
| `npm run build` | Generates icons, builds to `dist/`, emits the service worker |
| `npm run preview` | Serves the production build (needed to test offline/installability) |
| `npm test` | Game-engine and content test suite |
| `npm run check` | TypeScript type-check |
| `npm run verify` | Tests + type-check + build |

`dist/` is a static folder. Deploy it anywhere — the app has no backend.

---

## How it is put together

```
src/
  game/
    engine/GameEngine.ts      the rules — the single source of truth
    algorithms/queue.ts       turn order (fairness)
    algorithms/selection.ts   prompt selection (age rating, mode, variety)
    algorithms/intensity.ts   escalation bands
    selectors/stats.ts        session stats and awards
    state/persistence.ts      localStorage, defensively
  data/                       the content library + mode definitions
  ui/                         screens, wheel, DOM helpers
  styles/                     design tokens and CSS
  types/                      the shared domain model
```

**The engine knows the rules; the UI only asks questions.** Screens call
`peekNextPlayer()`, `challengeTypeFor()`, `beginTurn()`, `drawConsequence()` and render
whatever comes back. No screen decides anything about the game.

That separation is also what makes the wheel honest: `wheel.spinTo(id)` is handed the
player the engine already chose and computes the rotation needed to land on them. The
animation cannot disagree with the game state, because it never had an opinion.

`GameState` is plain JSON with no class instances or functions in it. A future multiplayer
layer can synchronise that object over WebSockets/WebRTC and run the same engine on top of
it without touching the UI.

---

## The rules the code guarantees

These are enforced structurally and covered by tests, not left to chance:

- **Nobody is picked twice until everybody has played.** A round is a shuffled queue drained
  one player at a time, so repetition inside a round is impossible by construction. A new
  round also never opens with the player who closed the last one.
- **The challenge type is assigned, and it is not predictable.** Switching is strongly
  favoured (~72%) and the same type three times running is impossible, but a repeat lands
  about **22%** of the time. Strict alternation was the original rule and it made the game
  dead: after a player's first turn the whole table could name every card they would ever
  get, so the reveal carried no information and the room fell into a repeating pattern.
  Unpredictable per turn, near an even split over a night.
- **No prompt repeats while unused prompts remain.** When a pool is genuinely exhausted it
  reopens rather than failing.
- **The mode's intensity ceiling is a hard filter.** Chill can never serve a 4, even when the
  low-intensity pool runs dry and even after a Double Down.
- **18+ content is a separate deck.** Selection matches on `ageRating` by equality, so a
  general mode cannot reach adult content through any code path, including fallbacks.

## Safety

The 18+ mode is gated behind a dedicated screen that says plainly that it is
self-attestation — a local PWA cannot verify anyone's age, and a fake date picker would only
teach people to lie.

The content library is tested against a blocklist on every run. Nothing anywhere may request
passwords, private accounts, intimate images or personal data. Dares and consequences —
anything that *instructs* a player — additionally may not involve physical contact, drinking,
or anything unsafe. Truths are questions about a person's own past and are held to the first
rule only, since a question cannot make anyone do anything.

Every challenge can be refused. Refusing costs a consequence, and consequences are jokes
rather than punishments.

## Privacy

Nothing leaves the device. There is no analytics, no network request after load, and no
backend to send anything to.

Saved sessions contain game mechanics only — names, counters and prompt ids. **Nothing a
player says is ever recorded.** Sessions expire after 12 hours and are cleared when a game
finishes.

---

## Offline

The service worker is generated at build time by an integration in `astro.config.mjs`, which
walks `dist/`, builds a precache manifest of the content-hashed assets and stamps it into
`src/pwa/sw.template.js` with a revision hash.

Navigations are network-first (so a deploy is picked up); assets are cache-first (they are
content-hashed, so they are immutable). After first load the game is fully playable in
airplane mode.

Service workers only run over HTTPS or on localhost, and registration is skipped in dev — use
`npm run preview` to test offline behaviour and installability.

---

## Deploying

Import the repo on Vercel; `vercel.json` supplies the build and headers. Nothing else is
needed — there is no backend and no environment variables.

The cache headers in that file are load-bearing, and `vercel.json` cannot carry comments,
so the reasoning lives here:

| Path | Policy | Why |
| --- | --- | --- |
| `/_astro/*` | `immutable`, 1 year | Filenames are content-hashed, so they can never go stale. |
| `/sw.js` | `must-revalidate` | **The important one.** If the worker is cached, a deploy can never reach an already-installed app — it keeps serving the old worker, which keeps serving the old precache. |
| `/index.html`, `/manifest.webmanifest` | `must-revalidate` | The shell must be able to pick up new asset hashes. |
| `/icons/*`, `/splash/*` | 1 week | Stable but not fingerprinted. |

`Permissions-Policy` denies geolocation, camera, microphone, payment and USB outright. The
game needs none of them, and saying so explicitly means a future dependency cannot quietly
start asking.

---

## Home-screen icons

**iOS copies the icon once, when the app is added, and never looks again.** There is no API
that changes it afterwards — not the manifest, not the service worker, not a new deploy.
Anyone already carrying an old icon has to remove the app and add it again. That is a
platform limitation, not a bug to be fixed here.

What the code does do:

- **Icon URLs carry a `?v=` fingerprint** derived from the icon bytes themselves. Without it,
  Safari can serve a week-old cached PNG at the exact moment someone re-adds the app —
  silently restoring the icon they were trying to replace. A changed icon is now a changed
  URL.
- **The service worker matches with `ignoreSearch`**, since the page requests icons with the
  fingerprint but the precache stores them at their bare path. Without this they miss the
  cache offline.
- **An installed copy running an outdated icon shows a one-time dismissible notice** telling
  the player to re-add. If nothing has been recorded yet the current version is stored
  silently, because there is no way to know which icon an existing install actually has, and
  a wrong notice is worse than none.

The service worker version hashes file *contents* rather than sizes, so an icon that changes
without changing length still invalidates the cache.

---

## Renaming it

`APP_NAME` and `APP_TAGLINE` live in [`src/config.ts`](src/config.ts) and nowhere else. The
manifest is generated from them, so changing that file renames the product everywhere.

Icons are generated from geometry by [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs)
— no dependencies, no binary assets in the repo. Edit the constants at the top to change the
mark.

---

## Content

**1,285 prompts**: 430 general truths, 340 general dares, 135 consequences, and a separate
adult deck of 250 truths and 130 dares. Every entry carries metadata (category, intensity
1–5, age rating, group size, whether it needs another person) which is what the selector
filters on.

The decks are written against research rather than intuition — see
[docs/content-research.md](docs/content-research.md) for the findings and the design rules
they produce. The short version: Gen Z overwhelmingly wants the deeper question and won't ask
it first, so the game's job is to be the one who asked.

Adding prompts means adding a line to a file in `src/data/`. The builders in
`src/data/builders.ts` supply the defaults; `npm test` validates the result.

### Partner dares

A small set of adult dares physically involve a second player. These are the only prompts in
the library that do, and they are handled differently:

1. The engine picks a partner and marks the turn `awaitingPartner`.
2. The card is shown to the room with **the partner named as the one who decides**.
3. **"I'm in"** proceeds. **"Pass"** redraws a dare involving nobody else.

This is one phone passed around a table, so the card is not private and the app does not
pretend it is. What the step actually buys is that the person on the receiving end answers
before the dare counts as happening, instead of a shuffle deciding for them.

**A pass costs the partner nothing.** The turn still has stakes: the dared player gets a
replacement they can refuse into a consequence, so the forfeit lands on whoever's turn it
actually is — not on the person who was assigned to be touched. Penalising that refusal is
the one change that would turn this from a party game into pressure.

The tests enforce that partner dares never reach a general mode, never reach a two-player
game, and that any dare using contact language is flagged so it cannot skip the step.

The ceiling is kissing and close contact, fully clothed. Nothing instructs undressing or a
sexual act, and that is asserted in the test suite for dares *and* consequences — including
the ones behind the consent gate.
