import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";

function Bar({ width, height = 16 }: { width: number | `${number}%`; height?: number }) {
	return <View style={[styles.bar, { width, height }]} />;
}

/** First paint only, docs/DESIGN.md §5.1: "three text bars, one big number bar, five row bars." */
export function Skeleton() {
	return (
		<View style={styles.container}>
			<Bar width="70%" />
			<Bar width="90%" height={22} />
			<Bar width="50%" />
			<Bar width="60%" height={40} />
			<View style={styles.rows}>
				{Array.from({ length: 5 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed-count static placeholder bars, never reordered
					<Bar key={i} width="100%" height={52} />
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.md,
		padding: spacing.gutter,
	},
	bar: {
		backgroundColor: colors.surface2,
		borderRadius: radii.chip,
	},
	rows: {
		gap: spacing.xxs,
	},
});
