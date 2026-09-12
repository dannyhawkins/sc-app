import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.1/§6.3: never dismissable, raw strings quoted. "Silence here reads as 'the
 * app is broken'." Rendered whenever `unrecognized.names` is non-empty — no dismiss button, no
 * "don't show again", by design.
 */
export function UnrecognizedNotice({
	names,
	packActive,
}: {
	names: string[];
	packActive: boolean;
}) {
	if (names.length === 0) return null;
	return (
		<View style={styles.banner}>
			<Text style={[type.caption, styles.title]}>
				The game wrote {names.length} name{names.length === 1 ? "" : "s"} I don't know
			</Text>
			<Text style={[type.caption, styles.names]}>{names.map((n) => `"${n}"`).join(" · ")}</Text>
			<Text style={[type.caption, styles.hint]}>
				Fix this in SC Overlay → Settings → Language.
				{packActive ? " Try Recalibrate there." : ""}
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
		gap: spacing.xxs,
	},
	title: {
		color: colors.estimate,
	},
	names: {
		color: colors.text,
	},
	hint: {
		color: colors.textFaint,
	},
});
