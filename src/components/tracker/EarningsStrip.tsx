import { StyleSheet, Text, View } from "react-native";
import { formatThousands } from "@/lib/format";
import type { Earnings } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.2: only what the server hands over, never summed on the phone. `aUECFrom`/
 * `missions` always shown together so a total from a subset can't read as the whole session.
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

	const moneyPart = moneyText(earnings);

	return (
		<View style={styles.container}>
			<Text style={type.label}>THIS SESSION</Text>
			<Text style={type.caption}>
				<Text style={styles.dim}>
					{earnings.missions} contract{earnings.missions === 1 ? "" : "s"} ·{" "}
					{formatThousands(earnings.repTotal)} rep ·{" "}
				</Text>
				<Text style={{ color: moneyPart.color }}>{moneyPart.text}</Text>
			</Text>
		</View>
	);
}

function moneyText(earnings: Earnings): { text: string; color: string } {
	if (earnings.aUECTotal == null) return { text: "—", color: colors.textDim };
	const figure = formatThousands(earnings.aUECTotal);
	const from = `from ${earnings.aUECFrom} of ${earnings.missions}`;
	if (earnings.aUECModelled)
		return { text: `${figure} aUEC ${from} · modelled`, color: colors.estimate };
	if (earnings.aUECEstimated)
		return { text: `~${figure} aUEC ${from} · est.`, color: colors.estimate };
	return { text: `${figure} aUEC ${from}`, color: colors.value };
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.xxs,
	},
	dim: {
		color: colors.textDim,
	},
});
