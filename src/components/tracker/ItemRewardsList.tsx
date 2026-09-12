import { StyleSheet, Text, View } from "react-native";
import type { ItemReward } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/** docs/DESIGN.md §5.1: non-blueprint rewards, e.g. "2× Medpen". `owned` is manual-only on the desktop. */
export function ItemRewardsList({ items }: { items: ItemReward[] }) {
	if (items.length === 0) return null;
	return (
		<View style={styles.container}>
			{items.map((item) => (
				<View key={item.name} style={styles.row}>
					<Text style={item.owned ? styles.owned : styles.glyph}>{item.owned ? "✓" : "○"}</Text>
					<Text style={type.body}>
						{item.qty}× {item.name}
					</Text>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.xxs,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
	glyph: {
		color: colors.textFaint,
	},
	owned: {
		color: colors.owned,
	},
});
