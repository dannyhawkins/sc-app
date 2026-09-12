import { baseUrlFor, type SidecarHost } from "./http-client";
import type { MissionView } from "./types";

/**
 * The one-shot "does this address even work" probe for the Connect screen (docs/DESIGN.md §4).
 * Deliberately its own thing, not reused from ../store/connection-store's polling loop: the
 * Connect screen needs to distinguish *why* a probe failed (nothing there vs. something-that-
 * isn't-the-sidecar vs. 403) so it can show the right copy, where the background poll only cares
 * about ok-or-not.
 */
export type ConnectTestResult =
	| { status: "ok"; view: MissionView }
	| { status: "unreachable" } // DESIGN.md: "Nothing answered at <host>. Is SC Overlay running…"
	| { status: "not-sidecar" } // answered, but not JSON / no `patch` field
	| { status: "forbidden" }; // 403 — only reachable via a loopback-listed path typed by mistake

const TEST_TIMEOUT_MS = 4_000;

export async function testSidecarHost(host: SidecarHost): Promise<ConnectTestResult> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
	try {
		const response = await fetch(`${baseUrlFor(host)}/api/missions`, {
			signal: controller.signal,
		});
		if (response.status === 403) return { status: "forbidden" };
		if (!response.ok) return { status: "unreachable" };
		let body: unknown;
		try {
			body = await response.json();
		} catch {
			return { status: "not-sidecar" };
		}
		if (typeof body !== "object" || body === null || !("patch" in body)) {
			return { status: "not-sidecar" };
		}
		return { status: "ok", view: body as MissionView };
	} catch {
		// Covers connection refused, DNS failure, and the 4s timeout firing.
		return { status: "unreachable" };
	} finally {
		clearTimeout(timeout);
	}
}
