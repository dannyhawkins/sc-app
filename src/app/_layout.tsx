import { Stack } from "expo-router";
import { useEffect } from "react";
import { useConnectionStore } from "@/store/connection-store";

export default function RootLayout() {
	const hydrate = useConnectionStore((state) => state.hydrate);

	// Load the persisted sidecar host (if any) and kick off the first connection attempt once,
	// at app boot. See src/store/connection-store.ts for what "connect" means in each mode.
	useEffect(() => {
		hydrate();
	}, [hydrate]);

	return <Stack />;
}
