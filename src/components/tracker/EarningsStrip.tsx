import { StyleSheet, Text, View } from "react-native";
import { formatThousands } from "@/lib/format";
import type { Earnings } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.2: only what the server hands over, never summed on the phone. `aUECFrom`/
 * `missions` always shown together so a total from a subset can't read as the whole session.
 *
 * NOTE: the design PROSE says `missions === 0` should read "No completions yet this session."
 * instead of the figures — but docs/mockup.html's own `EarningsStrip · missions-empty.json,
 * verbatim` fragment renders `0 contracts · 0 rep · — aUEC` for that exact fixture (`missions:
 * 0`), twice, with an explanatory caption about the dash. Went with the mockup (the more
 * concrete, deliberately-captioned artifact) over the prose; flagged the conflict back to design.
 */
export function EarningsStrip({ earnings }: { earnings: Earnings }) {
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
	if (earnings.aUECTotal == null) return { text: "— aUEC", color: colors.textDim };
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
