import { StyleSheet, Text, View } from "react-native";
import { formatThousands } from "@/lib/format";
import type { Earnings } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.2: only what the server hands over, never summed on the phone. `aUECFrom`/
 * `missions` always shown together so a total from a subset can't read as the whole session.
 *
 * `missions === 0` reads as a sentence, not a row of zeros — docs/mockup.html's
 * `EarningsStrip · three states` fragment is explicit about this ("a sentence, not a row of
 * zeros"). An earlier draft of this dropped that special case after misreading an older mockup
 * fragment that turned out to be a mockup bug (since fixed); don't reintroduce the zeros.
 */
export function EarningsStrip({ earnings }: { earnings: Earnings }) {
	if (earnings.missions === 0) {
		return (
			<View style={styles.container}>
				<Text style={type.label}>THIS SESSION</Text>
				<Text style={[type.caption, styles.dim]}>No completions yet this session.</Text>
			</View>
		);
	}

	const money = moneyParts(earnings);

	return (
		<View style={styles.container}>
			<Text style={type.label}>THIS SESSION</Text>
			<Text style={type.caption}>
				<Text style={styles.dim}>
					{earnings.missions} contract{earnings.missions === 1 ? "" : "s"} ·{" "}
					{formatThousands(earnings.repTotal)} rep ·{" "}
				</Text>
				<Text style={{ color: money.color }}>{money.amount}</Text>
				{money.suffix ? <Text>{money.suffix}</Text> : null}
			</Text>
		</View>
	);
}

/**
 * Matches docs/mockup.html's three states exactly: only the figure + its provenance word (e.g.
 * "~86,000 est.") takes the estimate/value colour — the trailing "from N of M" is plain text, not
 * dim, not coloured. `aUEC` only appears in the null case; once there's a real figure the number
 * plus its provenance word already reads as money without the unit spelled out.
 */
function moneyParts(earnings: Earnings): { amount: string; suffix: string; color: string } {
	if (earnings.aUECTotal == null) return { amount: "— aUEC", suffix: "", color: colors.textDim };
	const figure = formatThousands(earnings.aUECTotal);
	const from = ` from ${earnings.aUECFrom} of ${earnings.missions}`;
	if (earnings.aUECModelled)
		return { amount: `~${figure} modelled`, suffix: from, color: colors.estimate };
	if (earnings.aUECEstimated)
		return { amount: `~${figure} est.`, suffix: from, color: colors.estimate };
	return { amount: figure, suffix: from, color: colors.value };
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.xxs,
	},
	dim: {
		color: colors.textDim,
	},
});
