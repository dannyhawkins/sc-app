import { SidecarHttpError, SidecarParseError, SidecarUnreachableError } from "./errors";
import type { BlueprintDetail, MissionPreview, MissionSearchResponse, MissionView } from "./types";

/**
 * A sidecar host, normalized to bare `host[:port]` — no scheme, no path (see
 * normalizeHostInput()). Validation/persistence lives in ./host-store; this module just needs a
 * clean string to build URLs from.
 */
export type SidecarHost = string;

const DEFAULT_PORT = 8778;

/**
 * SC Overlay's own "Browser sources & extra monitors" settings screen has a copy button next to
 * a full `http://192.168.x.x:8778/…` URL (per docs/DESIGN.md §4), and that's what users will
 * paste into Connect rather than typing a bare host. Strips any scheme and any path/query/
 * fragment, leaving just `host[:port]`. Idempotent — safe to run on an already-clean host too.
 */
export function normalizeHostInput(input: string): string {
	let value = input.trim().replace(/^https?:\/\//i, "");
	const slashIndex = value.indexOf("/");
	if (slashIndex !== -1) value = value.slice(0, slashIndex);
	return value.replace(/\/+$/, "");
}

/** Turns a user-entered host into a base URL, adding the default port if none was given. */
export function baseUrlFor(host: SidecarHost): string {
	const normalized = normalizeHostInput(host);
	const hasPort = /:\d+$/.test(normalized);
	return `http://${hasPort ? normalized : `${normalized}:${DEFAULT_PORT}`}`;
}

/**
 * `manufacturer` on a blueprint-detail response comes back as the literal string
 * "<= PLACEHOLDER =>" for at least some items (verified against the live sidecar). Per
 * docs/API.md, treat that as absent rather than rendering it.
 */
export function normalizeManufacturer(manufacturer: string): string | null {
	return manufacturer === "<= PLACEHOLDER =>" ? null : manufacturer;
}

interface GetJsonOptions {
	signal?: AbortSignal;
	/** Injectable for tests / the mock layer. Defaults to global fetch. */
	fetchImpl?: typeof fetch;
}

async function getJson<T>(url: string, opts: GetJsonOptions = {}): Promise<T> {
	const fetchImpl = opts.fetchImpl ?? fetch;
	let response: Response;
	try {
		response = await fetchImpl(url, { signal: opts.signal });
	} catch (cause) {
		// fetch throws for DNS failure, connection refused, timeout, and (on RN) an aborted
		// signal — all of which mean "can't reach the PC right now", the everyday case per
		// docs/API.md, not an exceptional one.
		throw new SidecarUnreachableError(url, cause);
	}
	if (!response.ok) {
		throw new SidecarHttpError(response.status, url);
	}
	try {
		return (await response.json()) as T;
	} catch (cause) {
		throw new SidecarParseError(url, cause);
	}
}

/**
 * Typed client for the sidecar's read endpoints. Every endpoint here is on the open (non-
 * loopback-gated) GET list in docs/API.md — this client deliberately has no write methods; v1 is
 * read-only because every mutation 403s from anything but the sidecar's own machine.
 */
export class SidecarHttpClient {
	constructor(
		private readonly host: SidecarHost,
		private readonly fetchImpl?: typeof fetch,
	) {}

	private get baseUrl(): string {
		return baseUrlFor(this.host);
	}

	/** GET /api/missions — one-shot version of the SSE feed. Use for initial paint / pull-to-refresh. */
	getMissions(signal?: AbortSignal): Promise<MissionView> {
		return getJson<MissionView>(`${this.baseUrl}/api/missions`, {
			signal,
			fetchImpl: this.fetchImpl,
		});
	}

	/** GET /api/mission-search?q= — typeahead over ~1,999 bundled contracts. */
	searchMissions(query: string, signal?: AbortSignal): Promise<MissionSearchResponse> {
		const url = `${this.baseUrl}/api/mission-search?q=${encodeURIComponent(query)}`;
		return getJson<MissionSearchResponse>(url, { signal, fetchImpl: this.fetchImpl });
	}

	/**
	 * GET /api/mission-preview?title= — the full brief for a contract, keyed by exact `title`
	 * (NOT `key` — verified against the live sidecar, which 400s/empties on `key`). Works with no
	 * game log at all, which makes it the best endpoint to develop against.
	 */
	getMissionPreview(title: string, signal?: AbortSignal): Promise<MissionPreview> {
		const url = `${this.baseUrl}/api/mission-preview?title=${encodeURIComponent(title)}`;
		return getJson<MissionPreview>(url, { signal, fetchImpl: this.fetchImpl });
	}

	/** GET /api/blueprint-detail?item= — crafting detail for one blueprint, keyed by item UUID. */
	getBlueprintDetail(item: string, signal?: AbortSignal): Promise<BlueprintDetail> {
		const url = `${this.baseUrl}/api/blueprint-detail?item=${encodeURIComponent(item)}`;
		return getJson<BlueprintDetail>(url, { signal, fetchImpl: this.fetchImpl });
	}
}
