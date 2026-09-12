import type { CommunityInfo, PayoutLike } from "./sidecar/types";

/**
 * Presentation-layer formatting + the honesty-rule logic from docs/DESIGN.md §6. Kept as pure
 * functions (no JSX) so PayoutLine and CompletionCard — which both need "what does this money
 * say" — share one implementation instead of two components quietly disagreeing.
 */

/** `681750` -> `"681,750"`. Manual (not `toLocaleString`) so it's identical on Hermes and web. */
export function formatThousands(n: number): string {
	const rounded = Math.round(n);
	const sign = rounded < 0 ? "-" : "";
	const digits = Math.abs(rounded).toString();
	return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** `96` -> `"1h 36m"`, `45` -> `"45m"`, `120` -> `"2h"`. */
export function formatDurationMinutes(totalMinutes: number): string {
	const total = Math.round(totalMinutes);
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h === 0) return `${m}m`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

/** CompletionCard's `durationMs` -> `"14m 12s"`. */
export function formatDurationMs(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}m ${s}s`;
}

function pad2(n: number): string {
	return n.toString().padStart(2, "0");
}

function clockTime(epochMs: number): string {
	const d = new Date(epochMs);
	return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** RecentList's per-row timestamp: `prefs.timeRelative` picks relative vs. absolute clock time. */
export function formatRelativeOrClock(
	epochMs: number,
	timeRelative: boolean,
	now = Date.now(),
): string {
	if (!timeRelative) return clockTime(epochMs);
	const mins = Math.max(0, Math.round((now - epochMs) / 60_000));
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins} min ago`;
	const hrs = Math.round(mins / 60);
	if (hrs < 24) return `${hrs} hr ago`;
	return `${Math.round(hrs / 24)} d ago`;
}

/** `2900000` -> `"2.9M"` — CompletionCard's `aUecPerHour`, which the mockup shows compacted. */
export function formatCompactNumber(n: number): string {
	const abs = Math.abs(n);
	if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return formatThousands(n);
}

/** StatusBar's `stale` row: "last seen 12s ago" — second-granularity, unlike RecentList. */
export function formatSecondsAgo(epochMs: number, now = Date.now()): string {
	const secs = Math.max(0, Math.round((now - epochMs) / 1000));
	if (secs < 60) return `${secs}s ago`;
	return `${Math.round(secs / 60)}m ago`;
}

/**
 * The Unreachable banner's "Last seen 14:32 · 6 min ago" — always both forms together,
 * regardless of `prefs.timeRelative` (that pref is a RecentList concern, not this banner's).
 */
export function formatLastSeenBanner(epochMs: number, now = Date.now()): string {
	const mins = Math.max(0, Math.round((now - epochMs) / 60_000));
	const rel =
		mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} hr ago`;
	return `${clockTime(epochMs)} · ${rel}`;
}

/** `{min:0,max:X}` -> `"up to X"`; `min===max` -> one figure; else an en-dash range. `min == null` (0 or absent) also reads as "up to". */
export function formatPayoutRange(payout: PayoutLike): string {
	if (payout.min === payout.max) return formatThousands(payout.max);
	if (!payout.min) return `up to ${formatThousands(payout.max)}`;
	return `${formatThousands(payout.min)}–${formatThousands(payout.max)}`;
}

/**
 * `patch` is like `"4.10.0-LIVE.12519617"` — version, env, changelist. StatusBar shows just
 * `"4.10.0 LIVE"` (docs/DESIGN.md §5.1); `logEnv` overrides the parsed env when the sidecar has
 * a more specific one.
 */
export function formatPatchLabel(patch: string, logEnv: string | null): string {
	const match = patch.match(/^([\d.]+)-([A-Za-z]+)/);
	if (!match) return logEnv ? `${patch} ${logEnv}` : patch;
	const [, version, parsedEnv] = match;
	return `${version} ${logEnv ?? parsedEnv}`;
}

/** True when `build` (the running game's changelist) doesn't match the loaded dataset's own. */
export function isDatasetBehind(patch: string, build: string | null): boolean {
	if (build == null) return false;
	const changelist = patch.match(/\.(\d+)$/)?.[1];
	return changelist != null && changelist !== build;
}

/**
 * `RepBar` (the tracked contract's bar) has no `pct`, unlike `FactionStanding` — docs/DESIGN.md
 * Appendix A: "derive `clamp((estimate - curMin) / (nextMin - curMin), 0, 1)`". Returns `null`
 * when there's nothing to derive from (`nextMin` absent, or equal to `curMin`) rather than
 * dividing by zero or asserting a fraction that isn't real.
 */
export function deriveRepBarPct(repBar: {
	max: boolean;
	estimate: number;
	curMin: number;
	nextMin: number | null;
}): number | null {
	if (repBar.max) return 1;
	if (repBar.nextMin == null || repBar.nextMin === repBar.curMin) return null;
	const raw = (repBar.estimate - repBar.curMin) / (repBar.nextMin - repBar.curMin);
	return Math.max(0, Math.min(1, raw));
}

export type PayoutTone = "value" | "estimate" | "dim";

export interface ResolvedPayout {
	text: string;
	tone: PayoutTone;
}

/**
 * `community.payout`'s exact shape isn't nailed down by docs/API.md beyond "drives the `reported`
 * label" — it's fetched from a third party (subliminal.gg), not the sidecar's own dataset. This
 * defensively accepts either a bare number or a `{min,max}`-shaped object and renders whichever
 * it finds; anything else is treated as absent (honesty rule: say nothing rather than guess).
 */
function extractReportedFigure(value: unknown): string | null {
	if (typeof value === "number") return formatThousands(value);
	if (value && typeof value === "object") {
		const v = value as Record<string, unknown>;
		if (typeof v.min === "number" && typeof v.max === "number") {
			return formatPayoutRange({ min: v.min, max: v.max, currency: "UEC" });
		}
		if (typeof v.amount === "number") return formatThousands(v.amount);
	}
	return null;
}

/**
 * docs/DESIGN.md §6.1's `PayoutLine` precedence, exactly: logged live (completion's `aUEC`) →
 * player-reported (`community.payout`) → from game files (`payout`, not estimated) → modelled
 * (`payout`, estimated) → nothing. The phone never sums or invents a figure; `—` not `0`.
 *
 * Only the logged-live case carries the "aUEC" word — there it names both the currency and the
 * provenance at once. The other cases are provenance-only ("payout"/"reported"/"estimated"); an
 * earlier draft of this added "aUEC" to all of them after reading a mockup.html fragment that
 * turned out to be a mockup bug (since fixed) rather than the intended wording — don't reintroduce it.
 */
export function resolvePayoutLine(input: {
	aUEC?: number | null;
	payout: PayoutLike | null;
	payoutEstimated: boolean;
	community?: CommunityInfo | null;
}): ResolvedPayout {
	const { aUEC, payout, payoutEstimated, community } = input;

	if (aUEC != null) return { text: `${formatThousands(aUEC)} aUEC`, tone: "value" };

	const reported = community?.payout != null ? extractReportedFigure(community.payout) : null;
	if (reported != null) return { text: `${reported} reported`, tone: "value" };

	if (payout != null && !payoutEstimated) {
		return { text: `${formatPayoutRange(payout)} payout`, tone: "value" };
	}
	if (payout != null && payoutEstimated) {
		return { text: `~${formatPayoutRange(payout)} estimated`, tone: "estimate" };
	}
	return { text: "—", tone: "dim" };
}
