/**
 * Errors the sidecar data layer can throw. Kept as distinct classes (rather than a single
 * "something went wrong") because the UI needs to tell "your PC is asleep/offline" (expected,
 * everyday, per docs/API.md) apart from "the server said no" (403 on a loopback-only endpoint,
 * a genuine bug) apart from "the bytes didn't parse" (a contract break worth surfacing loudly).
 */

/** The sidecar host couldn't be reached at all — DNS/connect failure, timeout, wifi drop, etc. */
export class SidecarUnreachableError extends Error {
	constructor(
		public readonly host: string,
		cause?: unknown,
	) {
		super(`Could not reach sidecar at ${host}`);
		this.name = "SidecarUnreachableError";
		this.cause = cause;
	}
}

/** The sidecar answered, but with a non-2xx status (e.g. 403 on a loopback-only route). */
export class SidecarHttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly url: string,
	) {
		super(`Sidecar returned ${status} for ${url}`);
		this.name = "SidecarHttpError";
	}
}

/** The sidecar answered 2xx but the body wasn't the JSON shape we expected. */
export class SidecarParseError extends Error {
	constructor(url: string, cause?: unknown) {
		super(`Could not parse sidecar response from ${url}`);
		this.name = "SidecarParseError";
		this.cause = cause;
	}
}
