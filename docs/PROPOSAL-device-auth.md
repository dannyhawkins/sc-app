# Proposal: paired-device auth in the sidecar

**Status:** draft, not implemented. Tracked as [#12](https://github.com/dannyhawkins/sc-app/issues/12).

This describes a change to **`sc-overlay`**, which is a different project by a different author
(SubliminalsTV). It is written here because this app is the thing that needs it.

**It is a proposal, not a plan.** Nobody here can or should land it: whether the sidecar grows
device auth at all is entirely its maintainer's call, and this document exists to make that
conversation concrete rather than to pre-empt it. It is written to be *rejectable* — every
decision below is argued from that project's own source and its own prior incident, so the
reasoning can be checked rather than taken on trust.

If the answer is no, this app stays read-only, which is a working product and not a failure state.

## What it unlocks

Everything interactive. Today this app can read but not write, so it cannot:

| Endpoint | What the user loses |
|---|---|
| `POST /api/missions/own` | marking a blueprint owned — the desktop overlay's main manual action |
| `POST /api/missions/own-item` | same, by item uuid |
| `POST /api/missions/select` | choosing which accepted contract to track |
| `POST /api/missions/refresh` | re-reading the dataset |

That's the difference between a viewer and a companion.

## The constraint that shapes everything

The sidecar's gate is not a default someone reached for — **it is scar tissue**. From the comment
above it (`src/overlay-server.ts:~2340`):

> a security report from a viewer on Sub's stream (2026-08-09) chained unauthenticated
> `POST /api/config` into full sync-token theft — repoint `chatServerUrl` at your own WebSocket
> and the sidecar cheerfully sends `{t:"hello", token}` straight to you.

So the rule became: any mutation, and a named list of sensitive GETs, must come from this machine.

**The lesson to carry: the danger wasn't the mutation endpoints as a category, it was one
particular endpoint that could be turned into credential exfiltration.** Any auth scheme that
grants "a paired device may mutate" re-opens that exact hole, because `POST /api/config` is a
mutation.

This proposal therefore does **not** add a second way to pass the existing gate.

## Design

### Default-deny, with a narrow allowlist

A device token grants access to an explicitly named set of routes, and nothing else:

```ts
// Routes a paired device may POST to. NOT "all mutations" — see the 2026-08-09 incident above.
// /api/config is the one that turned into token theft, and it must never appear here.
// Adding a route to this set is a security decision; adding a route to the server is not.
const DEVICE_WRITABLE = new Set([
  "/api/missions/own",
  "/api/missions/own-item",
  "/api/missions/select",
  "/api/missions/refresh",
]);
```

The gate becomes:

```ts
const mutating = req.method !== "GET" && req.method !== "HEAD";
const sensitive = mutating || SENSITIVE_GET.has(url);

// Unchanged: loopback still passes everything, exactly as today.
// New: a paired device passes ONLY the allowlist above, and only with a valid token.
const pairedDeviceMayPass = mutating && DEVICE_WRITABLE.has(url) && validDeviceToken(req);

if (sensitive && !fromThisMachine(req) && !pairedDeviceMayPass) {
  // …existing 403
}
```

Nothing else in the gate moves. `SENSITIVE_GET` stays loopback-only — a phone has no business
reading `/api/config` or `/api/diagnostics`, and this app never asks for them.

The `Origin` check below the gate stays exactly as it is. It blocks a hostile web page running on
the user's machine from riding loopback, and a native app sends no `Origin`, so it passes without
being weakened. **That check must not be relaxed to accommodate a browser-based client** — doing
so would re-open the Web Page widget as an attack surface.

### Tokens

- 32 bytes from `crypto.randomBytes`, base64url. Not guessable, not enumerable.
- Stored **hashed** (SHA-256) in the config, alongside a label and timestamps:

```ts
pairedDevices: [
  { id, label: "Danny's iPhone", tokenHash, createdAt, lastSeenAt }
]
```

Hashing matters less than it would on a server — the config is on the owner's own disk — but it
means a leaked config backup or a diagnostics paste doesn't hand over a working credential.

- Compared with `crypto.timingSafeEqual` against the hash.

### 🔴 The config-strip trap

`GET /api/config` already destructures secrets out before responding, with this warning:

> ⚠️ This server also answers on the LAN for OBS browser sources, so anything omitted from this
> destructure is readable by every device on the network — **add new secrets HERE**.

`pairedDevices` must be added to that destructure. It's hashed, so a leak is not immediately
fatal, but the labels and timestamps are a device inventory of the user's household and have no
business on the LAN. This is the single easiest thing to get wrong in the whole change.

### Pairing flow

1. Settings (loopback-only, so only the person at the PC can see it) shows **Pair a device**.
2. Sidecar mints a token, stores its hash, and displays it as a QR containing
   `{host, port, token}` — which is also [#13](https://github.com/dannyhawkins/sc-app/issues/13),
   so one scan does both jobs.
3. The phone scans, stores the token in `expo-secure-store` (this one *is* a secret, unlike the
   host — see the note in `host-store.ts` about why the host isn't).
4. Phone sends `Authorization: Bearer <token>` on allowlisted writes.
5. Settings lists paired devices with `lastSeenAt` and a **Revoke** button.

A token that isn't presented within, say, 10 minutes of being minted should expire unused — a QR
left on screen shouldn't stay live indefinitely.

## Threat model, stated honestly

**This is bearer-over-HTTP on a LAN.** Anyone who can passively sniff the wifi can capture the
token and replay it. That is a real weakness and it should be written down rather than glossed.

Why it's proportionate rather than negligent:

- **The blast radius is small by construction.** A stolen token grants exactly four mission-state
  writes. It cannot read config, cannot touch the sync token or Twitch credential, cannot reach
  `/api/dev/*`, cannot make the sidecar fetch a URL. Worst case an attacker marks your blueprints
  owned and changes which contract you're tracking — annoying, locally reversible, not a breach.
- **Reads are already open.** Anyone on that wifi can already read the full mission state; that's
  the OBS browser-source design. The token doesn't widen what's readable at all.
- **TLS on a LAN service is worse than the problem.** A self-signed cert on a rotating private IP
  means a trust prompt the user is trained to click through, and it buys little against an
  attacker already inside the network.

The honest summary for a changelog: *this lets a device you've paired change your blueprint and
mission state; it doesn't let it read your credentials or settings, and it only works on your own
network.*

## What stays out of scope

- No change to `SENSITIVE_GET` — a phone never needs those.
- No relaxing of the `Origin` check.
- Nothing internet-facing. Port 8778 is not exposed; the phone reaches in over the LAN only.
  Reading from outside the house is [#16](https://github.com/dannyhawkins/sc-app/issues/16) and
  is a push-outward relay, not a hole in this.

## Rollout

1. Land the server side with an empty `pairedDevices` list — behaviour is byte-identical to today
   until someone pairs a device.
2. Add the Settings pairing UI.
3. Add the app side behind it: token storage, the `Authorization` header, and the owned-toggle
   UI that `BlueprintRow` already reserves trailing space for.

Steps 1 and 2 are independently shippable and change nothing for existing users.
