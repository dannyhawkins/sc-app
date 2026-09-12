import { StyleSheet, Text, View } from "react-native";
import type { CommunityInfo } from "@/lib/sidecar";
import { spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

const SEGMENTS = 5;

/**
 * The player-reported difficulty, 1-5 — the ONLY place this number gets a meter (`facts.diff`,
 * CIG's unrelated 1-7 number, is always plain text). `community.facts` is null most of the time
 * (offline, cache miss, nobody's reported) and that's the everyday case, not an error — this
 * renders nothing at all then, no placeholder, no spinner (docs/DESIGN.md §3, §5.1).
 */
export function CommunityFacts({ facts }: { facts: CommunityInfo["facts"] }) {
	if (!facts) return null;
	const filled = Math.max(0, Math.min(SEGMENTS, Math.round(facts.difficulty)));
	return (
		<View style={styles.row}>
			<Text style={type.num}>
				{Array.from({ length: SEGMENTS }, (_, i) => (i < filled ? "▰" : "▱")).join("")}
			</Text>
			<Text style={type.caption}>
				{facts.difficulty} players say · {facts.difficultyAnswers} reports
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
});
