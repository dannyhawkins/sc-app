# The sidecar contract

Everything here was verified first-hand against a running sidecar (`sc-overlay` @ `0.1.47`,
booted on macOS with `SC_BP_NO_WINDOW=1 PORT=8899 npx tsx src/overlay-server.ts`). Sample
responses are in [`../fixtures/`](../fixtures/) — those are real bytes off the wire, not
hand-written examples.

## What the sidecar is

SC Overlay's data layer is a plain Node HTTP server (`src/overlay-server.ts`) that tails Star
Citizen's `game.log`, turns it into structured state, and serves that state over **HTTP + SSE**.
It imports no Electron and no native modules. The Electron app spawns it as a child process and
is otherwise just a window manager.

That means this app is not a port of anything — it is a second client for a server that already
exists and already answers on the LAN.

- Listens on **all interfaces**, port from `process.env.PORT`, default **8778**
- Transport is `fetch` + `EventSource`. No WebSocket on the inbound side.
- Payloads are plain JSON.

## Base URL

`http://<game-pc-lan-ip>:8778`.

There is **no discovery path a phone can use.** The sidecar does compute its own LAN IPv4 and
hand it out — but it does so from `GET /api/config`, which is on the loopback-only list (see
below). So the phone cannot ask the server where the server is.

v1 therefore takes the host from the user. See `docs/DESIGN.md` for how that's presented; the
roadmap has QR pairing as the fix.

## Access control — read this before designing anything

`src/overlay-server.ts:2094` (`fromThisMachine`) and the gate at `:2362`:

| Request | Reachable from a phone? |
|---|---|
| `GET` not on the sensitive list | ✅ yes — this is the OBS browser-source case, open on the LAN by design |
| Any `POST`/mutation | ❌ **403** — loopback only |
| `GET /api/config`, `/api/diagnostics`, `/api/setup`, `/api/ocr/health`, `/api/localization`, `/api/can-embed`, `/api/mining/tone`, `/api/scfeed/tone`, `/api/dev/note` | ❌ **403** — loopback only |

There is a second gate — an `Origin` allowlist — but it only fires when `Origin` is present and
names a non-loopback host. React Native's `fetch` sends no `Origin`, so it passes. **The
loopback check is the real barrier, and it is the only one.**

**Consequence for v1: this app is read-only.** Every write below is listed for completeness and
will 403 until the sidecar grows a paired-device token. That is deliberate — the current bar is
"anything on the wifi can read your mission state", and widening it to writes without auth would
be worse, not better.

## Reads (work from a phone today)

### `GET /missions/events` — SSE, the primary feed

The one you actually build against. Emits the full mission/blueprint view on connect and again on
every tracker change — no deltas, no diffing, each frame is the whole truth. Verified streaming.

```
data: {"patch":"4.10.0-LIVE.12519617","contractKey":null,"title":null,...}
```

⚠️ **Frames are discriminated.** Most are a tracker view rendered directly, but a dev-reload
frame rides the same stream carrying `{"kind":"devreload","widget":...}`. Check for `kind`
before treating a frame as state, or you'll feed a reload instruction to the state renderer.

🔴 **There is no heartbeat.** The server writes on state change and at no other time — no comment
pings, no keepalive. Measured: one frame on connect, then 20 seconds of complete silence on an
idle tracker.

This means **SSE cannot tell you that you are still connected.** A silent stream is
indistinguishable from a sleeping PC, a closed game, or wifi that dropped — and on a phone that
is the common case, not the rare one. An open `EventSource` is not evidence of liveness.

So liveness needs its own signal: poll `GET /api/missions` on an interval and treat *that* as the
connection probe, with SSE layered on top for immediacy. Frames are whole-truth snapshots rather
than deltas, so a poll landing between frames costs nothing and can never desync you — and it
doubles as the self-heal if the stream dies silently.

### `GET /api/missions` — the same view, as a one-shot

