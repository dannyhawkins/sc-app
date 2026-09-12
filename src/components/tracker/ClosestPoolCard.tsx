import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ClosestPool } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.2. `ClosestPool` is CONFIRMED (`sc-overlay/src/missions.ts:69` — see
 * docs/API.md), so unlike an earlier draft of this component, there's no need to parse it
 * defensively field-by-field. `payMin` (and the other pay/dur/rep/cooldown fields the source
 * carries) is deliberately never read here: "Do NOT render payMin/durMin/rep/cooldown here — the
 * per-hour figure belongs to the session tracker, not to 'closest to done'."
 */
export function ClosestPoolCard({ pool, accent }: { pool: ClosestPool; accent: string }) {
	return (
		<Card style={styles.card}>
			<View style={styles.headerRow}>
				<Text style={type.bodyStrong} numberOfLines={1}>
					{pool.poolName}
				</Text>
				<Text style={[type.num, styles.count]}>
					{pool.owned} / {pool.total}
				</Text>
			</View>
			<ProgressBar progress={pool.total > 0 ? pool.owned / pool.total : 0} color={accent} />
			{pool.missing.length > 0 ? (
				<Text style={[type.caption, styles.dim]}>Missing: {pool.missing.join(", ")}</Text>
			) : null}
			{pool.missionTitles.length > 0 ? (
				<Text style={[type.caption, styles.dim]}>
					via {pool.missionTitles[0]}
					{pool.missionTitles.length > 1 ? `  +${pool.missionTitles.length - 1} titles` : ""}
				</Text>
			) : null}
		</Card>
	);
}

const styles = StyleSheet.create({
	card: {
		gap: spacing.xs,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
		gap: spacing.sm,
	},
	count: {
		color: colors.value,
	},
	dim: {
		color: colors.textDim,
	},
});
