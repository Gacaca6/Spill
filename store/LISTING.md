# SPILL — store listing pack

Everything needed to fill in Play Console and App Store Connect. Assets are in `store/`,
generated at exact store dimensions by `npm run shots`.

---

## Decisions you must make before packaging

### 1. The App ID is permanent

| | |
| --- | --- |
| Recommended | `com.gacaca.spill` |
| Used as | Android `applicationId` **and** iOS Bundle ID — identical on both |

Changing it later means a brand-new listing with zero reviews and zero installs. There is no
migration. Pick it once.

### 2. Get a custom domain before you ship — this one matters

The app is live at `https://spill-dun.vercel.app`, which resolves cleanly (200, HTTPS, no
redirect), so it *works* today. But a Trusted Web Activity is **hard-wired to one origin
forever**:

- Digital Asset Links are matched against that exact origin. If the Vercel project is ever
  renamed, redeployed under a different slug, or transferred, the subdomain changes — and every
  installed copy of the Android app shows a browser address bar or stops verifying. There is no
  way to repoint a shipped TWA.
- `spill-dun` is a generated slug. It appears nowhere in the listing, but it is the thing the app
  is permanently bound to.

**Buy a domain, point it at the same Vercel project, and package that.** It costs about £10/year
and it is the difference between an app you can maintain and one you can't.

---

## Google Play

| Field | Value | Limit |
| --- | --- | --- |
| **App title** | `SPILL: Truth or Dare` | 20/30 |
| **Short description** | `The party game that makes your friends actually talk. Offline. No accounts.` | 74/80 |
| **Category** | Games → Casual (secondary: Social) | |
| **Content rating** | Complete IARC — expect **Mature 17+**, see below | |
| **Target audience** | **18+ only.** PWAs cannot target children under the Families policy | |
| **Privacy policy URL** | `https://<your-domain>/privacy` | |

### Full description

```
Six people. One phone. Nobody knows who's next.

SPILL is a truth-or-dare game built for a room, not a screen. The wheel picks someone,
the game decides truth or dare, and you find out together. No accounts, no sign-up, no
internet — it works in airplane mode from the first launch.

WHY IT'S DIFFERENT

Everyone wants the deeper conversation. Nobody wants to be the one who asks. SPILL is the
one who asks — so you get the answer without anyone taking the risk of raising it.

WHAT'S IN IT

• 1,385 prompts, written to start conversations rather than fill silence
• Five modes — Chill, Tea, Chaos, Bold, and a separate 18+ deck
• A wheel you genuinely cannot predict
• Truth or dare is assigned, not chosen — no talking your way into an easy one
• Consequences, group mercy votes, double-or-nothing, and a full recap with awards
• Works completely offline. No network, ever, after the first load.

BUILT TO BE FAIR

Anyone can pass on anything, at any time, without explaining themselves. Dares that involve
another player ask that person first, and a no costs them nothing. That's not a disclaimer —
it's how the game is built.

PRIVACY

We collect nothing. No account, no analytics, no tracking, no permissions. Nothing anyone
says in the game is recorded or transmitted, because there's no server to send it to.

18+ MODE

A separate, explicit deck behind an age confirmation. It is never reachable from the general
game modes.
```

### Graphic assets (in `store/screenshots/`)

- [x] App icon — `public/icons/icon-512.png` (512×512)
- [x] Feature graphic — `feature-graphic.jpg` (1024×500, no alpha)
- [x] Phone screenshots — `home-play.jpg`, `wheel-play.jpg`, `challenge-play.jpg`,
      `modes-play.jpg`, `recap-play.jpg` (1080×1920, JPEG, no alpha)

---

## Apple App Store

| Field | Value | Limit |
| --- | --- | --- |
| **App name** | `SPILL: Truth or Dare` | 20/30 |
| **Subtitle** | `Put the phone down and talk` | 27/30 |
| **Keywords** | `truth,dare,party,game,friends,group,icebreaker,questions,dares,night,adult,drinking` | 82/100 |
| **Category** | Games (Casual) | |
| **Age rating** | **17+** — see below | |
| **Support URL** | required — a reachable page | |

### Promotional text (170)

```
1,385 prompts. Five decks. A wheel nobody can predict. Works with no internet at all —
and nothing anyone says ever leaves the phone.
```

Description: reuse the Play full description above (both allow 4000 characters).

### Screenshots

- [x] 6.9" iPhone — `home-apple.jpg`, `wheel-apple.jpg`, `challenge-apple.jpg`,
      `modes-apple.jpg`, `recap-apple.jpg` (1290×2796)
- [ ] 13" iPad (2064×2752) — **only if you support iPad.** The app is portrait-locked and
      phone-shaped; declaring iPhone-only is the simpler, more honest option.

---

## Content rating — read this before submitting

This is the biggest non-technical risk in the whole submission.

The 18+ deck is explicitly sexual (acts, kinks, preferences) and partner dares instruct kissing.
Answer both questionnaires **truthfully** — under-declaring is what gets apps pulled after
launch, which is far worse than a higher rating.

| | Expect |
| --- | --- |
| **Google Play (IARC)** | Mature 17+. Declare sexual content and suggestive themes. Target audience 18+. |
| **Apple** | 17+ — "Frequent/Intense Sexual Content or Nudity". Apps in this space do ship, but they are reviewed closely. |

**Say this in App Review notes.** It is genuine and it is what a reviewer wants to see:

```
SPILL is an 18+ social party game. Adult content is confined to a separate deck behind a
three-part age and consent confirmation and is unreachable from the general game modes.

Any player can refuse any prompt at any time. Dares that physically involve a second player
require that player's explicit opt-in before the card is shown, and declining costs them
nothing and is not announced.

The app contains no nudity, no images, and no user-generated content. It collects no data
and makes no network requests after first load.

Test account: not required — no login exists.
```

`iarc_rating_id` is deliberately absent from the manifest. **IARC issues it after you complete
the Play questionnaire** — add it then. Never invent one; a fabricated rating id is false
metadata in a store submission.

---

## Android packaging checklist

1. Package the **final** canonical URL (custom domain — see above).
2. Generate the TWA: PWABuilder.com, or `npx @bubblewrap/cli init --manifest <url>/manifest.webmanifest`.
3. **Save `signing.keystore` and `signing-key-info.txt` somewhere permanent.** Lose them and you
   can never update the app under this listing again. Not "hard to" — cannot.
4. Deploy `/.well-known/assetlinks.json` from `store/assetlinks.template.json`, filling in the
   real package name and SHA-256 fingerprint. Put it in `public/.well-known/` so Vercel serves it.
5. Upload the `.aab`, complete Data Safety + IARC + target audience.
6. **After upload, copy the SHA-256 from Play App Signing and update `assetlinks.json` again.**
   Play re-signs your app, so the fingerprint changes. Skipping this is the single most common
   reason a shipped TWA shows a browser address bar.

## Data Safety / App Privacy answers

Both are the same, and both are simply true:

- Data collected: **none**
- Data shared: **none**
- Tracking: **no**
- Account required: **no**
- Data deletion request: not applicable — nothing is collected

Local storage holds the in-progress game (names, counters, prompt ids) on the device only. It
expires after 12 hours and is deleted when a game ends. Answers are never recorded.
