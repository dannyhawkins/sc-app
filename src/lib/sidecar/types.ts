/**
 * Wire types for the sc-overlay sidecar HTTP+SSE API.
 *
 * Source of truth: /Users/danny/Code/Playground/sc-app/docs/API.md, cross-checked against the
 * real fixtures in /Users/danny/Code/Playground/sc-app/fixtures/ (those are bytes captured off a
 * running sidecar, not hand-written examples) and a live sidecar boot on macOS.
 *
 * Ground rules for these types (don't relax them without re-reading API.md):
 *  - Every field is typed exactly as observed. Fields that are `null` in every sample we have
 *    stay nullable rather than being narrowed to "probably a string" — the empty state (no game
 *    log, nothing tracked) is the *common* case for this app, not an edge case.
 *  - Nothing here is invented. `standings`, `closestPools`, `recentMissions`/`recentBlueprints`
 *    and `justReceived` never appear populated in any fixture (they need a real game.log the
 *    macOS dev sidecar can't produce), but their element types (`FactionStanding`, `RepBar`,
 *    `ClosestPool`, `RecentMissionEntry`/`RecentBlueprintEntry`, `JustReceived`, `RepEntry`) are
 *    CONFIRMED anyway — transcribed from `sc-overlay/src/missions.ts` directly, not guessed. The
 *    two exceptions still typed from mockup prose rather than source are `OtherPoolEntry` and
 *    `CompletionInfo` — see their own comments. A field with genuinely no lead at all is typed
 *    `unknown` rather than guessed — guessing a wrong shape is worse than an honest `unknown`.
 */

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

export interface Payout {
	min: number;
	max: number;
	currency: string;
}

/**
 * The shape money-formatting helpers actually need — both `Payout` (top-level, `min`/`currency`
 * always non-null in every sample) and `CompletionPayout` (nullable `min`/`currency` — see its own
 * comment) satisfy this structurally, so `formatPayoutRange`/`resolvePayoutLine` work on either
 * without a cast.
 */
export interface PayoutLike {
	min: number | null;
	max: number;
	currency: string | null;
}

/**
 * The bundled dataset's contract facts. EVERY field is optional — coverage across the ~1,999
 * bundled contracts is partial (dur ~47%, diff ~46%, cd ~55%) and no contract has all of them.
 * Render what's present, say nothing about what's missing; don't default a missing field to 0
 * or false, that would assert something the dataset never claimed.
 */
export interface MissionFacts {
	/** Minutes before you can retake the contract after finishing it. NOT the same as `dur`. */
	cd?: number;
	/** Variance on `cd`, in minutes. */
	cdVar?: number;
	/** How long a run is expected to take, in minutes. */
	dur?: number;
	/**
	 * CIG's own blended difficulty, scale 1-7. Do NOT conflate this with
	 * `community.facts.difficulty`, a different, player-reported number on a 1-5 scale — see
	 * docs/API.md's "The two difficulty numbers" section. The fixture's `5.8` is this field,
	 * i.e. 5.8 out of 7, not out of 10.
	 */
	diff?: number;
	/**
	 * Only ever `true` when present. Absence means "not stated by the dataset", never "you CAN
	 * retry" — assert only the negative per docs/API.md.
	 */
	noRetry?: boolean;
}

/**
 * The player-reported layer, fetched by the sidecar itself from subliminal.gg (the phone needs
 * no internet access of its own for this). `null` is the everyday value — sidecar offline,
 * subliminal.gg down, cache miss, or nobody's reported this contract — never render that as an
 * error or a spinner, just omit what it would have told you.
 */
export interface CommunityInfo {
	/** Drives the "reported" payout provenance label — see the honesty rules in docs/API.md. */
	payout: unknown | null;
	facts: {
		/** Player-reported difficulty, 1-5 — see MissionFacts.diff for the unrelated 1-7 scale. */
		difficulty: number;
		/** How many reports the average is drawn from. */
		difficultyAnswers: number;
	} | null;
}

/**
 * A blueprint reward inside a pool. `chance` is the real drop probability (1 = guaranteed).
 * `tab`/`sub` are the overlay's own taxonomy for grouping rewards (weapons/armor/ammo/etc) —
 * group UI by these, don't invent a different grouping.
 */
