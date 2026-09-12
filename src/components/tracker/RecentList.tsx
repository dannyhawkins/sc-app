import { StyleSheet, Text, View } from "react-native";
import { formatRelativeOrClock, formatThousands } from "@/lib/format";
import type { RecentBlueprintEntry, RecentMissionEntry } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

const MAX_ROWS = 5;

/**
 * docs/DESIGN.md §5.2: newest first, 5 each, no images. Mission `aUEC` is labelled plainly —
 * "it *was* logged live, that is the one place the word is earned" (§6.1's honesty ranking).
 */
export function RecentList({
	recentMissions,
	recentBlueprints,
	timeRelative,
}: {
	recentMissions: RecentMissionEntry[];
	recentBlueprints: RecentBlueprintEntry[];
	timeRelative: boolean;
}) {
	if (recentMissions.length === 0 && recentBlueprints.length === 0) return null;
	return (
		<View style={styles.container}>
			{recentMissions.length > 0 ? (
				<View style={styles.section}>
					<Text style={type.label}>RECENT MISSIONS</Text>
					{recentMissions.slice(0, MAX_ROWS).map((mission) => (
						<View key={`${mission.title}-${mission.at}`} style={styles.row}>
							<Text style={type.body} numberOfLines={1}>
								{mission.title}
								{mission.aUEC != null ? (
									<Text style={{ color: colors.value }}>
										{" "}
										· {formatThousands(mission.aUEC)} aUEC
									</Text>
								) : null}
							</Text>
							<Text style={[type.caption, styles.time]}>
								{formatRelativeOrClock(mission.at, timeRelative)}
							</Text>
						</View>
					))}
				</View>
			) : null}
			{recentBlueprints.length > 0 ? (
				<View style={styles.section}>
					<Text style={type.label}>RECENT BLUEPRINTS</Text>
					{recentBlueprints.slice(0, MAX_ROWS).map((bp) => (
						<View key={`${bp.name}-${bp.at}`} style={styles.row}>
							<Text style={type.body} numberOfLines={1}>
								{bp.name}
							</Text>
							<Text style={[type.caption, styles.time]}>
								{formatRelativeOrClock(bp.at, timeRelative)}
							</Text>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.md,
	},
	section: {
		gap: spacing.xxs,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: spacing.sm,
		minHeight: 28,
	},
	time: {
		color: colors.textFaint,
		flexShrink: 0,
	},
});
