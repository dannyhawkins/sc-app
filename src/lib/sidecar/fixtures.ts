/**
 * Bundled fixtures backing mock mode (see ../../store/connection-store.ts's `setMode("mock")`).
 * These are the same files in /Users/danny/Code/Playground/sc-app/fixtures/ — real bytes captured
 * off a running sidecar, not hand-written — imported directly so Metro bundles them into the app.
 * That matters more than it might look: the sidecar only ever emits the *empty* tracker state on
 * macOS (no game.log to tail), so the empty-state fixture is the only populated-pool demo data
 * anyone building this UI on a Mac will ever see without a Windows box.
 */
import blueprintDetailFixture from "../../../fixtures/blueprint-detail.json";
import missionPreviewFixture from "../../../fixtures/mission-preview.json";
import missionPreviewWarmFixture from "../../../fixtures/mission-preview-warm.json";
import missionSearchFixture from "../../../fixtures/mission-search.json";
import missionsEmptyFixture from "../../../fixtures/missions-empty.json";
import type { BlueprintDetail, MissionPreview, MissionSearchResponse, MissionView } from "./types";

const missionsEmpty = missionsEmptyFixture as MissionView;
const missionPreview = missionPreviewFixture as MissionPreview;

/**
 * A TRACKED view for mock mode, composed from the two real fixtures above.
 *
 * Why compose rather than ship a captured one: a populated tracker needs a real `game.log`, so no
 * fixture in this repo has a tracked contract and none can until someone captures one on Windows.
 * Without this, "preview with sample data" lands on the idle screen — and the Tracker's tracked
 * mode, which is the entire point of the app, can't be seen at all on a Mac.
 *
 * 🔑 THE RULE THIS FOLLOWS: sample data may be PARTIAL, it may not be MADE UP. Every value below
 * is real — the contract, its seven blueprints, the payout, the facts all come off the wire in
 * `mission-preview.json`; the patch, prefs, ship and earnings come from `missions-empty.json`.
 * Fields with no real sample anywhere (`standings`, `closestPools`, `recentMissions`,
 * `recentBlueprints`, `justReceived`, `completion`) are left EMPTY so those sections render their
 * own empty states. A demo that invents plausible-looking standings would be exactly the
 * dishonesty docs/API.md's honesty rules exist to prevent — and it would be the one lie nobody
 * catches, because it looks right.
 *
 * Consequence worth knowing: every blueprint here is genuinely `owned: false`, so the pool shows
 * `0 / 7` and the owned-row treatment never appears in sample mode. That is a real state a player
 * sees on a fresh pool, and it beats faking ownership to make the screenshot prettier.
 */
const missionsTracked: MissionView = {
	...missionsEmpty,
	contractKey: missionPreview.contractKey,
	title: missionPreview.title,
	giver: missionPreview.giver,
	missionType: missionPreview.missionType,
	illegal: missionPreview.illegal,
	rankRequired: missionPreview.rankRequired,
	rankRequiredName: missionPreview.rankRequiredName,
	payout: missionPreview.payout,
	payoutEstimated: missionPreview.payoutEstimated,
	facts: missionPreview.facts,
	whereToGet: missionPreview.whereToGet,
	pools: missionPreview.pools,
	hasPool: missionPreview.hasPool,
	ambiguous: missionPreview.ambiguous,
	totals: { owned: missionPreview.owned, total: missionPreview.total },
	// The warm fixture's `{payout: null, facts: null}` — "fetch succeeded, nobody has reported this
	// contract". Deliberately not the null form: this exercises the state a component is most
	// likely to get wrong, since it must null-check the members and not just the container.
	community: (missionPreviewWarmFixture as MissionPreview).community ?? null,
};

export const fixtures = {
	missionsEmpty,
	/** The tracked-mode sample. See the note above on why it's composed and what it refuses to invent. */
	missionsTracked,
	missionPreview,
	/** `community: {payout:null, facts:null}` — the "fetch succeeded, nobody's reported" state; see docs/API.md's "three states, not two". */
	missionPreviewWarm: missionPreviewWarmFixture as MissionPreview,
	missionSearch: missionSearchFixture as MissionSearchResponse,
	blueprintDetail: blueprintDetailFixture as BlueprintDetail,
};