Identical shape to an SSE frame. Use it for the initial paint and for pull-to-refresh; keep the
SSE for liveness. Empty-state sample: [`fixtures/missions-empty.json`](../fixtures/missions-empty.json).

Top-level fields that matter for missions/blueprints:

| Field | Type | Notes |
|---|---|---|
| `patch` | string | e.g. `4.10.0-LIVE.12519617`. Which dataset generation is loaded. |
| `contractKey`, `title`, `giver` | string \| null | The tracked contract. All null = nothing tracked. |
| `hasPool` | boolean | Whether a blueprint pool is known for it. |
| `ambiguous` | boolean | The log named something that matches several contracts. |
| `payout` | `{min,max,currency}` \| null | |
| `payoutEstimated` | boolean | 🔑 `true` means *modelled*, not observed. Must be labelled in the UI — see below. |
| `facts` | `{cd,cdVar,dur,diff,noRetry}` \| null | From the bundled dataset. See "The two difficulty numbers" below. |
| `pools` | array | `[{poolUuid, blueprints:[…]}]` — the reward pool. |
| `totals` | `{owned,total}` | |
| `collectedTotal` | number | |
| `closestPools` | `ClosestPool[]` | Pools nearest completion. The between-contracts screen. See below. |
| `standings` | `FactionStanding[]` | Reputation per mission giver. See below. |
| `recentMissions`, `recentBlueprints` | array | See below. Note `at` is an **ISO string**. |
| `earnings` | object | `aUECLastHr`, `aUECPace`, `repPace`, … |
| `completion` | object \| null | The after-action card. |
| `unrecognized` | `{names,packActive}` | Blueprints the localisation couldn't resolve. Surface it — silence here reads as "app is broken". |
| `justReceived` | object \| null | Drives the unlock-alert moment. |
| `missions` | array | Accepted contracts, for the picker. |
| `ship` | object | `{manufacturer, theme, accent, accentRgb, …}` — the flown ship. Drives the overlay's auto-skin. |
| `prefs` | object | Mostly shell concerns. `timeRelative` is the one worth honouring. |

A blueprint inside `pools[].blueprints[]`:

```json
{ "name": "Pulse Laser Pistol", "owned": false, "source": null, "chance": 1,
  "tab": "weapons", "sub": "Sidearms",
  "item": "02e848a0-d729-4826-a780-8506a2ae4a89", "hasDetail": true }
```

`chance` is the real drop probability (`1` = guaranteed). `tab`/`sub` are the grouping the
overlay and the website share — group by these, don't invent your own taxonomy. `hasDetail`
tells you whether the detail call below will return anything.

### `facts` — the bundled dataset's contract facts

```ts
{ cd?: number      // minutes before you can retake it after finishing (present on ~55%)
  cdVar?: number   // variance on that wait, in minutes
  dur?: number     // how long a run is expected to take, in minutes (~47%) — NOT the same as cd
  diff?: number    // CIG's own blended difficulty, 1–7 (~46%)
  noRetry?: boolean }
```

Every field is optional and the coverage percentages are why — most contracts have some of these
and no contract has all of them. Render what's present, say nothing about what isn't.

⚠️ `noRetry` is **only ever `true`**. Its absence means "not stated", *never* "you can retry".
Assert only the negative.

`cd` is the one players actually care about and it is not the number the game shows you — a
contract can run 12 minutes and still lock you out for 45 after you hand it in.

### The two difficulty numbers — do not conflate them

This is the easiest mistake to make here, so it's called out separately.

| | `facts.diff` | `community.facts.difficulty` |
|---|---|---|
| Scale | **1–7** | **1–5** |
| Source | CIG's own blended difficulty, from the bundled dataset | averaged from players who actually ran the contract |
| Companion field | — | `difficultyAnswers` (how many reports) |
| How the overlay renders it | not drawn as a meter | 5-segment meter + the raw number |

