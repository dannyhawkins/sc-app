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
 *  - Nothing here is invented. A field with no populated sample (e.g. `standings`, `missions`)
 *    is typed as `unknown[]` rather than guessed — guessing a wrong shape is worse than an
 *    honest `unknown`.
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
	itemRewards: unknown[];
	giver: string | null;
	inferredRank: unknown | null;
	repBar: unknown | null;
	missionType: string | null;
	whereToGet: string[];
	illegal: boolean;
	rankRequired: number | null;
	rankRequiredName: string | null;
	/** No populated sample seen. */
	otherPools: unknown[];
	/** No populated sample seen. */
	reputationGained: unknown[];
	/** No populated sample seen. */
	reputationLost: unknown[];
	eventTrack: unknown | null;
	completed: boolean;
	pools: BlueprintPool[];
	totals: { owned: number; total: number };
	collectedTotal: number;
	/** No populated sample seen. */
	recentMissions: unknown[];
	/** No populated sample seen. */
	recentBlueprints: unknown[];
	/**
	 * Pools nearest completion (the between-contracts screen). Assumed to reuse the same
	 * BlueprintPool shape as `pools` — API.md calls them "pools" too — but this is UNVERIFIED:
	 * the only sample we have is the empty-tracker state, where it's `[]`. If a populated sample
	 * shows a different shape, fix this rather than trusting the assumption.
	 */
	closestPools: BlueprintPool[];
	/** Reputation per mission giver. No populated sample seen. */
	standings: unknown[];
	earnings: Earnings;
	/** Drives the unlock-alert moment. No populated sample seen. */
	justReceived: unknown | null;
	unrecognized: Unrecognized;
	/** The after-action card. No populated sample seen. */
	completion: unknown | null;
	selectedId: string | null;
	/** Accepted contracts, for the picker. No populated sample seen. */
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
	/** No populated sample seen. */
	reputationGained: unknown[];
	/** No populated sample seen. */
	reputationLost: unknown[];
	whereToGet: string[];
	/** No populated sample seen. */
	otherPools: unknown[];
	inferredRank: unknown | null;
	repBar: unknown | null;
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