export interface Blueprint {
	name: string;
	owned: boolean;
	/** Where an owned blueprint was sourced from, if known. No populated sample seen. */
	source: string | null;
	chance: number;
	tab: string;
	sub: string;
	/** Item UUID — the key for GET /api/blueprint-detail?item=. */
	item: string;
	/** Whether /api/blueprint-detail will return anything for `item`. */
	hasDetail: boolean;
}

export interface BlueprintPool {
	poolUuid: string;
	blueprints: Blueprint[];
}

export interface Earnings {
	repLastHr: number;
	/** No populated sample seen; API.md documents this only as "repPace". */
	repPace: unknown | null;
	aUECLastHr: number | null;
	aUECPace: unknown | null;
	aUECTotal: number | null;
	aUECEstimated: boolean;
	aUECModelled: boolean;
	aUECFrom: number;
	repTotal: number;
	missions: number;
}

export interface Unrecognized {
	/** Blueprint names the localisation pack couldn't resolve. Surface these, don't hide them. */
	names: string[];
	packActive: boolean;
}

/**
 * One entry in `standings[]` (the idle-mode list). CONFIRMED against `sc-overlay/src/missions.ts:126`
 * (docs/API.md's "arrays that are always empty in dev" section — no fixture has one populated,
 * but the shape is read straight from source, not guessed). `pct` is 0-100 through the current
 * rank — that's the real bar StandingRow can draw. `estimate`/`curMin`/`nextMin` are carried but
 * "never displayed" per source comment; don't build UI around them.
 */
export interface FactionStanding {
	faction: string;
	scope: string;
	/** Current rank label, e.g. "Sr. Contractor". */
	standing: string;
	/** The named next rank, e.g. "Veteran Contractor". Null at max rank. */
	nextName: string | null;
	/** 0-100 through the current rank. */
	pct: number;
	/** Raw rep-to-go fallback, shown (with a tilde) only when `contractsToGo` is null. */
	toGo: number | null;
	/** The plan-shaped estimate — prefer this over `toGo` whenever it's non-null. */
	contractsToGo: number | null;
	nextRewards: string[];
	estimate: number;
	curMin: number;
	nextMin: number | null;
}

/**
 * The TRACKED contract's reputation bar — CONFIRMED, `missions.ts:168` (docs/DESIGN.md Appendix
 * A). A different shape from `FactionStanding` (idle mode's list): notably NO `pct` — derive
 * `clamp((estimate - curMin) / (nextMin - curMin), 0, 1)` when `nextMin` is non-null, `max` means
 * full. `contractsToGo` isn't here either; it comes from the `standings[]` entry whose `faction`
 * matches this bar's, falling back to `~(nextMin - estimate) rep to go` when nothing matched.
 */
export interface RepBar {
	scope: string;
	faction: string;
	standing: string;
	nextName: string | null;
	nextRank: number | null;
	nextRewards: string[];
	estimate: number;
	curMin: number;
	nextMin: number | null;
	max: boolean;
	offTrack?: boolean;
	noData: boolean;
}

/**
 * `otherPools[]` — CONFIRMED, `missions.ts` `TrackedView` (docs/DESIGN.md Appendix A). Other star
 * systems where the SAME contract title drops a pool, rendered as "Stanton · 2 / 6" per
 * docs/DESIGN.md §5.1. Note `places` is PLURAL — one entry can name more than one place sharing
 * the same owned/total, unlike the singular `place` an earlier draft of this type guessed.
 */
export interface OtherPoolEntry {
	places: string[];
	owned: number;
	total: number;
}

/**
 * `closestPools[]` (the idle-mode "between contracts" cards) — CONFIRMED, `missions.ts:69`
 * (docs/DESIGN.md Appendix A). The pay/dur/rep/cooldown fields are carried but intentionally NOT
 * rendered — docs/DESIGN.md §5.2: "the per-hour figure belongs to the session tracker, not to
 * 'closest to done'." Typed anyway rather than dropped, per this file's own honesty rule about
 * not throwing away bytes the server sends.
 */
