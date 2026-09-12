import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

export type ChipTone = "dim" | "danger" | "owned" | "estimate";

const toneColor: Record<ChipTone, string> = {
	dim: colors.textDim,
	danger: colors.danger,
	owned: colors.owned,
	estimate: colors.estimate,
};

/**
 * Small dim/coloured pills — `CRIMESTAT`, `needs Contractor`, `3 accepted`, `DONE`. Never hue
 * alone for state (docs/DESIGN.md §1) — callers pass real words, this just tones them.
 */
export function Chip({ label, tone = "dim" }: { label: string; tone?: ChipTone }) {
	const color = toneColor[tone];
	return (
		<View style={[styles.chip, { borderColor: color }]}>
			<Text style={[type.caption, { color }]}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	chip: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: radii.chip,
		paddingHorizontal: spacing.xs,
		paddingVertical: 2,
		alignSelf: "flex-start",
	},
});
