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
- **No player gets the same challenge type twice in a row.** Truth alternates with dare,
  always. The type is assigned, never offered as a choice — so the rule reads as intentional
  rather than as something being withheld.
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

## Renaming it

`APP_NAME` and `APP_TAGLINE` live in [`src/config.ts`](src/config.ts) and nowhere else. The
manifest is generated from them, so changing that file renames the product everywhere.

Icons are generated from geometry by [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs)
— no dependencies, no binary assets in the repo. Edit the constants at the top to change the
mark.

---

## Content

Roughly 180 truths, 165 dares, 100 consequences and a separate deck of ~95 adult prompts.
Every entry carries metadata (category, intensity 1–5, age rating, group size, whether it
needs another person) which is what the selector filters on.

Adding prompts means adding a line to a file in `src/data/`. The builders in
`src/data/builders.ts` supply the defaults; `npm test` validates the result.
