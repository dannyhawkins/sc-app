import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/** Static copy, amber hairline — docs/DESIGN.md §5.1. */
export function AmbiguousBanner() {
	return (
		<View style={styles.banner}>
			<Text style={[type.caption, styles.text]}>
				Several contracts share this name. Pool shown is the union — odds are approximate.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.estimate,
		borderRadius: radii.card,
		padding: spacing.sm,
	},
	text: {
		color: colors.estimate,
	},
});
