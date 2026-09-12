import { Text, View } from "react-native";
import { useConnectionStore } from "@/store/connection-store";

/**
 * Deliberately unstyled placeholder — `designer` owns the visual spec (docs/DESIGN.md) and will
 * hand this screen a real layout. This just proves the data layer end to end: connection state +
 * whatever mission title the store currently holds (fixture-backed in mock mode, live sidecar
 * otherwise).
 */
export default function RootScreen() {
	const conn = useConnectionStore((state) => state.conn);
	const mode = useConnectionStore((state) => state.mode);
	const frame = useConnectionStore((state) => state.frame);

	const title = frame?.title ?? "(nothing tracked)";

	return (
		<View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
			<Text>mode: {mode}</Text>
			<Text>conn: {conn}</Text>
			<Text>tracked mission: {title}</Text>
		</View>
	);
}
