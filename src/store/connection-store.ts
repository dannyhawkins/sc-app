import { AppState, type AppStateStatus } from "react-native";
import { create } from "zustand";
import { fixtures } from "@/lib/sidecar/fixtures";
import {
	clearStoredHost,
	loadStoredHost,
	recordRecentHost,
	saveStoredHost,
} from "@/lib/sidecar/host-store";
import { normalizeHostInput, SidecarHttpClient } from "@/lib/sidecar/http-client";
import { type SseSubscription, subscribeToMissionEvents } from "@/lib/sidecar/sse-client";
import type { MissionView } from "@/lib/sidecar/types";

/**
 * The connection state machine, straight from docs/DESIGN.md §3 ("This is global — one state
 * machine, one status bar on every screen"). Don't drift from that doc without updating it —
 * `designer` owns the UI states this feeds and both clients need to agree on what these mean.
 *
 *   LIVE ──probe fails──▶ STALE ──3 misses / 30s──▶ UNREACHABLE
 *     ▲                     │                          │
 *     └─────probe ok────────┘◀─────────probe ok────────┘
 *
 *  - "no-host": nothing saved yet — the Connect screen owns this.
 *  - "connecting": the very first probe for this host, in flight, no result yet.
 *  - "live": last probe (poll or SSE frame) succeeded ≤ 15s ago — see docs/DESIGN.md table.
 *  - "stale": ≥1 miss since a probe that DID succeed before, but under the unreachable threshold.
 *    A single missed poll on wifi is normal; the UI shows the last frame unchanged.
 *  - "unreachable": 3 consecutive misses, or 30s since the last success (or the very first probe
 *    ever failed — there's no "last success" to be stale relative to, so that's unreachable too).
 */
export type ConnectionStatus = "no-host" | "connecting" | "live" | "stale" | "unreachable";

/** Dev-only escape hatch, not part of docs/DESIGN.md's state machine: build/demo with no sidecar. */
export type SidecarMode = "live" | "mock";

// Poll cadence while live/stale (docs/DESIGN.md §3: "GET /api/missions every 10s with a 4s timeout").
const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 4_000;
// Once unreachable, back off instead of polling steadily: "5s, 10s, 20s, 30s, then every 30s".
const UNREACHABLE_RETRY_SCHEDULE_MS = [5_000, 10_000, 20_000, 30_000];
const UNREACHABLE_AFTER_MISSES = 3;
const UNREACHABLE_AFTER_MS = 30_000;

interface ConnectionState {
	mode: SidecarMode;
	host: string | null;
	conn: ConnectionStatus;
	/** Epoch ms of the last successful probe (poll or SSE frame) for the current host, or null if none yet. */
	lastSeenAt: number | null;
	/** The last full mission/blueprint view, whole-truth per frame — see docs/API.md. */
	frame: MissionView | null;
	/** Have we EVER gotten a frame from the current host — distinguishes "PC's asleep" from "never tried". */
	hadFrame: boolean;
	/** True while an out-of-band probe (first connect, "Retry now", pull-to-refresh) is in flight. */
	probing: boolean;
	hydrated: boolean;

	hydrate: () => Promise<void>;
	setMode: (mode: SidecarMode) => void;
	/** Persists the host and (re)connects using it. */
	setHost: (host: string) => Promise<void>;
	forgetHost: () => Promise<void>;
	/** Fires a probe right now, outside the normal schedule. Used by "Retry now" and pull-to-refresh. */
	retryNow: () => Promise<void>;
}

// Non-serializable handles live outside the store proper — zustand state is meant to be plain
// data, and these need identity (to close/cancel the *current* one) rather than value equality.
let activeSubscription: SseSubscription | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveMisses = 0;
let unreachableRetryIndex = 0;
let appStateSubscribed = false;

function clearPollTimer() {
	if (pollTimer) {
		clearTimeout(pollTimer);
		pollTimer = null;
	}
}

function closeActiveSubscription() {
	activeSubscription?.close();
	activeSubscription = null;
}

function teardownTransport() {
	closeActiveSubscription();
	clearPollTimer();
	consecutiveMisses = 0;
	unreachableRetryIndex = 0;
}

