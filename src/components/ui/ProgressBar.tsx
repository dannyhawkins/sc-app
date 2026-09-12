import { StyleSheet, View } from "react-native";
import { colors, radii } from "@/theme/tokens";

/**
 * The 4pt bar used by PoolProgress and ClosestPoolCard — accent fill, `surface2` track. Never
 * re-orders/animates position, just width (docs/DESIGN.md §7: "the pool list never re-orders").
 */
export function ProgressBar({ progress, color }: { progress: number; color: string }) {
	const clamped = Math.max(0, Math.min(1, progress));
	return (
		<View style={styles.track}>
			<View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
		</View>
	);
}

const styles = StyleSheet.create({
	track: {
		height: 4,
		borderRadius: radii.bar,
		backgroundColor: colors.surface2,
		overflow: "hidden",
	},
	fill: {
		height: "100%",
		borderRadius: radii.bar,
	},
});
