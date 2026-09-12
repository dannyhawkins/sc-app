import type {
	BlueprintReward,
	ClosestPool,
	CompletionInfo,
	FactionStanding,
	JustReceived,
	MissionView,
	OtherPoolEntry,
	RecentBlueprintEntry,
	RecentMissionEntry,
	RepEntry,
} from "./types";

/**
 * `sanitizeMissionView` runs once, where a frame enters the app (the connection store), so every
 * component downstream can trust these fields rather than each doing its own partial validation.
 *
 * Every element type below is now CONFIRMED against `sc-overlay/src/missions.ts` (see docs/API.md
 * and docs/DESIGN.md's Appendix A) — none of this is guessed anymore. This still exists for two
 * reasons:
 *
 * 1. `response.json() as MissionView` gives zero runtime guarantee that a real payload actually
 *    matches the confirmed type — a version skew between this app and the sidecar, or a field the
 *    transcription missed, would otherwise reach a component as `undefined` and throw (e.g.
 *    `completion.blueprints.length`) instead of just rendering oddly. An entry that doesn't look
 *    right is dropped here rather than passed through half-populated.
 *
 * 2. Per docs/API.md: "`at` is an ISO 8601 string, not an epoch number... Parse at the boundary
 *    and guard the NaN." `RecentMissionEntry`/`RecentBlueprintEntry`/`JustReceived`/`CompletionInfo`
 *    are typed as the APP-INTERNAL shape (`at: number`, epoch ms) precisely so this is the only
 *    place that string ever gets parsed — an entry whose `at` fails to parse is dropped, not
 *    passed through as `NaN`.
 */
export function sanitizeMissionView(raw: MissionView): MissionView {
	return {
		...raw,
		standings: asArray(raw.standings).filter(isFactionStanding),
		closestPools: asArray(raw.closestPools).filter(isClosestPool),
		otherPools: asArray(raw.otherPools).filter(isOtherPoolEntry),
		recentMissions: asArray(raw.recentMissions)
			.map(coerceRecentMission)
			.filter((x): x is RecentMissionEntry => x != null),
		recentBlueprints: asArray(raw.recentBlueprints)
			.map(coerceRecentBlueprint)
			.filter((x): x is RecentBlueprintEntry => x != null),
		reputationGained: asArray(raw.reputationGained).filter(isRepEntry),
		reputationLost: asArray(raw.reputationLost).filter(isRepEntry),
		justReceived: coerceJustReceived(raw.justReceived),
		completion: coerceCompletionInfo(raw.completion),
	};
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

function isObject(v: unknown): v is Record<string, unknown> {
	return v != null && typeof v === "object";
}

/** ISO 8601 -> epoch ms, or `null` if it doesn't parse (docs/API.md's "guard the NaN"). */
function parseAt(value: unknown): number | null {
	if (typeof value !== "string") return null;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? null : ms;
}

function coerceBlueprintReward(v: unknown): BlueprintReward | null {
	if (!isObject(v) || typeof v.name !== "string") return null;
	return {
		name: v.name,
		item: typeof v.item === "string" ? v.item : null,
		image: typeof v.image === "string" ? v.image : null,
		imageFallback: typeof v.imageFallback === "string" ? v.imageFallback : null,
	};
}

function isFactionStanding(v: unknown): v is FactionStanding {
	return isObject(v) && typeof v.faction === "string" && typeof v.standing === "string";
}

function isClosestPool(v: unknown): v is ClosestPool {
	return isObject(v) && typeof v.poolUuid === "string" && typeof v.poolName === "string";
}

function isRepEntry(v: unknown): v is RepEntry {
	return isObject(v) && typeof v.faction === "string" && typeof v.amount === "number";
}

function isOtherPoolEntry(v: unknown): v is OtherPoolEntry {
	return (
		isObject(v) &&
		Array.isArray(v.places) &&
		typeof v.owned === "number" &&
		typeof v.total === "number"
	);
}

function coerceRecentMission(v: unknown): RecentMissionEntry | null {
	if (!isObject(v)) return null;
	const at = parseAt(v.at);
	if (at == null) return null;
	// `title` is nullable on the wire; the overlay's own fallback is the literal "Mission"
	// (overlay/missions-tracker.js:542) rather than a placeholder we invent ourselves.
	return {
		title: typeof v.title === "string" ? v.title : "Mission",
		at,
		aUEC: typeof v.aUEC === "number" ? v.aUEC : null,
	};
}

function coerceRecentBlueprint(v: unknown): RecentBlueprintEntry | null {
	if (!isObject(v) || typeof v.name !== "string") return null;
	const at = parseAt(v.at);
	if (at == null) return null;
	return {
		name: v.name,
		at,
		item: typeof v.item === "string" ? v.item : null,
		image: typeof v.image === "string" ? v.image : null,
		imageFallback: typeof v.imageFallback === "string" ? v.imageFallback : null,
	};
}

function coerceJustReceived(v: unknown): JustReceived | null {
	const reward = coerceBlueprintReward(v);
	if (!reward || !isObject(v)) return null;
	const at = parseAt(v.at);
	if (at == null) return null;
	return { ...reward, at };
}

function coercePayout(v: unknown): CompletionInfo["payout"] {
	if (!isObject(v) || typeof v.max !== "number") return null;
	return {
		min: typeof v.min === "number" ? v.min : null,
		max: v.max,
		currency: typeof v.currency === "string" ? v.currency : null,
	};
}

function coerceClassification(v: unknown): CompletionInfo["classification"] {
	const source =
		isObject(v) && (v.source === "generator" || v.source === "missionType") ? v.source : null;
	return {
		combat: isObject(v) ? (v.combat ?? null) : null,
		activity: isObject(v) ? (v.activity ?? null) : null,
		source,
	};
}

function coerceCompletionInfo(v: unknown): CompletionInfo | null {
	if (!isObject(v)) return null;
	const at = parseAt(v.at);
	if (at == null) return null;
	return {
		at,
		title: typeof v.title === "string" ? v.title : null,
		aUEC: typeof v.aUEC === "number" ? v.aUEC : null,
		payout: coercePayout(v.payout),
		payoutEstimated: v.payoutEstimated === true,
		facts: isObject(v.facts) ? (v.facts as unknown as CompletionInfo["facts"]) : null,
		durationMs: typeof v.durationMs === "number" ? v.durationMs : null,
		blueprints: asArray<unknown>(v.blueprints)
			.map(coerceBlueprintReward)
			.filter((x): x is BlueprintReward => x != null),
		contractKey: typeof v.contractKey === "string" ? v.contractKey : null,
		giver: typeof v.giver === "string" ? v.giver : null,
		missionType: typeof v.missionType === "string" ? v.missionType : null,
		rank: typeof v.rank === "number" ? v.rank : null,
		reputationGained: asArray<unknown>(v.reputationGained).filter(isRepEntry),
		aUecPerHour: typeof v.aUecPerHour === "number" ? v.aUecPerHour : null,
		timesCompleted: typeof v.timesCompleted === "number" ? v.timesCompleted : null,
		poolProgress:
			isObject(v.poolProgress) &&
			typeof v.poolProgress.owned === "number" &&
			typeof v.poolProgress.total === "number"
				? { owned: v.poolProgress.owned, total: v.poolProgress.total }
				: null,
		classification: coerceClassification(v.classification),
	};
}
