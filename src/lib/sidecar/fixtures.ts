/**
 * Bundled fixtures backing mock mode (see ./mock.ts). These are the same files in
 * /Users/danny/Code/Playground/sc-app/fixtures/ — real bytes captured off a running sidecar, not
 * hand-written — imported directly so Metro bundles them into the app. That matters more than it
 * might look: the sidecar only ever emits the *empty* tracker state on macOS (no game.log to
 * tail), so the empty-state fixture is the only populated-pool demo data anyone building this UI
 * on a Mac will ever see without a Windows box.
 */
import blueprintDetailFixture from "../../../fixtures/blueprint-detail.json";
import missionPreviewFixture from "../../../fixtures/mission-preview.json";
import missionSearchFixture from "../../../fixtures/mission-search.json";
import missionsEmptyFixture from "../../../fixtures/missions-empty.json";
import type { BlueprintDetail, MissionPreview, MissionSearchResponse, MissionView } from "./types";

export const fixtures = {
	missionsEmpty: missionsEmptyFixture as MissionView,
	missionPreview: missionPreviewFixture as MissionPreview,
	missionSearch: missionSearchFixture as MissionSearchResponse,
	blueprintDetail: blueprintDetailFixture as BlueprintDetail,
};