export const useConnectionStore = create<ConnectionState>((set, get) => {
	/** One GET /api/missions with the design's 4s timeout. Success/failure drive the state machine. */
	async function probeOnce(host: string) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
		try {
			const view = await new SidecarHttpClient(host).getMissions(controller.signal);
			if (get().host === host) onProbeSuccess(host, view);
		} catch {
			if (get().host === host) onProbeFailure(host);
		} finally {
			clearTimeout(timeout);
		}
	}

	function onProbeSuccess(host: string, view: MissionView) {
		consecutiveMisses = 0;
		unreachableRetryIndex = 0;
		const now = Date.now();
		set({ conn: "live", frame: view, lastSeenAt: now, hadFrame: true, probing: false });
		void recordRecentHost(host, now);
		scheduleNextPoll(host, POLL_INTERVAL_MS);
	}

	function onProbeFailure(host: string) {
		consecutiveMisses += 1;
		const { lastSeenAt } = get();
		// No prior success to be "stale" relative to (cold start, or the very first probe failed) —
		// docs/DESIGN.md §5.3 treats that the same as unreachable, just with an emptier banner.
		const elapsedSinceOk = lastSeenAt === null ? Number.POSITIVE_INFINITY : Date.now() - lastSeenAt;
		const isUnreachable =
			consecutiveMisses >= UNREACHABLE_AFTER_MISSES || elapsedSinceOk >= UNREACHABLE_AFTER_MS;

		set({ conn: isUnreachable ? "unreachable" : "stale", probing: false });

		if (isUnreachable) {
			const delay =
				UNREACHABLE_RETRY_SCHEDULE_MS[
					Math.min(unreachableRetryIndex, UNREACHABLE_RETRY_SCHEDULE_MS.length - 1)
				];
			unreachableRetryIndex += 1;
			scheduleNextPoll(host, delay);
		} else {
			scheduleNextPoll(host, POLL_INTERVAL_MS);
		}
	}

	function scheduleNextPoll(host: string, delay: number) {
		clearPollTimer();
		pollTimer = setTimeout(() => {
			if (get().mode === "live" && get().host === host) probeOnce(host);
		}, delay);
	}

	function ensureAppStateListener() {
		if (appStateSubscribed) return;
		appStateSubscribed = true;
		AppState.addEventListener("change", (next: AppStateStatus) => {
			if (next !== "active") return;
			const { mode, host, hadFrame } = get();
			if (mode !== "live" || !host) return;
			// docs/DESIGN.md §3: "Background → foreground always re-enters via `stale` until a probe
			// returns, so we never show stale data as live." Only applies once we've had a frame —
			// otherwise there's nothing stale to fall back to, so leave conn as-is.
			if (hadFrame) set({ conn: "stale" });
			void get().retryNow();
		});
	}

	function connectToHost(host: string) {
		teardownTransport();
		set({ conn: "connecting", probing: true, frame: null, lastSeenAt: null, hadFrame: false });
		ensureAppStateListener();

		// SSE gives immediacy (the unlock flash can't wait for a 10s poll); the poll loop above is
		// the liveness probe AND the self-heal if SSE silently dies (it has no heartbeat — see
		// docs/DESIGN.md §3). Both paths funnel through the same success/failure handlers.
		activeSubscription = subscribeToMissionEvents(host, {
			onMission: (view) => {
				if (get().host === host) onProbeSuccess(host, view);
			},
		});

		void probeOnce(host);
	}

	return {
		mode: "mock",
		host: null,
		conn: "no-host",
		lastSeenAt: null,
		frame: null,
		hadFrame: false,
		probing: false,
		hydrated: false,

		hydrate: async () => {
			const storedHost = await loadStoredHost();
			if (storedHost) {
				set({ host: storedHost, mode: "live", hydrated: true });
				connectToHost(storedHost);
			} else {
				set({
					mode: "mock",
					conn: "live",
					frame: fixtures.missionsEmpty,
					hadFrame: true,
					hydrated: true,
				});
			}
		},

		setMode: (mode) => {
			teardownTransport();
			if (mode === "mock") {
				set({
					mode,
					host: null,
					conn: "live",
					frame: fixtures.missionsEmpty,
					hadFrame: true,
					lastSeenAt: null,
					probing: false,
				});
				return;
			}
			const { host } = get();
			set({ mode, conn: host ? "connecting" : "no-host" });
			if (host) connectToHost(host);
		},

		setHost: async (host) => {
			// HostForm may hand us the whole string a user pasted from SC Overlay's settings screen
			// (scheme + path included, per docs/DESIGN.md §4) — normalize once here so every reader
			// of `host` (status bar chip, recents) sees the clean form, not the raw paste.
			const normalized = normalizeHostInput(host);
			await saveStoredHost(normalized);
			set({ host: normalized, mode: "live" });
			connectToHost(normalized);
		},

		forgetHost: async () => {
			await clearStoredHost();
			teardownTransport();
			set({
				host: null,
				mode: "mock",
				conn: "live",
				frame: fixtures.missionsEmpty,
				hadFrame: true,
				lastSeenAt: null,
				probing: false,
			});
		},

		retryNow: async () => {
			const { mode, host } = get();
			if (mode !== "live" || !host) return;
			clearPollTimer();
			set({ probing: true });
			await probeOnce(host);
		},
	};
});
