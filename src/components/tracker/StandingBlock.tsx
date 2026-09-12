import { StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { deriveRepBarPct } from "@/lib/format";
import type { FactionStanding, RepBar } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.1/§6.4: contracts, not rep. `repBar` (the TRACKED contract's bar) carries the
 * rank labels (`standing`/`nextName`/`max`) but no `contractsToGo` figure directly — that comes
 * from `standing`, the matching `standings[]` entry (by `faction`), which may be undefined if
 * nothing matched, in which case the fallback is `~(nextMin - estimate) rep to go`.
 *
 * `noData`/`offTrack` are CONFIRMED fields on `RepBar` (docs/DESIGN.md Appendix A) — an earlier
 * draft of this component dropped them after reading a `RepBar` transcription that omitted them;
 * Appendix A is the corrected, authoritative one.
 */
export function StandingBlock({
	repBar,
	standing,
	accent,
}: {
	repBar: RepBar;
	standing?: FactionStanding;
	accent: string;
}) {
	const pct = deriveRepBarPct(repBar);

	return (
		<View style={styles.container}>
			<Text style={type.label}>STANDING · {repBar.faction}</Text>
			{repBar.noData ? (
				<Text style={[type.caption, styles.dim]}>
					Standing estimate unavailable — no completions seen yet.
				</Text>
			) : (
				<>
					<View style={styles.barRow}>
						<Text style={type.body} numberOfLines={1}>
							{repBar.standing}
						</Text>
						{pct != null ? (
							<View style={styles.bar}>
								<ProgressBar progress={pct} color={accent} />
							</View>
						) : null}
						<Text style={[type.body, styles.dim]} numberOfLines={1}>
							{repBar.max ? "Max rank" : repBar.nextName}
						</Text>
					</View>
					<Text style={[type.caption, styles.dim]}>{progressLine(repBar, standing)}</Text>
				</>
			)}
			{repBar.offTrack ? (
				<Text style={[type.caption, styles.amber]}>This contract won't move this bar.</Text>
			) : null}
			{repBar.nextRewards.length > 0 ? (
				<Text style={[type.caption, styles.dim]}>Unlocks: {repBar.nextRewards.join(", ")}</Text>
			) : null}
		</View>
	);
}

function progressLine(repBar: RepBar, standing?: FactionStanding): string {
	if (repBar.max) return "Max rank";
	if (standing?.contractsToGo != null)
		return `~about ${standing.contractsToGo} contracts to ${repBar.nextName} · est.`;
	if (repBar.nextMin != null) return `~${repBar.nextMin - repBar.estimate} rep to go · est.`;
	return "Standing estimate unavailable — no completions seen yet.";
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.xxs,
	},
	barRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
	bar: {
		flex: 1,
	},
	dim: {
		color: colors.textDim,
	},
	amber: {
		color: colors.estimate,
	},
});