export interface ClosestPool {
	poolUuid: string;
	key: string;
	title: string;
	poolName: string;
	/** Shortest first; show `[0]` and a count of the rest. */
	missionTitles: string[];
	variants: number;
	/** What you still need, alphabetical — the tie-breaker between look-alike pools. */
	missing: string[];
	owned: number;
	total: number;
	places: string[];
	/** DO NOT RENDER — docs/DESIGN.md §5.2. */
	payMin: number | null;
	/** DO NOT RENDER. */
	payMax: number | null;
	/** DO NOT RENDER. */
	payoutEstimated: boolean;
	/** DO NOT RENDER. */
	durMin: number | null;
	/** DO NOT RENDER. */
	rep: number | null;
	/** DO NOT RENDER. */
	cooldownMin: number | null;
	giver: string | null;
	missionType: string | null;
}

/**
 * One `recentMissions[]` entry — CONFIRMED, `missions.ts:565`. Both fields below are the
 * APP-INTERNAL form, normalized once by `sanitizeMissionView`:
 *  - `title` is nullable on the wire; the overlay falls back to the literal "Mission"
 *    (`overlay/missions-tracker.js:542`) rather than inventing its own placeholder, and the
 *    sanitizer applies that same fallback so this is never actually null by the time a component
 *    sees it.
 *  - `at` — the wire sends an ISO 8601 string (`missions.ts:2058`), parsed once into epoch ms (an
 *    entry whose `at` fails to parse is dropped, per docs/API.md's "guard the NaN" warning).
 */
export interface RecentMissionEntry {
	title: string;
	at: number;
	aUEC: number | null;
}

/** One `recentBlueprints[]` entry — CONFIRMED, `missions.ts:572`. `at` is parsed, see RecentMissionEntry. */
export interface RecentBlueprintEntry {
	name: string;
	at: number;
	item: string | null;
	image: string | null;
	imageFallback: string | null;
}

/** The tier-ladder pointer shown under PoolProgress when a contract has one. Ladder itself is out of v1 scope. */
export interface EventTrack {
	name: string;
	note: string | null;
}

/** One `itemRewards[]` entry — non-blueprint rewards, e.g. "2× Medpen". No populated sample seen. */
export interface ItemReward {
	name: string;
	qty: number;
	owned: boolean;
}

/** `reputationGained[]`/`reputationLost[]` and `CompletionInfo.reputationGained` — CONFIRMED, `missions.ts:44`. */
export interface RepEntry {
	faction: string;
	scope: string;
	amount: number;
}

/** A blueprint award as it appears in `justReceived` and `completion.blueprints` — `missions.ts:616`. */
export interface BlueprintReward {
	name: string;
	item: string | null;
	image: string | null;
	imageFallback: string | null;
}

/**
 * Drives the unlock-alert moment (docs/DESIGN.md §5.4 ReceivedFlash) — a `BlueprintReward` plus
 * `at`, CONFIRMED shape (`missions.ts:616`). Identity is `at` — a re-render with the same `at`
 * must not restart the flash. `at` is the parsed (epoch ms) form — see RecentMissionEntry.
 */
export interface JustReceived extends BlueprintReward {
	at: number;
}

/**
 * The completion payout can be MORE null than the top-level `Payout` — `min`/`currency` are both
 * nullable here, unlike every `Payout` instance seen elsewhere. Kept as its own type rather than
 * relaxing `Payout` itself and losing that non-nullability everywhere else.
 */
export interface CompletionPayout {
	min: number | null;
	max: number;
	currency: string | null;
}

/**
 * The after-action card (docs/DESIGN.md §5.4 CompletionCard) — CONFIRMED, `missions.ts:799`
 * (docs/DESIGN.md Appendix A). Identity is `at`, ISO on the wire like every other `at` here,
 * parsed to epoch ms by `sanitizeMissionView`. `title` is nullable — CompletionCard omits that
 * line rather than inventing a placeholder when it is.
 */
