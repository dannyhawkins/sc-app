import EventSource from "react-native-sse";
import { baseUrlFor, type SidecarHost } from "./http-client";
import { isControlFrame, type MissionView, type SidecarFrame } from "./types";

/**
 * Why react-native-sse: React Native ships no `EventSource` (it's a browser API; RN's `fetch` is
 * a different polyfill that doesn't stream text/event-stream framing). This library re-parses
 * SSE framing on top of RN's networking and is the standard choice for RN SSE clients.
 *
 * We disable the library's own auto-reconnect (`pollingInterval: 0`) and drive reconnection
 * ourselves from ../store/connection-store, because the store needs to know *when* a reconnect
 * attempt starts/fails to render connecting/unreachable states — the library's built-in retry
 * would hide that from us.
 */

export type SseHandlers = {
	onOpen?: () => void;
	/** Called once per live mission/blueprint frame. Dev-reload frames are filtered out already. */
	onMission?: (view: MissionView) => void;
	onError?: (error: unknown) => void;
};

export interface SseSubscription {
	close: () => void;
}

/** Opens one SSE connection to /missions/events. Caller owns retry/backoff (see connection-store). */
export function subscribeToMissionEvents(
	host: SidecarHost,
	handlers: SseHandlers,
): SseSubscription {
	const url = `${baseUrlFor(host)}/missions/events`;
	const es = new EventSource(url, { pollingInterval: 0 });

	es.addEventListener("open", () => handlers.onOpen?.());

	es.addEventListener("message", (event) => {
		if (!event.data) return;
		let frame: SidecarFrame;
		try {
			frame = JSON.parse(event.data) as SidecarFrame;
		} catch (cause) {
			handlers.onError?.(cause);
			return;
		}
		// The stream is discriminated: control frames ride alongside real mission views and
		// must never be handed to the mission renderer as if it were state. See docs/API.md.
		if (isControlFrame(frame)) return;
		handlers.onMission?.(frame);
	});

	es.addEventListener("error", (event) => handlers.onError?.(event));

	return {
		close: () => {
			es.removeAllEventListeners();
			es.close();
		},
	};
}
