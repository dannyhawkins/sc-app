# The data layer

Implementation notes for `src/lib/sidecar/` and `src/store/connection-store.ts`, for whoever's
next in this code. Ground truth for the wire format and the connection model is `API.md` /
`DESIGN.md` §3 — this file is "how the code maps onto that," not a second copy of the contract.

## Module map

| File | Owns |
|---|---|
| `types.ts` | Hand-written wire types (MissionView, MissionPreview, Blueprint, …). Nullability is honest — most fields are `null` in the everyday empty-tracker state, not an edge case. |
| `http-client.ts` | `SidecarHttpClient` (the 4 read endpoints), `normalizeHostInput()`, `normalizeManufacturer()`. |
| `sse-client.ts` | Thin wrapper over `react-native-sse`. Filters **any** frame carrying a `kind` field before it reaches a caller — `{kind:"devreload"}` is the only control frame today, but a mission view never carries `kind`, so the field is the signal and a kind added later still can't reach the renderer. |
| `connect-test.ts` | One-shot host validator for the Connect screen's testing/ok/refused/not-sidecar/403 states. |
| `host-store.ts` | AsyncStorage: the current host + a 5-entry recents list. Normalizes on write. |
| `fixtures.ts` | Bundled `../../../fixtures/*.json` for mock mode. |
| `errors.ts` | `SidecarUnreachableError` / `SidecarHttpError` / `SidecarParseError`. |
| `../store/connection-store.ts` | The zustand store implementing DESIGN.md §3's state machine: `{mode, host, conn, lastSeenAt, frame, hadFrame, probing}`. |

## Host input handling (DESIGN.md §4 revision)

SC Overlay's settings screen gives users a copy button next to a full
`http://192.168.x.x:8778/…` URL, so Connect has to accept that whole pasted string, not just a
bare host. `normalizeHostInput()` in `http-client.ts` strips scheme + path/query/fragment down to
`host[:port]`; it's applied at every write boundary (`host-store.saveStoredHost`,
`connection-store.setHost`) so anything read back — the status bar chip, the recents list — is
always the clean form, and defensively again inside `baseUrlFor()` for any caller that skips the
store.

## Connection state machine

`connection-store.ts` implements DESIGN.md §3 as written: SSE for immediacy (any non-devreload
frame counts as a successful probe), a 10s/4s-timeout poll of `GET /api/missions` as the actual
liveness signal (SSE has no heartbeat), `stale` after a single miss following a prior success,
`unreachable` after 3 misses / 30s — or immediately, with no `stale` grace period, if a host has
never produced a frame at all (there's no "last ok" to be stale relative to). Unreachable retries
back off on the 5/10/20/30s-then-30s schedule from the spec. `AppState` foreground re-entry always
passes back through `stale` per the design, never straight to `live`.

`mode: "mock" | "live"` is NOT part of the design doc's model — it's a dev-only switch (defaults
to `mock` with no host saved) so the app is buildable/demoable with zero sidecar running, backed
by `fixtures.ts`.

## Verifying against a real sidecar

```
cd ../sc-overlay && SC_BP_NO_WINDOW=1 PORT=8899 npx tsx src/overlay-server.ts
```

No game.log on macOS, so the tracker stays in the empty state — but `/api/mission-search`,
`/api/mission-preview`, `/api/blueprint-detail`, and the SSE stream all serve real dataset
content. That's enough to exercise every method on `SidecarHttpClient` and `testSidecarHost()`
against real bytes; it just won't populate `pools`/`closestPools`/etc. on `/api/missions` itself.
