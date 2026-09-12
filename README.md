# sc-app

A Star Citizen companion for your phone or tablet. It shows the mission you're tracking and its
blueprint reward pool on a second screen, so you don't need an overlay running on the machine
that's trying to render the game.

> **Status: early.** v1 is missions and blueprints, read-only. Nothing here is released yet.

## Why

[SC Overlay](https://sc-overlay.subliminal.gg) draws all of this over the game already, and for a
lot of people that's the right answer. But the overlay costs something to run on the game PC: a
transparent always-on-top window spanning every monitor, click-through hit-testing on every
layout change, and a global keyboard hook. On some machines that shows up as stutter.

The useful half of SC Overlay isn't the window — it's the **sidecar**: a small headless Node
server that tails Star Citizen's `game.log`, turns it into structured state, and serves it over
HTTP and SSE. It has no Electron and no native dependencies, it already listens on the LAN (that's
how OBS browser sources work), and SC Overlay's own widgets are plain web pages talking to it.

So this app isn't a port of the overlay. It's a **second client for a server that already
exists** — and on the game PC you run the sidecar alone, without the compositor.

## How it fits together

```
Windows game PC                            phone / tablet
┌─────────────────────────────┐            ┌──────────────┐
│ Star Citizen                │            │              │
│   └── game.log              │            │    sc-app    │
│         │                   │            │   (Expo/RN)  │
│         ▼                   │            │              │
│ SC Overlay sidecar          │  HTTP+SSE  │              │
│ (headless, plain Node)      │◄───LAN────►│              │
│ :8778                       │            │              │
└─────────────────────────────┘            └──────────────┘
```

- [`docs/API.md`](docs/API.md) — the data contract, verified against a running sidecar rather than
  read off the source. Real sample responses are in [`fixtures/`](fixtures/).
- [`docs/DESIGN.md`](docs/DESIGN.md) — the v1 design spec. [`docs/mockup.html`](docs/mockup.html)
  is a self-contained preview of the main screens; open it in any browser.

## What it does not do

- **It doesn't write anything.** The sidecar gates every mutation to loopback, which is the
  correct default — the read-only endpoints are open on the LAN, writes are not. So the desktop
  overlay's "mark this blueprint as owned" toggle can't work here yet. Paired-device auth is on
  the roadmap; until then this app only reads.
- **It doesn't find your PC for you.** The sidecar can't tell the phone where the sidecar is, so
  setup is typing in an IP address. In SC Overlay it's under
  *Settings → Browser sources & extra monitors*, which shows this PC's LAN address with a copy
  button. QR pairing is on the roadmap.
- **It doesn't replace the overlay.** Anything that needs to be on the game machine — global
  hotkeys, screen capture and OCR, foreground-window detection, click-through — stays there by
  definition.
- **It doesn't need the internet.** Everything comes off your LAN. Player-reported payouts and
  difficulty are fetched by the *sidecar* and arrive in the same payload, so the phone never talks
  to anything but your own PC.

## Development

**You can build the whole app with no server at all** — there's a fixture-backed mock mode, fed
from real captured responses in [`fixtures/`](fixtures/).

For live data you need SC Overlay's sidecar, which is in
[its own repository](https://github.com/SubliminalsTV-Projects/sc-overlay) (source-available,
separate project). Clone it alongside this one and run the server without its Electron shell — it
is plain Node, so macOS and Linux work and no Windows box is needed:

```bash
cd ../sc-overlay && npm install
SC_BP_NO_WINDOW=1 PORT=8899 npx tsx src/overlay-server.ts
```

Port 8899 rather than the default 8778, so a dev server can't collide with a real SC Overlay on
the same machine.

⚠️ **Without a real `game.log` the tracker state is permanently empty**, because a populated
tracker needs a live Star Citizen session on Windows. The bundled dataset endpoints still serve
real content — ~1,999 contracts and their blueprint pools, which is plenty to build against — but
anything derived from actual play (standings, recent drops, the completion card) can only be seen
with a capture from a real session.

```bash
task            # list what's available
```

## Licence

Source-available under [FSL-1.1-MIT](LICENSE.md) — read it, modify it, run your own build,
publish a free fork or port. What you can't do is sell it. Each version converts to MIT two years
after release.

## Relationship to SC Overlay

**This is an independent project and not affiliated with SC Overlay.**

[SC Overlay](https://github.com/SubliminalsTV-Projects/sc-overlay) is by SubliminalsTV. It is
source-available under its own copy of FSL-1.1-MIT, whose plain-English summary expressly permits
publishing a free port to a platform the project does not support — which is what this is. None of
its code is included here; this app only speaks to the local HTTP API its sidecar exposes.

The SubliminalsTV and SC Overlay names and logos are **not** licensed by that project and are not
claimed here.

Star Citizen®, Roberts Space Industries® and Cloud Imperium® are registered trademarks of Cloud
Imperium Rights LLC; this is an unofficial fan project and is not affiliated with or endorsed by
CIG.
