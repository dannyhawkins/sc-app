import { StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { FactionStanding } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.2 idle-mode standings list. `pct` (0-100 through the current rank) is
 * CONFIRMED on `FactionStanding` — see its type comment — so this draws the real bar the mockup
 * shows, unlike `StandingBlock` (the tracked-mode bar, which has no `pct` to draw with).
 */
export function StandingRow({ standing, accent }: { standing: FactionStanding; accent: string }) {
	const atMax = standing.nextName == null;
	return (
		<View style={styles.row}>
			<View style={styles.labels}>
				<Text style={type.body} numberOfLines={1}>
					{standing.faction}
				</Text>
				<Text style={[type.caption, styles.dim]} numberOfLines={1}>
					{standing.standing}
					{atMax ? "" : ` → ${standing.nextName}`}
				</Text>
			</View>
			{atMax ? (
				<Text style={[type.num, styles.goal]}>Max rank</Text>
			) : (
				<>
					<ProgressBar progress={standing.pct / 100} color={accent} />
					<Text style={[type.num, styles.goal]}>{goalText(standing)}</Text>
				</>
			)}
		</View>
	);
}

function goalText(standing: FactionStanding): string {
	if (standing.contractsToGo != null) return `~${standing.contractsToGo} contracts to go`;
	if (standing.toGo != null) return `~${standing.toGo} rep to go`;
	return "";
}

const styles = StyleSheet.create({
	row: {
		gap: spacing.xxs,
		paddingVertical: spacing.xxs,
	},
	labels: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: spacing.sm,
	},
	dim: {
		color: colors.textDim,
	},
	goal: {
		color: colors.value,
	},
});
