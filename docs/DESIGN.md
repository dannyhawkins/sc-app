# sc-app design spec — v1: Mission & Blueprint Tracker

Companion to [`API.md`](API.md). Every field named here is a real field off the wire; the sample
bytes are in [`../fixtures/`](../fixtures/). The mockup is [`mockup.html`](mockup.html) — open it
in a browser, it has no dependencies.

Scope is the Mission & BP Tracker only. Mining, hauling, chat, trade, Twitch and the feed are not
designed here; §11 says where they would slot in.

---

## 1. The call: plain, not diegetic

The overlay wears sixteen cockpit skins because it is drawn *inside* the cockpit. Drake's duct tape
and Anvil's bolts are right there because the frame around them is the Cutlass or the Carrack. The
skin's job is continuity with the game frame it sits in.

A phone propped on the desk is not in that frame. The thing it needs continuity with is the
*data*, not the chrome. So v1 is a plain, dark, high-contrast instrument panel, and it borrows
exactly three things from the overlay:

1. **The ship accent.** `ship.accent` arrives in every frame, free, no entitlement, no assets —
   it is a hex string. The phone tints itself to whatever you are flying, the same way the
   overlay does. That one gesture is what makes it read as the same product: you climb into a
   Drake and both screens go orange.
2. **The palette roles.** Gold for values, amber for estimates and warnings, green for owned,
   red for trouble, mono for numbers and sans for words. Same colours meaning the same things.
3. **The words.** "~N estimated", "payout", "reported", "aUEC", "about 27 contracts to
   Prestige 2", "the game wrote a name I don't know". The honesty rules are the voice. If the two
   clients say different things about the same number, one of them is lying.

Why not carry the skins across:

- **Legibility.** The skins are translucent panels at 72% alpha with scan lines, sheens and
  dashed strips, tuned for a 1440p monitor the eye is already adapted to. On a 390pt screen, in a
  dark room, with the eye re-focusing from a bright monitor for under a second, every one of those
  layers is noise between the reader and the number.
- **Cost.** Sixteen skins are sixteen CSS blocks plus webp hardware — for a client that is
  read-only in v1. That is the wrong place to spend the first build.
- **They are a subscriber perk.** Pinned skins are server-gated. The phone would be porting a
  paywalled feature to a surface that can't pay. The accent is the free tier and it is enough.

The rule for later: if a skin ever comes to the phone it is a *theme of the tokens in §7*, not a
port of the overlay's CSS. Nothing in this spec assumes textures.

### Legible in a dark room, in 800ms

Every screen answers three questions in one glance, in this order, top to bottom:

1. **Is this live?** — one dot, one word, in the status bar. Accent when live, amber when
   stale, red when the PC is gone.
2. **What am I on and how far along?** — the mission title and a single large number: `3 / 7`.
3. **What's still missing?** — the pool, unowned rows bright, owned rows sunk.

Everything else (facts, standing, recents, earnings) is below the fold or smaller. Rules that
follow from that:

- Near-black background (`#0A0E13`), so the phone is not a lamp next to the monitor. OLED-friendly.
- No text below 13pt anywhere; nothing that carries information below 15pt on the Tracker.
- No thin weights. Inter 500 minimum for text, 600 for anything you glance at.
- Never hue alone for state. Owned = check glyph + dimmed text; estimated = tilde + label;
  stale = badge text, not just a colour change.
- Numbers are tabular mono, so `3 / 7` and `681,750` don't shimmer when they change.
- No drop shadows (dark-on-dark shadows are mud). Hierarchy by surface tone and hairlines.
- Screen stays awake while the Tracker is showing and the connection is live (`expo-keep-awake`).
  A propped-up phone that locks after 30s is a brick.

---

## 2. Information architecture

Three screens and two sheets. Nothing else.

| Screen | Why it exists | Interaction |
|---|---|---|
| **Connect** | There is no discovery. Cold start is the user typing an IP. | Type once, remembered. |
| **Tracker** | The glance screen. One screen, three *modes* chosen by the payload (tracked / idle / unreachable), never by navigation. | Read. Pull to refresh. |
| **Lookup** | `/api/mission-search` → `/api/mission-preview`. The one feature where the phone beats the overlay: typing on a phone is fine, typing over a game is not. Works with no game log at all. | Type, tap. |
| *Preview sheet* | The brief for a Lookup result. Same components as a tracked mission. | Read. |
| *Blueprint sheet* | `/api/blueprint-detail` for one row, when `hasDetail`. For the moment you are standing at a fabricator, not mid-mission. | Read. |

Navigation: two tabs at the bottom (**Tracker**, **Lookup**) and a small host chip in the status
bar that opens Connect. No settings screen — the only setting is the host, and `prefs.timeRelative`
comes from the server.

Tablet / landscape (≥ 700pt wide): Tracker becomes two columns — mission header + pool on the
left, standing + recents + earnings on the right. Same components, one `flexDirection` flip.

What is deliberately **not** a screen:

- **Mission picker.** `missions[]` + `selectedId` exist, but `POST /api/missions/select` is 403
  from a phone. The phone shows what the PC is tracking. If `missions.length > 1` the header says
  `3 accepted` in a dim chip, and that chip is where a picker drops in when pairing lands.