The overlay's own tooltip for the community one: *"Averaged from N reports by players who ran this
contract. 1 is easy, 5 is hard."* (`overlay/missions-tracker.js:1195`). Verified against
`src/missions.ts:230` and `:669` for the 1–7 scale.

The fixture value `"diff": 5.8` is `facts.diff`, i.e. 5.8 out of 7.

### The arrays that are always empty in dev

`standings`, `closestPools`, `otherPools`, `recentMissions`, `recentBlueprints`, `justReceived`
and `completion` need a populated tracker, which needs a real `game.log` — so **every fixture in
this repo has them empty**, and no amount of poking the dev sidecar will produce one.

Their element types are not guessable, but they *are* knowable: they're declared in
`sc-overlay/src/missions.ts`. Transcribed here with line references, each one read at source.

```ts
// missions.ts:126 — standings[]
FactionStanding {
  faction: string; scope: string; standing: string;
  nextName: string | null;          // the named next rank
  pct: number;                      // 0–100 through the current rank — this is the bar
  toGo: number | null;              // raw rep remaining
  contractsToGo: number | null;     // 🔑 prefer this: "about 27 contracts" is a plan
  nextRewards: string[];
  estimate: number; curMin: number; nextMin: number | null;   // never displayed
}

// missions.ts:168 — repBar (the TRACKED contract's bar; standings[] is the idle screen's)
RepBar {
  scope: string; faction: string; standing: string;
  nextName: string | null; nextRank: number | null; nextRewards: string[];
  estimate: number; curMin: number; nextMin: number | null;
  max: boolean;
}
// ⚠️ RepBar has NO `pct`. Derive it from estimate/curMin/nextMin, or draw no bar.

// missions.ts:69 — closestPools[]
ClosestPool {
  poolUuid: string; key: string; title: string; poolName: string;
  missionTitles: string[]; variants: number;
  missing: string[];                // what you still need — the point of the card
  owned: number; total: number; places: string[];
  payMin: number | null; /* …plus pay/dur/rep/cooldown fields */
}

// missions.ts:565 / :572 — recentMissions[] / recentBlueprints[]
RecentMission   { title: string | null; aUEC: number | null; at: string | null }
RecentBlueprint { name: string; at: string | null; item: string | null;
                  image: string | null; imageFallback: string | null }

// missions.ts:616 — justReceived is a BlueprintReward plus `at`
BlueprintReward { name: string; item: string | null;
                  image: string | null; imageFallback: string | null }

// missions.ts:44 — reputationGained[] / reputationLost[]
RepEntry { faction: string; scope: string; amount: number }
```

🔴 **`at` is an ISO 8601 string, not an epoch number.** The sidecar writes these with
`new Date().toISOString()` (`missions.ts:2058`, `:4994`). Arithmetic like `Date.now() - at` gives
`NaN` — silently, and only on a populated session, i.e. only on the player's Windows box and
never in any dev environment we have. Parse at the boundary and guard the `NaN`.

Don't confuse these with the client's own `lastSeenAt`, which genuinely is an epoch number
because we set it.

`RecentMission.title` is nullable. The overlay falls back to the literal `"Mission"`
(`overlay/missions-tracker.js:542`) — match that rather than inventing a placeholder.

### `community` — the player-reported layer

```ts
community: { payout: … | null, facts: { difficulty, difficultyAnswers, … } | null } | null
```

**The sidecar fetches this for you**, from `subliminal.gg/api/sc/mission-payout` and
`/api/sc/mission-feedback`, caches it with a TTL, and serves stale entries while it refreshes
(`src/overlay-server.ts:599`). So the phone gets it through the sidecar and needs no internet
access of its own.

🔑 **There are three states here, not two, and the outer null is not the same as the inner ones.**
Measured against a live sidecar:

| Response | Means |
|---|---|
| `community: null` | **no cache entry yet.** The sidecar kicked off the fetch when you asked and answered without waiting. Also what you get when it's offline or subliminal.gg is down. |
| `community: {payout: null, facts: null}` | fetch **succeeded**; nobody has reported this contract |
| `community: {payout: {…}, facts: {…}}` | real player-reported data |

