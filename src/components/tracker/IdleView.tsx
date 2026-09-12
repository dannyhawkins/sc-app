import { StyleSheet, Text, View } from "react-native";
import { ClosestPoolCard } from "@/components/tracker/ClosestPoolCard";
import { EarningsStrip } from "@/components/tracker/EarningsStrip";
import { EmptyIdle } from "@/components/tracker/EmptyIdle";
import { RecentList } from "@/components/tracker/RecentList";
import { StandingRow } from "@/components/tracker/StandingRow";
import { formatThousands } from "@/lib/format";
import type { MissionView } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/** docs/DESIGN.md §5.2. `title === null` — nothing tracked, so lead with "what do I go do next". */
export function IdleView({ frame, accent }: { frame: MissionView; accent: string }) {
	const isFirstRun =
		frame.closestPools.length === 0 &&
		frame.standings.length === 0 &&
		frame.recentMissions.length === 0 &&
		frame.recentBlueprints.length === 0 &&
		frame.collectedTotal === 0;

	if (isFirstRun) {
		return (
			<EmptyIdle
				collectedTotal={frame.collectedTotal}
				appVersion={frame.appVersion}
				patch={frame.patch}
				logEnv={frame.logEnv}
			/>
		);
	}

	const showCollectedTotal = frame.collectedTotal > 0 && frame.closestPools.length === 0;

	return (
		<View style={styles.container}>
			{showCollectedTotal ? (
				<View style={styles.collectedTotal}>
					<Text style={[type.display, { color: colors.value }]}>
						{formatThousands(frame.collectedTotal)}
					</Text>
					<Text style={[type.caption, styles.dim]}>blueprints collected</Text>
				</View>
			) : frame.closestPools.length > 0 ? (
				<View style={styles.section}>
					<Text style={type.label}>CLOSEST TO DONE</Text>
					{frame.closestPools.slice(0, 4).map((pool) => (
						<ClosestPoolCard key={pool.poolUuid} pool={pool} accent={accent} />
					))}
				</View>
			) : null}

			{frame.standings.length > 0 ? (
				<View style={styles.section}>
					<Text style={type.label}>STANDING</Text>
					{frame.standings.slice(0, 4).map((standing) => (
						<StandingRow key={standing.faction} standing={standing} accent={accent} />
					))}
				</View>
			) : null}

			<EarningsStrip earnings={frame.earnings} />

			<RecentList
				recentMissions={frame.recentMissions}
				recentBlueprints={frame.recentBlueprints}
				timeRelative={frame.prefs.timeRelative}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.sectionGap,
	},
	section: {
		gap: spacing.sm,
	},
	collectedTotal: {
		alignItems: "center",
		gap: spacing.xxs,
	},
	dim: {
		color: colors.textDim,
	},
});
