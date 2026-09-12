import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

export function SearchResultRow({
	title,
	giver,
	variants,
	hasPool,
	accent,
	onPress,
}: {
	title: string;
	giver: string;
	variants: number;
	hasPool: boolean;
	accent: string;
	onPress: () => void;
}) {
	return (
		<Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
			<View style={[styles.dot, { backgroundColor: hasPool ? accent : "transparent" }]} />
			<View style={styles.text}>
				<Text style={type.body} numberOfLines={1}>
					{title}
				</Text>
				<Text style={[type.caption, styles.giver]} numberOfLines={1}>
					{giver}
					{variants > 1 ? ` · ${variants} variants` : ""}
				</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		minHeight: spacing.rowMinHeight,
	},
	pressed: {
		opacity: 0.7,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	text: {
		flex: 1,
		gap: 2,
	},
	giver: {
		color: colors.textDim,
	},
});