- **Owned toggle.** Same reason. Rows show the server's `owned`/`source`; they are `Pressable`
  only to open the blueprint sheet. The trailing edge of a row is reserved empty (§8 `BlueprintRow`)
  so a checkbox can appear there later without re-flowing anything.
- **Settings.** See above.

---

## 3. The connection model

This is global — one state machine, one status bar on every screen. It matters more than any
single screen because the PC *will* sleep, the game *will* close and the wifi *will* drop, and the
app has to be calm and truthful every time.

### What the wire gives us

- `GET /missions/events` is SSE with **no heartbeat** — the server writes only when tracker state
  changes. A quiet hour looks identical to a dead socket. So the SSE alone cannot tell us we are
  connected.
- `GET /api/missions` is the same frame as a one-shot. Cheap, full state, no diffing needed.

### The design

- **SSE for immediacy.** The unlock flash (§5.4) has to land within a second of the log line.
- **Polling for truth.** `GET /api/missions` every **10s** with a 4s timeout. Every success stamps
  `lastSeenAt` and replaces state (frames are whole-truth, so this is free). This is the liveness
  probe *and* the self-heal if SSE silently dies.
- **Discriminate frames.** Any SSE frame with a `kind` field is not state — drop it (dev-reload
  rides the same stream).

```
                 probe ok
   ┌───────────────────────────────────────────┐
   ▼                                           │
 LIVE ──probe fails──▶ STALE ──3 misses / 30s──▶ UNREACHABLE
   ▲                     │                        │
   └─────probe ok────────┘◀───────probe ok────────┘
```

| State | Condition | Status bar | Body |
|---|---|---|---|
| `no-host` | nothing saved | — | Connect screen |
| `connecting` | first probe in flight | `○ 192.168.1.20 · connecting` (dim) | skeleton, ≤ 1s, then one of the below |
| `live` | probe ok ≤ 15s ago | `● 192.168.1.20 · live` accent dot | normal |
| `stale` | ≥ 1 miss, < 30s since last ok | `● reconnecting · last seen 12s ago` amber | last frame, unchanged. Not dimmed yet — a single missed probe on wifi is normal. |
| `unreachable` | ≥ 30s / 3 misses | `● can't reach 192.168.1.20` red | §5.3 |

The right-hand side of the status bar (patch · env) is shown only when `live`. In `stale` and
`unreachable` it is blank — the dataset version is irrelevant when you can't reach the PC, and the
left side needs the width at 390pt.

Retry cadence when unreachable: 5s, 10s, 20s, 30s, then every 30s. Instant retry on app
foreground, on tapping **Retry now**, and on pull-to-refresh. Background → foreground always
re-enters via `stale` until a probe returns, so we never show stale data as live.

**Three failure axes, one rule: absence, never error.**

1. *The sidecar* — the state machine above. The only one that gets a banner.
2. *Blueprint images* (`image`, `imageFallback`) are hosted on `subliminal.gg`, not the sidecar.
   The LAN can be fine and the internet down, or vice versa. Images are decoration; a failed
   image produces no error, placeholder or layout shift — the slot is simply absent. The only
   places an image appears are the unlock flash and the completion card.
3. *`community`* (`{payout, facts}`) is fetched by the sidecar from `subliminal.gg` and cached, so
   the phone needs no internet for it — but it is `null` whenever the sidecar is offline, the site
   is down, the cache missed, or nobody has reported that contract. That is most of the time. A
   null `community` removes the `reported` payout label and the community difficulty line and
   nothing else happens.

---

## 4. Screen: Connect

The cold-start screen and the "change address" screen. Deliberately boring — but it is the first
screen anyone sees, so the boring has to look finished.

```
  ┃ SC OVERLAY                                          ← label, accent left bar, 64pt from top
  ┃ Companion
  Your PC's mission tracker, on the phone next to it.  ← the one "what this is" line in the app

  Your PC's address
  ┌──────────────────────────┐
  │ 192.168.1.20             │   ← mono, numeric keypad w/ `.` and `:`
  └──────────────────────────┘
  Port 8778 unless you changed it.
  In SC Overlay: Settings → Browser sources & extra monitors
  has a copy button for this PC's address.

  [ Connect ]

  Recent
  · 192.168.1.20   last seen today 14:32

                    (flex: 1)

  Read-only. Talks only to your PC, only on this wifi.  ← footer, pinned to the bottom, caption dim
```