export interface CompletionInfo {
	at: number;
	title: string | null;
	/** Logged live — the one place "aUEC" (not "payout"/"estimated") is earned, per docs/DESIGN.md §6.1. */
	aUEC: number | null;
	payout: CompletionPayout | null;
	payoutEstimated: boolean;
	facts: MissionFacts | null;
	durationMs: number | null;
	blueprints: BlueprintReward[];
	contractKey: string | null;
	giver: string | null;
	missionType: string | null;
	rank: number | null;
	reputationGained: RepEntry[];
	/** Dim mono `~2.9M aUEC/hr`; tilde when `payoutEstimated`. Omitted when null. */
	aUecPerHour: number | null;
	timesCompleted: number | null;
	/** The authoritative "pool now X/Y" figure for THIS completion — don't substitute the frame's `totals`. */
	poolProgress: { owned: number; total: number } | null;
	/** Not rendered in v1; carried for completeness. */
	classification: {
		combat: unknown | null;
		activity: unknown | null;
		source: "generator" | "missionType" | null;
	};
}

export interface ShipInfo {
	type: string;
	theme: string;
	accent: string;
	accentRgb: string;
	manufacturer: string | null;
	ship: string | null;
	code: string | null;
	onFoot: boolean;
}

export interface Prefs {
	timeRelative: boolean;
	hideCatbar: boolean;
	missionOcr: boolean;
	fabCapture: boolean;
	fabClaim: boolean;
	fabClaimKey: string;
	theme: string;
	overlayTwist: number;
	overlayScale: number;
	unfocusedOpacity: number;
	premium: boolean;
	demo: boolean;
	payoutScan: boolean;
	payoutRegion: { x: number; y: number; w: number; h: number };
	payoutOnPrimary: unknown | null;
	repScan: boolean;
	repScanLast: unknown | null;
}

// ---------------------------------------------------------------------------
// GET /api/missions (one-shot) and GET /missions/events (SSE) — same shape.
//
// NOTE: API.md's field table documents the fields that matter for missions/blueprints, but the
// real payload (see fixtures/missions-empty.json) carries more top-level fields than the table
// lists: `build`, `logEnv`, `envIsLive`, `generator`, `itemRewards`, `eventTrack`, `completed`,
// `selectedId`, `appVersion`, `fabClaim`, `live`. They're included below rather than dropped —
// don't throw away bytes the server actually sends — but most are typed loosely since we only
// have the empty-state sample.
// ---------------------------------------------------------------------------

export interface MissionView {
	/** Which dataset generation is loaded, e.g. "4.10.0-LIVE.12519617". */
	patch: string;
	build: string | null;
	logEnv: string | null;
	envIsLive: boolean;
	/** The tracked contract. All three of contractKey/title/giver null = nothing tracked. */
	contractKey: string | null;
	title: string | null;
	generator: string | null;
	hasPool: boolean;
	/** True when the log line matched several contracts — the UI can't be sure which one. */
	ambiguous: boolean;
	payout: Payout | null;
	/** true = modelled/guessed, not observed. Must be visibly labelled, never shown as fact. */
	payoutEstimated: boolean;
	facts: MissionFacts | null;
	/** No populated sample seen. */
	itemRewards: ItemReward[];
	giver: string | null;
	inferredRank: unknown | null;
	repBar: RepBar | null;
	missionType: string | null;
	whereToGet: string[];
	illegal: boolean;
	rankRequired: number | null;
	rankRequiredName: string | null;
	otherPools: OtherPoolEntry[];
	reputationGained: RepEntry[];
	reputationLost: RepEntry[];
	eventTrack: EventTrack | null;
	completed: boolean;
	pools: BlueprintPool[];
	totals: { owned: number; total: number };
	collectedTotal: number;
	recentMissions: RecentMissionEntry[];
	recentBlueprints: RecentBlueprintEntry[];
	/** Pools nearest completion (the between-contracts screen). CONFIRMED shape — see `ClosestPool`. */
	closestPools: ClosestPool[];
	standings: FactionStanding[];
	earnings: Earnings;
	justReceived: JustReceived | null;
	unrecognized: Unrecognized;
	completion: CompletionInfo | null;
	selectedId: string | null;
	/** Accepted contracts, for the picker. No populated sample seen — only `.length` is used in v1. */
	missions: unknown[];
	community: CommunityInfo | null;
	appVersion: string;
	/**
	 * Top-level `fabClaim` is a DIFFERENT field from `prefs.fabClaim` despite the identical name —
	 * this one is `null` in every sample we have while `prefs.fabClaim` is a boolean. Don't
	 * conflate them.
	 */
	fabClaim: unknown | null;
	live: boolean;
	ship: ShipInfo;
	prefs: Prefs;
}

