import { StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/** The glance number — docs/DESIGN.md §5.1. `owned` gold, `/ total` dim, accent-filled bar. */
export function PoolProgress({
	owned,
	total,
	accent,
}: {
	owned: number;
	total: number;
	accent: string;
}) {
	return (
		<View style={styles.container}>
			<Text style={type.display}>
				<Text style={{ color: colors.value }}>{owned}</Text>
				<Text style={{ color: colors.textDim }}> / {total}</Text>
			</Text>
			<ProgressBar progress={total > 0 ? owned / total : 0} color={accent} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.xs,
	},
});
