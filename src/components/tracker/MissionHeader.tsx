import { StyleSheet, Text, View } from "react-native";
import { Chip } from "@/components/ui/Chip";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

export interface MissionHeaderProps {
	title: string;
	giver: string;
	missionType: string;
	illegal: boolean;
	rankRequired: number | null;
	rankRequiredName: string | null;
	/** `missions.length` — shown as a chip only when > 1 (docs/DESIGN.md §5.1). */
	missionsCount?: number;
	/** `completed: true` — title gets a green DONE chip (docs/DESIGN.md §5.1's "tracked, completed" state). */
	completed?: boolean;
	accent: string;
}

/** docs/DESIGN.md §5.1/§8. Shared between the Tracker (tracked mode) and PreviewSheet. */
export function MissionHeader({
	title,
	giver,
	missionType,
	illegal,
	rankRequired,
	rankRequiredName,
	missionsCount,
	completed,
	accent,
}: MissionHeaderProps) {
	return (
		<View style={styles.container}>
			<Text style={[type.caption, styles.subline]}>
				{giver} · {missionType}
			</Text>
			<View style={styles.titleRow}>
				<View style={[styles.accentBar, { backgroundColor: accent }]} />
				<Text style={type.title}>{title}</Text>
				{completed ? <Chip label="DONE" tone="owned" /> : null}
			</View>
			{illegal || rankRequired !== null || (missionsCount ?? 0) > 1 ? (
				<View style={styles.chips}>
					{/* `illegal: false` says nothing — the field promises illegality, never legality. */}
					{illegal ? <Chip label="CRIMESTAT" tone="danger" /> : null}
					{rankRequired !== null ? (
						<Chip label={`needs ${rankRequiredName ?? rankRequired}`} tone="dim" />
					) : null}
					{(missionsCount ?? 0) > 1 ? (
						<Chip label={`${missionsCount} accepted`} tone="dim" />
					) : null}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.xxs,
	},
	subline: {
		color: colors.textDim,
	},
	titleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
	accentBar: {
		width: 3,
		height: 20,
		borderRadius: 2,
	},
	chips: {
		flexDirection: "row",
		gap: spacing.xs,
		marginTop: spacing.xxs,
		flexWrap: "wrap",
	},
});