/**
 * A dev-reload frame that rides the same SSE stream as MissionView frames. Never render this as
 * mission/blueprint state — check `kind` before touching a frame. See docs/API.md's "Frames are
 * discriminated" warning.
 */
/**
 * A control frame on the mission stream. `{kind:"devreload", widget}` is the only one the sidecar
 * sends today, but `kind` is the discriminator for the whole class, not for that one message.
 */
export interface ControlFrame {
	kind: string;
	[key: string]: unknown;
}

export type SidecarFrame = MissionView | ControlFrame;

/**
 * True for any frame that is NOT mission state.
 *
 * 🔑 Tests for the PRESENCE of `kind`, deliberately — not for `kind === "devreload"`. A mission
 * view never carries `kind`, so the field itself is the signal, and a control kind added to the
 * stream later still can't reach the mission renderer. The overlay's own server comment makes the
 * same point from the other side: the dev-reload frame carries `kind` so the page can dispatch on
 * it, and removing that check feeds a control message to the state renderer as if it were a view.
 */
export function isControlFrame(frame: SidecarFrame): frame is ControlFrame {
	return typeof (frame as ControlFrame).kind === "string";
}

// ---------------------------------------------------------------------------
// GET /api/mission-preview?title=<exact title>
//
// A DIFFERENT shape from MissionView — don't reuse MissionView for this. No `patch`, no
// `itemRewards`, etc. Has `owned`/`total` as plain top-level numbers (MissionView nests the
// equivalent under `totals`), plus `variants`.
// ---------------------------------------------------------------------------

export interface MissionPreview {
	contractKey: string;
	title: string;
	giver: string;
	missionType: string;
	illegal: boolean;
	rankRequired: number | null;
	rankRequiredName: string | null;
	payout: Payout | null;
	payoutEstimated: boolean;
	reputationGained: RepEntry[];
	reputationLost: RepEntry[];
	whereToGet: string[];
	otherPools: OtherPoolEntry[];
	inferredRank: unknown | null;
	repBar: RepBar | null;
	ambiguous: boolean;
	hasPool: boolean;
	facts: MissionFacts | null;
	/** How many log-name variants map to this contract. */
	variants: number;
	pools: BlueprintPool[];
	owned: number;
	total: number;
	community: CommunityInfo | null;
}

// ---------------------------------------------------------------------------
// GET /api/mission-search?q=<text>
// ---------------------------------------------------------------------------

export interface MissionSearchResult {
	title: string;
	key: string;
	variants: number;
	giver: string;
	hasPool: boolean;
}

export interface MissionSearchResponse {
	missions: MissionSearchResult[];
}

// ---------------------------------------------------------------------------
// GET /api/blueprint-detail?item=<uuid>
// ---------------------------------------------------------------------------

export interface BlueprintStat {
	label: string;
	value: string;
	unit: string | null;
	key: string | null;
}

export interface BlueprintIngredient {
	name: string;
	scu: number | null;
	qty: number | null;
}

export interface RecipeMaterial {
	name: string;
	scu: number | null;
	qty: number | null;
	minQuality: number;
	sell: number | null;
}

export interface RecipeModifier {
	key: string;
	name: string;
	atMinQuality: number;
	atMaxQuality: number;
	qualityMin: number;
	qualityMax: number;
	curve: string;
}

export interface RecipeGroup {
	name: string;
	requiredCount: number;
	chooseOne: boolean;
	materials: RecipeMaterial[];
	modifiers: RecipeModifier[];
}

export interface DismantleYield {
	name: string;
	scu: number;
}

/**
 * `manufacturer` comes back as the literal string "<= PLACEHOLDER =>" for at least some items —
 * per API.md, treat that as absent rather than rendering it. Use
 * `normalizeManufacturer()` from `./http-client` instead of reading this field raw.
 */
export interface BlueprintDetail {
	name: string;
	manufacturer: string;
	craftTimeSeconds: number;
	stats: BlueprintStat[];
	ingredients: BlueprintIngredient[];
	recipeGroups: RecipeGroup[];
	dismantle: DismantleYield[];
}