So `payout` and `facts` are independently nullable *inside* a non-null `community`. Null-checking
only the outer object is a bug — `community` being present tells you nothing about either member.

⚠️ **It pops in a beat later.** The first request for a contract returns `community: null` and
starts the fetch; a request a second or two later returns the populated object. Verified: ask twice
for the same title and you get `null` then `{payout:null,facts:null}`.

That transition is normal and must not look like a load or a correction. Never show an error, a
spinner or a placeholder for a null `community` at any level — just omit what it would have said,
and let it appear if it appears. `fixtures/mission-preview.json` is the cold state and
`fixtures/mission-preview-warm.json` the warm one, so both paths can be built against.

`community.payout` is what drives the `reported` provenance label in the honesty rules below.

### `GET /api/mission-preview?title=<exact title>`

The full brief for any contract in the bundled dataset — **no game log required**, which makes
it the best endpoint to develop against. Takes `title`, *not* `key`.
Sample: [`fixtures/mission-preview.json`](../fixtures/mission-preview.json) (a real 7-blueprint pool).

### `GET /api/mission-search?q=<text>`

Typeahead over ~1,999 bundled contracts. Returns `{missions:[{title,key,variants,giver,hasPool}]}`.
Sample: [`fixtures/mission-search.json`](../fixtures/mission-search.json).

### `GET /api/blueprint-detail?item=<uuid>`

Crafting detail for one blueprint: `stats`, `ingredients`, `recipeGroups` (with per-material
quality curves and `sell` prices), `craftTimeSeconds`.
Sample: [`fixtures/blueprint-detail.json`](../fixtures/blueprint-detail.json).

⚠️ `manufacturer` comes back as the literal string `<= PLACEHOLDER =>` for at least some items.
Treat it as absent rather than rendering it.

Also available: `GET /api/blueprint-names`, `GET /api/blueprint-search`, `GET /api/changelog`.

## Writes (403 from a phone — roadmap, not v1)

| Endpoint | What it does |
|---|---|
| `POST /api/missions/own` | `{name, owned}` — the manual owned toggle |
| `POST /api/missions/own-item` | Same, by item uuid |
| `POST /api/missions/select` | `{missionId}` — pick which accepted contract to track (`null` = idle) |
| `POST /api/missions/refresh` | Re-read the dataset |

## Honesty rules inherited from the overlay

These aren't style preferences, they're decisions the overlay already made after getting them
wrong once. Breaking them in this client would make the two disagree about the same data.

1. **Label where a payout came from.** `payoutEstimated: true` is a modelled guess and must not
   look like money the game handed over. The overlay's ranking: logged live → `aUEC`,
   player-reported → `reported`, from game files → `payout`, modelled → `~N estimated`.
2. **Never add estimates into earnings totals.** ~2,000 contracts have modelled payouts; counting
   them made the totals fiction.
3. **Say when a blueprint can't be identified.** A dark pool reads as a broken app. `unrecognized`
   exists so you can say "the game wrote a name I don't know" and show the raw text.
4. **Standing in contracts, not raw rep.** "about 27 contracts to Prestige 2" is a plan;
   "5,300 rep" is trivia.

## Dev loop

The sidecar runs on macOS. No Windows box needed to build this app:

```bash
cd ../sc-overlay
SC_BP_NO_WINDOW=1 PORT=8899 npx tsx src/overlay-server.ts
```

`game.log` won't exist, so the tracker view stays empty — but `/api/mission-preview`,
`/api/mission-search` and `/api/blueprint-detail` all serve real dataset content, and the SSE
stream connects and emits. For populated tracker state you need either a real Windows session or
`SC_DEV=1` plus `POST /api/dev/replay` (loopback only, scenarios in `src/dev-replay.ts`).