**Layout — decided, not inherited.** Top-anchored, everything left-aligned including the title
(the centred title was incidental; a left-aligned block reads as one column, and the accent bar
on the wordmark is the same gesture as the mission title's on the Tracker). Not vertically
centred: the block grows (error line, recents list) and a centred block that jumps as it grows
looks worse than a stable top. The keyboard argument is real but only covers the moment of
typing; before the first tap and after a failed connect the void is there, so the void gets a
job at both ends:

- **Top:** the wordmark and the one-line description. This is the only place the app says what
  it is, and it belongs on the screen a new user is staring at while wondering where to find an
  IP address.
- **Bottom:** a caption pinned to the bottom edge with the privacy posture — read-only, LAN only.
  That is the overlay's whole stance (see its README) and a cold-start screen asking for a network
  address is exactly where a user wonders what the app is going to do with it. The keyboard
  covers the footer while typing, which is fine — it is not needed while typing.

`KeyboardAvoidingView` around the form so the button stays above the keyboard; the footer is
outside it and may be covered.

**Connect button states.** A disabled button that looks dead is correct behaviour with a bad
signal, so each state looks different:

| State | Fill | Border | Label |
|---|---|---|---|
| empty / unparseable | none | `hairline` | `Connect`, `textFaint` |
| ready (field parses) | `accentSoft` | `rgba(accentRgb, .5)` | `Connect`, `text` |
| testing | `accentSoft` | same | `Connecting…`, `text`, non-pressable |
| after failure | back to *ready*; the error line under the field carries the message | | |

The transition empty → ready happens the instant the field parses (on every keystroke, no
debounce), so the button visibly wakes up as the address is typed.

*Verification status (2026-09-12):* the empty state has been seen on device. The ready and
testing states have not — the simulator setup in use can screenshot but not type or tap. §4 is
not done until someone has typed an address and watched the button change.

Field: one text input, `keyboardType: "numbers-and-punctuation"`, accepts `host`, `host:port`,
or a pasted `http://host:port/`. Normalises to `http://host:port`. Default port **8778**.

**States**

| State | What shows |
|---|---|
| empty | as above; **Connect** disabled until the field parses |
| testing | button reads `Connecting…`; one `GET /api/missions`, 4s timeout |
| ok | navigate to Tracker; host saved to a recents list (max 5, newest first) |
| refused / timeout | inline, under the field, amber: `Nothing answered at 192.168.1.20:8778. Is SC Overlay running on that PC, and is this phone on the same wifi?` Field keeps its value. |
| answered but not the sidecar | (non-JSON, or JSON without `patch`) red: `Something answered, but it isn't SC Overlay.` |
| 403 | red: `SC Overlay refused this address.` — only reachable if the user typed a loopback-listed path; practically never |

Where the IP comes from is the sidecar's problem; until QR pairing exists, the copy points at the
place the desktop app already shows it: Settings → *Browser sources & extra monitors* has a phone
hint with a copy button for `http://192.168.x.x:8778/…` (`overlay/config.html:741`). The field
accepts that whole pasted string and strips the path. Caveat the copy has to survive: that hint
is hidden when the sidecar can't find a private LAN IPv4 (VPN-only boxes), so the sentence says
"has a copy button", not "will show you".

---

## 5. Screen: Tracker

One screen. The payload picks the mode:

- `title !== null` → **tracked** (§5.1)
- `title === null` → **idle** (§5.2)
- connection `unreachable` → **unreachable** (§5.3), drawn over whichever of the above was last seen
- `justReceived` / `completion` non-null → overlays (§5.4), on top of either mode

### 5.1 Tracked

Top to bottom. Fixture values from `mission-preview.json` in brackets.

**Status bar** — `● 192.168.1.20 · live` left; `4.10.0 LIVE` (`patch`, trimmed to the version and
`logEnv`) right, dim. If `build` is non-null and differs from `patch`'s changelist, an amber `·
dataset behind` suffix — the overlay flags this too.

**MissionHeader**

```
 InterSec Defense Solutions · Collection                 ← giver · missionType, dim, 15pt
 Recover Vanduul Tech                                    ← title, 22pt/600, accent left bar
 ~681,750 aUEC · estimated                               ← PayoutLine, §6
 1h 36m run · 5.8 / 7 · no retry                         ← FactsRow (facts.diff is CIG's 1–7)
 ▰▰▰▱▱ 3.4 · players say, 12 reports                     ← CommunityFacts, only when community.facts is non-null
 Offered at Nyx I, Nyx II, Nyx III                       ← whereToGet, dim; omitted when []
```

**Two difficulty numbers, never conflated.** `facts.diff` is CIG's blended difficulty on **1–7**
from the dataset; it renders as a plain `5.8 / 7` in the facts row and is never drawn as a meter.
`community.facts.difficulty` is **1–5**, averaged from players who ran the contract, with
`difficultyAnswers` as the report count — that is the one that earns a five-segment meter, and it
always carries its report count so one opinion can't read as consensus. `community` is null most
of the time (offline, cache miss, nobody has reported) and null is normal: the line is simply
absent. No spinner, no placeholder, no layout shift.

- `illegal: true` → a red `CRIMESTAT` chip after the type. Absence shows nothing (the field
  promises illegality, never legality).
- `rankRequired !== null` → dim chip `needs Contractor` (`rankRequiredName`, falling back to the
  number).
- `missions.length > 1` → dim chip `3 accepted` (§2, future picker slot).
- `ambiguous: true` → **AmbiguousBanner** under the header, amber hairline: `Several contracts
  share this name. Pool shown is the union — odds are approximate.` `whereToGet` is omitted by
  the server in this case; don't try to show it.

**PoolProgress** — the glance number.

```
  0 / 7                    ← 40pt mono 600, `totals.owned` gold, `/ total` dim
  ▓▓▓▓▓▓░░░░░░░░░░░░░░     ← 4pt bar, accent fill, `surface-2` track
```

`hasPool: false` → replace with `No blueprint pool for this contract.` in dim body text. If
`eventTrack` is non-null, show its `name` and `note` under that line; the tier ladder itself is
out of v1 scope (§11).

**Pool** — grouped by `tab`, in dataset order within a group. Group header is the tab, 13pt/600,
letter-spaced, dim. Each **BlueprintRow**:

```
  ○  Pulse Laser Pistol                                ›
     Sidearms
  ○  Pulse Laser Pistol Battery (60 Cap)               ›
     Magazines
  ✓  Testudo Arms Earthshake                           ›   ← owned: dim name, green check
     Arms
```

- The name runs full width on the first line; `sub` is a caption on the second line, not a
  right-hand column. Checked at real device size: a right column squeezes long names
  (`Testudo <Part> Earthshake` wraps against `Backpacks`), and the ragged left edge of the
  captions is cleaner than two columns. Rows are 56pt min with the second line.
- Leading glyph: `○` unowned (text-faint), `✓` owned (green). `source` is exposed as a dim
  suffix only when it is `manual` or `fab` (`· marked by hand`, `· from fabricator`): the
  overlay lets you tick things yourself, and the phone should say when a tick was a human, not the
  log. `in-game` and `default` show nothing extra.
- `chance < 1` → mono `62%` at the end of the first line, gold. `chance === 1` shows nothing — seven rows
  all saying "guaranteed" is noise.
- Trailing 44pt is reserved and empty (future toggle).
- Row is `Pressable` iff `hasDetail`; opens the Blueprint sheet. A tiny `›` at the far right when
  it is.
- `otherPools.length > 0` → **OtherPoolsNote** at the bottom of the pool: `This title has other
  pools elsewhere: Stanton · 2 / 6, Pyro · 0 / 4` from `places`/`owned`/`total`. This is the
  single most useful thing the dataset knows; keep it visible, not behind a tap.

**UnrecognizedNotice** — whenever `unrecognized.names.length > 0`, directly under the pool, amber
hairline, never dismissable:

```
  The game wrote 2 names I don't know
  "Testudo Kern Erdbeben" · "Pulslaser-Pistole"
  Fix this in SC Overlay → Settings → Language.            ← packActive ? mention Recalibrate : not
```

Silence here reads as "the app is broken". Show the raw strings.

**StandingBlock** — `repBar` non-null and `!noData`:

```
  STANDING · InterSec Defense Solutions
  Sr. Contractor  ──────────────▓▓░  Veteran Contractor
  ~about 27 contracts to Veteran Contractor · est.
```

- The contracts figure comes from `standings[]` matching `repBar.faction` (`contractsToGo`);
  `repBar` itself carries rep, and rep is trivia. When no standings entry matches, fall back to
  `~N rep to go`. At `max`: `Max rank`.
- `offTrack: true` → amber line: `This contract won't move this bar.`
- `noData: true` → `Standing estimate unavailable — no completions seen yet.` No bar.
- `nextRewards.length > 0` → dim: `Unlocks: Prospector`.
- Always labelled `est.` — the number is a floor reconstructed from logs.

**ItemRewards** — `itemRewards.length > 0`: a short list under the pool, `2× Medpen`, with the
same glyphs. `owned` is manual-only on the desktop; show it, can't set it.

**States for 5.1**

| State | Trigger | Treatment |
|---|---|---|
| loading | first frame not yet in | skeleton: status bar, three text bars, one big number bar, five row bars. ≤ 1s or it becomes `unreachable`. |
| tracked, populated | `title`, `hasPool`, `pools[0].blueprints.length > 0` | as above |
| tracked, no pool | `hasPool: false` | header + `No blueprint pool for this contract.` + `eventTrack` name/note if any |
| tracked, ambiguous | `ambiguous: true` | banner; pool still drawn |
| tracked, unrecognised names | `unrecognized.names.length > 0` | notice under the pool, on top of any of the above |
| tracked, completed | `completed: true` | title gets a green `DONE` chip; `completion` overlay handles the rest |
| stale | conn `stale` | nothing changes below the status bar |
| unreachable | conn `unreachable` | §5.3 |

### 5.2 Idle (between contracts)

`title === null`. The useful question is "what do I go do next", so lead with that.

**ClosestPools** — up to 4 `closestPools[]` as cards:

```
  CLOSEST TO DONE
  ┌──────────────────────────────────────────┐
  │ Shubin Interstellar · Ship Mining   5 / 7 │  ← poolName, owned/total in mono gold
  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░                      │
  │ Missing: Mining Laser Mk II, Radar S2     │  ← `missing`, the tie-breaker between look-alike pools
  │ via Mine Quantanium for Shubin  +3 titles │  ← missionTitles[0], count of the rest
  └──────────────────────────────────────────┘
```

Do **not** render `payMin`/`durMin`/rep/cooldown here. The source says so in red: the per-hour
figure belongs to the session tracker, not to "closest to done". If the owner wants it, he asks.

**Standings** — `standings[]`, up to 4, one line each:

```
  STANDING
  Recco Battaglia     Sr. Contractor    ~27 contracts to Veteran Contractor
  Wikelo              Rank 1            ~140 contracts to Rank 2
  Headhunters         Max rank
```

`contractsToGo` in gold mono. Null with `toGo` non-null → `~N rep to go` (dim; it is trivia but
it is honest). `nextRewards` as a dim `· unlocks Prospector` suffix when present.

**Earnings** — `earnings`, one strip. Only what the server hands over, never summed on the phone:

```
  THIS SESSION
  4 contracts · 1,250 rep · ~86,000 aUEC from 3 of 4 · est.
```

- `aUECTotal === null` → the money segment reads `— aUEC`, never `0`.
- `aUECEstimated` → tilde + `est.`; `aUECModelled` → `modelled` instead, amber. Both flags are
  currently always true whenever there is a figure at all, so design for the tilde being the norm.
- `aUECFrom` / `missions` always shown together (`from 3 of 4`) so a total from a subset can't
  read as the whole session.
- `missions === 0` → strip reads `No completions yet this session.`

**Recent** — `recentMissions` and `recentBlueprints`, newest first, 5 each, one line each with
the time on the right (`prefs.timeRelative` → `12 min ago`, else `14:32`). Mission `aUEC` when
non-null, labelled `aUEC` (it *was* logged live, that is the one place the word is earned). No
images here.

**States for 5.2**

| State | Trigger | Treatment |
|---|---|---|
| idle, first run | all of `closestPools`, `standings`, `recentMissions`, `recentBlueprints` empty, `collectedTotal === 0` | one calm block, centred: `Nothing tracked.` / `Accept a contract with a blueprint pool and it'll show up here.` Below, dim: `SC Overlay 0.1.47 · dataset 4.10.0` |
| idle, sidecar has no log | as above and `logEnv === null` | add one dim line: `No game log seen yet — is Star Citizen running?` (that's exactly the dev-loop case on a Mac, and the game-closed case on Windows) |
| idle, some history | anything non-empty | sections in the order above; empty sections are omitted, not shown as "none" |
| idle, blueprints but no pools | `collectedTotal > 0`, `closestPools` empty | the big number becomes `collectedTotal` labelled `blueprints collected` |

### 5.3 Unreachable

Not an error page. A calm banner over the last frame we had.

```
  ● can't reach 192.168.1.20                               ← status bar, red

  ┌──────────────────────────────────────────┐
  │  Can't reach your PC                     │  ← 22pt/600
  │  Last seen 14:32 · 6 min ago             │  ← mono, dim
  │                                          │
  │  Usually the PC went to sleep, the game  │
  │  closed, or the wifi dropped. Retrying   │
  │  every 30s.                              │
  │                                          │
  │  [ Retry now ]      [ Change address ]   │
  └──────────────────────────────────────────┘

  (last frame, at 40% opacity, below)
```

- The last frame stays visible underneath at 40% opacity so the user can still read "I was at
  3 / 7" — that is real information and it was true when we last saw it. The banner's `Last seen`
  says exactly how old it is.
- Never had a frame (cold start, host saved, PC off) → same banner, nothing underneath, and the
  copy's first line becomes `Nothing answered at 192.168.1.20:8778.`
- On the first successful probe: banner slides away, frame replaces, status bar goes accent. No
  toast, no "reconnected!" — being back is the normal state.
- `Retry now` fires a probe immediately and shows `Connecting…` in the status bar for its duration.

### 5.4 Overlays

**ReceivedFlash** — `justReceived` non-null and its `at` newer than the last one we showed.

The one moment the phone should *take* attention. Full-width card at the top of the Tracker,
accent background, 6s, then folds into the pool (the row is now owned in the next frame anyway).

```
  ┌──────────────────────────────────────────┐
  │ BLUEPRINT RECEIVED                       │  ← 13pt/600, letter-spaced, on accent
  │ Testudo Helmet Earthshake                │  ← 22pt/600
  │ [img]                                   │  ← `image` → `imageFallback` → nothing; 64pt, right-aligned
  └──────────────────────────────────────────┘
```

Identity is `at`; a re-render with the same `at` must not restart it. Light haptic
(`Haptics.notificationAsync(Success)`) — that's the game's "ding" reaching the desk.

**CompletionCard** — `completion` non-null, identity `completion.at`, stays while the server
keeps it (≈ 30s) and folds when it goes null. Sits above the pool, `surface-2`, accent hairline.

```
  COMPLETED · 14m 12s                        ← durationMs; omitted when null
  Recover Vanduul Tech
  ~681,750 aUEC · estimated                  ← PayoutLine on completion.aUEC / payout / payoutEstimated
  +120 InterSec Defense Solutions            ← reputationGained, faction not scope
  Pool now 1 / 7                             ← poolProgress
  Can be taken again in 45m                  ← facts.cd; omitted when absent
  2 blueprints received                      ← blueprints[]; names listed under, no images
```

`aUecPerHour` shows only when non-null, dim mono: `~2.9M aUEC/hr` — tilde if `payoutEstimated`.

---

## 6. Honesty rendering rules (the mapping, exactly)

These are the overlay's decisions. The phone renders them the same way or it is a different
product.

### 6.1 Money — `PayoutLine`

Inputs: `{aUEC?, payout, payoutEstimated, community?}`. Precedence, highest first:

| Source | Condition | Renders |
|---|---|---|
| logged live | `aUEC` non-null (completion only) | `681,750 aUEC` gold |
| player-reported | `community.payout` non-null | `681,750 reported` gold |
| from game files | `payout` non-null, `payoutEstimated: false` | `681,750 payout` gold |
| modelled | `payout` non-null, `payoutEstimated: true` | `~681,750 estimated` amber |
| nothing | all null | `—` dim. Never `0`. |

- `payout.min === payout.max` → one figure. Differ → `450,000–681,750`. `min` 0 or null →
  `up to 681,750`.
- The phone **never** adds money. Totals come from `earnings`, already filtered by the server.

**The wording rule — the provenance word *is* the unit.** A money figure is followed by exactly
one word, and that word says where the number came from: `aUEC` (the game logged it), `reported`
(players said so), `payout` (game files), `estimated` / `est.` / `modelled` (a model, with a
tilde). There is never a second unit word: `~681,750 estimated`, not `~681,750 aUEC estimated`.
This is the overlay's convention verbatim, and it only works if `aUEC` is reserved for the one
case it is earned — the moment you write `aUEC` next to an estimate, the word stops meaning
anything. Corollaries:

- `recentMissions[].aUEC` is a logged award, so `12,500 aUEC` is correct there.
- `earnings.aUECTotal` is built from listed payouts (`aUECEstimated` is true whenever there is a
  figure), so it renders `~86,000 est.` — or `~86,000 modelled` when `aUECModelled` — never
  `aUEC`.
- A dash has no provenance, so it carries the plain unit as a slot name: `— aUEC`.
- The wire's `currency: "UEC"` is never printed; the players say aUEC and so do we.

### 6.2 Estimates carry a tilde and a word

`~` prefix + `estimated` / `est.` / `modelled` suffix, amber. Both, always. Colour alone is not a
label in a dark room.

### 6.3 Unrecognised blueprints are said out loud

`unrecognized.names` non-empty → §5.1 notice, raw strings quoted. Never swallowed, never
dismissable.

### 6.4 Standing is contracts, not rep

`contractsToGo` first. Rep only as a fallback, and only with a tilde. `estimate` (the raw floor) is
never displayed as a number on its own.

### 6.5 Absence is not a promise

- `facts.noRetry` absent → say nothing. Never `retry OK`.
- `illegal: false` → say nothing.
- `whereToGet: []` → say nothing.
- `earnings.aUECTotal: null` → `—`.

---

## 7. Design tokens

Dark only in v1. This is used at night; a light theme is not planned and nothing here should
assume one.

### Colour

| Token | Value | Use |
|---|---|---|
| `bg` | `#0A0E13` | screen |
| `surface` | `#121820` | cards, sheets |
| `surface2` | `#1A222C` | bar tracks, nested cards, completion card |
| `hairline` | `rgba(255,255,255,0.08)` | every border |
| `text` | `#E8EEF3` | primary (16:1 on bg) |
| `textDim` | `#93A3B1` | secondary (7.3:1) |
| `textFaint` | `#5F6F7C` | decoration only — glyphs, dividers. Never information (3.6:1). |
| `accent` | `ship.accent`, default `#45D0E0` | live dot, title bar, progress fill, flash card |
| `accentSoft` | `rgba(ship.accentRgb, 0.14)` | tinted surfaces |
| `value` | `#FFD27A` | money and counts — the overlay's `--gold` |
| `estimate` | `#F5A623` | tildes, stale, warnings — the overlay's `--amber` |
| `owned` | `#2EE6A0` | check glyphs, DONE |
| `danger` | `#FF8478` | unreachable, CRIMESTAT |
| `onAccent` | `#07131A` | text on the flash card |

Text on `accent` must be `onAccent` for every manufacturer accent in the table (`cnou` is
`#CFF0F6`, nearly white; `banu` is `#F2511E`). Both pass with dark text; neither passes with light.

### Type

Bundled via `expo-font`: **Inter** (500, 600, 700) and **JetBrains Mono** (500, 600). Both OFL.
System fallback if the build wants zero assets: `System` / `Menlo`–`Roboto Mono`. Inter is what
the overlay uses; the mono is a choice (the overlay uses whatever the OS has).

| Token | Family | Size / line | Weight | Use |
|---|---|---|---|---|
| `display` | mono | 40 / 44 | 600 | the one big number, tabular |
| `title` | sans | 22 / 28 | 600 | mission title, banner headings |
| `body` | sans | 17 / 22 | 500 | rows, copy |
| `bodyStrong` | sans | 17 / 22 | 600 | unowned blueprint names |
| `num` | mono | 17 / 22 | 500 | inline figures, times, `62%` |
| `label` | sans | 13 / 16 | 600 | section headers, letter-spacing 1 |
| `caption` | sans | 13 / 16 | 500 | timestamps, suffixes — `textDim` |

`fontVariant: ['tabular-nums']` on every mono style.

### Spacing — 4pt base

`4 · 8 · 12 · 16 · 20 · 24 · 32`. Screen gutter **16**. Card padding **16**. Section gap **24**.
Row min-height **52**, **56** for two-line blueprint rows (touch-safe even though touching is rare). Status bar height **36**.

### Radii

`6` chips · `10` cards · `14` sheets and the flash card · bar `2`.

### Borders, motion

One-pixel `hairline` on cards. No shadows. Motion: 180ms ease-out for the flash card in, 240ms
for out; state changes (live↔stale) fade the status bar colour over 300ms, nothing else animates.
The pool list never re-orders on a change (positions are what you glance at).

---

## 8. Component inventory

Props are the wire fields — no renaming layer between the payload and the component.

| Component | Props (from the payload) | Notes |
|---|---|---|
| `StatusBar` | `conn`, `host`, `lastSeenAt`, `patch`, `logEnv`, `build`, `accent` | the only always-present chrome |
| `HostForm` | `initial`, `recents`, `onConnect` | Connect screen |
| `MissionHeader` | `title`, `giver`, `missionType`, `illegal`, `rankRequired`, `rankRequiredName`, `missionsCount`, `accent` | shared with the preview sheet |
| `PayoutLine` | `aUEC?`, `payout`, `payoutEstimated`, `community?` | §6.1 |
| `FactsRow` | `facts` | `dur` → `1h 36m run`, `diff` → `5.8 / 7` (CIG's scale, plain text, no meter), `noRetry` → `no retry`, `cd` → `retake after 45m`. Absent → omitted. |
| `CommunityFacts` | `community.facts` | five-segment meter on `difficulty` (1–5) + `difficultyAnswers` as `N reports`. Rendered only when non-null; null is the everyday case. |
| `WhereToGet` | `whereToGet` | omitted when empty |
| `AmbiguousBanner` | — | static copy |
| `PoolProgress` | `owned`, `total`, `accent` | the big number |
| `PoolGroup` | `tab`, `rows` | header + rows |
| `BlueprintRow` | `name`, `owned`, `source`, `chance`, `sub`, `item`, `hasDetail` | trailing 44pt reserved |
| `OtherPoolsNote` | `otherPools` | |
| `UnrecognizedNotice` | `names`, `packActive` | never dismissable |
| `StandingBlock` | `repBar`, `standing?` (matched from `standings[]`) | tracked mode |
| `StandingRow` | `FactionStanding` | idle mode |
| `ClosestPoolCard` | `ClosestPool` | never renders pay/dur/rep |
| `EarningsStrip` | `earnings` | never sums |
| `RecentList` | `recentMissions`, `recentBlueprints`, `timeRelative` | |
| `ReceivedFlash` | `justReceived` | identity `at` |
| `CompletionCard` | `completion` | identity `at` |
| `UnreachableBanner` | `host`, `lastSeenAt`, `hadFrame`, `onRetry`, `onChangeHost` | |
| `EmptyIdle` | `collectedTotal`, `appVersion`, `patch`, `logEnv` | |
| `Skeleton` | — | first paint only |
| `SearchField`, `SearchResultRow` | `title`, `giver`, `variants`, `hasPool` | Lookup |
| `PreviewSheet` | `MissionPreview` | composes MissionHeader + PayoutLine + FactsRow + PoolProgress + PoolGroup |
| `BlueprintSheet` | `blueprint-detail` response | §10 |

State lives in one store: `{conn, host, lastSeenAt, frame}`; every component reads from `frame`.
No component fetches on its own except the two sheets.

---

## 9. `ship.accent` — how theming factors in

- One token, `accent`, set from `ship.accent` on every frame. Default `#45D0E0` (mobiglas), which
  is also what the server sends on foot (`onFoot: true`, `manufacturer: null`).
- It tints: the live dot, the title's left bar, the progress fill, `accentSoft` surfaces, the
  flash card. Nothing else. Text is never the accent — cnou's near-white and banu's orange would
  wreck contrast.
- Change is a 300ms colour fade. No swoosh, no manufacturer logo, no textures.
- The status bar shows `ship.ship` (`Cutlass Black`) in caption when non-null. That, and the
  colour, is the whole "you are in a Drake" tell — and it is enough.
- `ship.theme` is ignored in v1. It is the hook if skins ever come across (§1, last paragraph).

---

## 10. Screen: Lookup, and the two sheets

**Lookup** — the `StatusBar` (§3: every screen, no exceptions — a stale connection has to be
visible from this tab too), a search field under it, results under that. The field's placeholder
is `Contract name`. The empty-state body says what the screen is *for*, not what a search box is:
`Look up any contract's blueprint pool — including ones you haven't accepted.` No contract count in
the copy: the bundled dataset's count changes every patch and there is no endpoint to derive it
from, and a hardcoded figure nobody would think to update is exactly the kind of number this
project doesn't ship. `GET /api/mission-search?q=` after 2
characters, debounced 250ms. `SearchResultRow`: `title` / `giver` dim / `hasPool` → accent dot on
the left, `variants > 1` → dim `· 8 variants` suffix. Tap → **PreviewSheet** via
`/api/mission-preview?title=`. The sheet is `MissionHeader` + `PayoutLine` + `FactsRow` +
`WhereToGet` + `PoolProgress` + `PoolGroup`s — the same components, so a looked-up contract looks
exactly like a tracked one, minus the standing block. `owned`/`total` on the preview are the
player's real progress against that pool, so the big number is meaningful here too.

States: empty (the body line above, dim, centred), typing (< 2 chars, nothing),
loading (results dim to 50%, no spinner), no results (`Nothing called "…"`), error → the sheet
shows the same `UnreachableBanner` copy inline. Lookup works with no game log at all — it is the
dev-loop screen.

**BlueprintSheet** — `/api/blueprint-detail?item=`. Name, `craftTimeSeconds` → `2 min craft`,
`stats[]` as `label value unit` rows, then `recipeGroups[]` each as a labelled group of
`materials` (`Lindinium 0.02 SCU`, `sell` as `· sells 51,000` dim when non-null), `chooseOne` →
`pick one:` prefix. `manufacturer` equal to `<= PLACEHOLDER =>` is treated as absent. `ingredients`
is the flat list; `recipeGroups` is the useful one — render groups, skip the flat list.
`hasDetail: false` rows never open this.

---

## 11. Later, and where it slots in

- **Writes (paired-device token).** `BlueprintRow`'s reserved trailing slot becomes a checkbox;
  the `3 accepted` chip becomes the picker. `HostForm` grows a "pair with QR" button that
  replaces typing. No screen is added or removed.
- **QR pairing** replaces the IP field; the Connect screen keeps its shape.
- **Other subsystems** would be additional bottom tabs, each with its own SSE/poll pair and the
  same `StatusBar`. Mining is the obvious second — its scanner state is exactly the kind of thing
  you glance at a phone for.
- **Skins** — a theme of §7's tokens keyed by `ship.theme`, never textures.
- **Light theme** — not planned. If it comes, `textFaint` needs re-deriving; everything else is
  token-swappable.

---

## 12. Open questions for the owner

None open.

Resolved (answers folded into the sections above): `otherPools` stays always-visible under the
pool (owner, 2026-09-12: "go with your recommendations"); `facts.diff` is 1–7 and distinct from the
community 1–5 figure (§5.1); `community` is `{payout, facts}`, sidecar-fetched, null by default
(§3, §6.1); the Connect copy points at Settings → Browser sources & extra monitors (§4).

---

## Appendix A — wire shapes the fixtures don't populate

Every fixture in this repo was captured with no game log, so `standings`, `closestPools`,
`recentMissions`, `recentBlueprints`, `completion`, `justReceived` and `otherPools` are all empty.
These are their real shapes, read from `sc-overlay/src/missions.ts` (line numbers as of 0.1.47).
Build against these, not against guesses.

**`standings[]` — `FactionStanding` (`missions.ts:126`)**

```ts
{ faction: string;            // giver, dataset spelling
  scope: string;              // rep scope, e.g. "FactionReputation" — internal, don't display
  standing: string;           // current rank NAME, "Sr. Contractor"
  nextName: string | null;    // next rank NAME, null at max
  estimate: number;           // rep floor — never display as a bare number
  curMin: number; nextMin: number | null;
  pct: number;                // 0–100 through the CURRENT rank; 100 at max — this is the bar
  toGo: number | null;        // rep to next rank, null at max
  contractsToGo: number | null; // the number to show; null at max or when unscoreable
  nextRewards: string[] }
```

So the idle `StandingRow` bar is honest: fill `pct`, left label `standing`, right label
`nextName`, line under it `~N contracts to <nextName>`. `nextName === null` → `Max rank`, bar
full.

**`repBar` — `RepBar` (`missions.ts:168`)**, the tracked mission's giver

```ts
{ scope: string; faction: string; standing: string; estimate: number;
  curMin: number; nextMin: number | null; nextName: string | null; nextRank: number | null;
  nextRewards: string[]; max: boolean; offTrack?: boolean; noData: boolean }
```

No `pct` here — derive `clamp((estimate - curMin) / (nextMin - curMin), 0, 1)`; `max` → full.
`contractsToGo` comes from the `standings[]` entry whose `faction` matches; absent → fall back to
`~(nextMin - estimate) rep to go`.

**`closestPools[]` — `ClosestPool` (`missions.ts:69`)**

```ts
{ poolUuid: string; key: string; title: string;
  poolName: string;           // "Shubin Interstellar · Ship Mining" — the card title
  missionTitles: string[];    // shortest first; show [0], count the rest
  variants: number;
  missing: string[];          // blueprints still needed, alphabetical — the tie-breaker line
  owned: number; total: number; places: string[];
  payMin: number | null; payMax: number | null; payoutEstimated: boolean;   // DO NOT RENDER (§5.2)
  durMin: number | null; rep: number | null; cooldownMin: number | null;    // DO NOT RENDER
  giver: string | null; missionType: string | null }
```

**`otherPools[]`** (on the view, `missions.ts` `TrackedView`)

```ts
{ places: string[]; total: number; owned: number }[]
```

**`recentMissions[]` / `recentBlueprints[]` (`missions.ts:565`, `:572`)**

```ts
{ title: string | null; aUEC: number | null; at: string | null }
{ name: string; at: string | null; item: string | null; image: string | null; imageFallback: string | null }
```

**`justReceived`** — `BlueprintReward & { at: string }` (`missions.ts:616`)

```ts
{ name: string; item: string | null; image: string | null; imageFallback: string | null; at: string }
```

**`completion`** (`missions.ts:799`)

```ts
{ title: string | null;
  aUEC: number | null;                       // logged live → the one place "aUEC" is earned
  payout: { min: number | null; max: number; currency: string | null } | null;
  payoutEstimated: boolean;
  facts: MissionFacts | null;                // `cd` → "can be taken again in N"
  durationMs: number | null;
  blueprints: BlueprintReward[];
  at: string;                                // identity
  contractKey: string | null; giver: string | null; missionType: string | null; rank: number | null;
  reputationGained: { faction: string; scope: string; amount: number }[];   // show faction, never scope
  aUecPerHour: number | null;
  timesCompleted: number | null;
  poolProgress: { owned: number; total: number } | null;
  classification: { combat: unknown | null; activity: unknown | null; source: "generator" | "missionType" | null } }
```

`RepEntry` (`missions.ts:44`) is `{faction, scope, amount}` everywhere it appears —
`reputationGained`, `reputationLost`, `completion.reputationGained`. Display `faction`; `scope` is
the internal ladder name and reads as "FactionReputation +50" if you let it through.
