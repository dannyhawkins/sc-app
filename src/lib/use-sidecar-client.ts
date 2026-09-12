import { useMemo } from "react";
import { SidecarHttpClient } from "@/lib/sidecar";
import { useConnectionStore } from "@/store/connection-store";

/** `null` in mock mode or before a host is set — callers fall back to bundled fixtures then. */
export function useSidecarClient(): SidecarHttpClient | null {
	const mode = useConnectionStore((state) => state.mode);
	const host = useConnectionStore((state) => state.host);
	return useMemo(
		() => (mode === "live" && host ? new SidecarHttpClient(host) : null),
		[mode, host],
	);
}
