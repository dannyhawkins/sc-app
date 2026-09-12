import { StyleSheet, Text, View } from "react-native";
import { PayoutLine } from "@/components/tracker/PayoutLine";
import { Card } from "@/components/ui/Card";
import { formatCompactNumber, formatDurationMinutes, formatDurationMs } from "@/lib/format";
import type { CompletionInfo, RepEntry } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.4. Identity is `completion.at`; the caller just renders-or-doesn't based on
 * `completion` being non-null (the server keeps it up for ~30s post-completion, then nulls it —
 * no client-side timer needed here, unlike ReceivedFlash's self-managed 6s window).
 *
 * "Pool now X/Y" reads `completion.poolProgress` — the authoritative figure FOR THIS COMPLETION
 * (docs/DESIGN.md Appendix A) — rather than the frame's top-level `totals`, which could already
 * have moved on by the time this card renders.
 */
export function CompletionCard({ completion }: { completion: CompletionInfo }) {
	const reputationLine = describeReputationGained(completion.reputationGained);
	return (
		<Card tone="surface2" style={styles.card}>
			<Text style={type.label}>
				COMPLETED
				{completion.durationMs != null ? ` · ${formatDurationMs(completion.durationMs)}` : ""}
			</Text>
			{completion.title != null ? <Text style={type.title}>{completion.title}</Text> : null}
			<PayoutLine
				aUEC={completion.aUEC}
				payout={completion.payout}
				payoutEstimated={completion.payoutEstimated}
			/>
			{reputationLine ? <Text style={[type.body, styles.owned]}>{reputationLine}</Text> : null}
			{completion.poolProgress ? (
				<Text style={[type.num, styles.dim]}>
					Pool now {completion.poolProgress.owned} / {completion.poolProgress.total}
				</Text>
			) : null}
			{completion.facts?.cd != null ? (
				<Text style={[type.caption, styles.dim]}>
					Can be taken again in {formatDurationMinutes(completion.facts.cd)}
				</Text>
			) : null}
			{completion.blueprints.length > 0 ? (
				<View>
					<Text style={[type.caption, styles.dim]}>
						{completion.blueprints.length} blueprint{completion.blueprints.length === 1 ? "" : "s"}{" "}
						received
					</Text>
					{/* No images here, per the mockup — just the names. */}
					<Text style={type.body}>{completion.blueprints.map((bp) => bp.name).join(", ")}</Text>
				</View>
			) : null}
			{completion.aUecPerHour != null ? (
				<Text style={[type.num, styles.perHour]}>
					{completion.payoutEstimated ? "~" : ""}
					{formatCompactNumber(completion.aUecPerHour)} aUEC/hr
				</Text>
			) : null}
		</Card>
	);
}

/** `RepEntry` is CONFIRMED (`missions.ts:44` — see docs/API.md); `scope` isn't part of the mockup's
 * "+120 InterSec Defense Solutions" line so it's not rendered, per docs/DESIGN.md §5.4. */
function describeReputationGained(entries: RepEntry[]): string | null {
	if (entries.length === 0) return null;
	return entries.map((entry) => `+${entry.amount} ${entry.faction}`).join(", ");
}

const styles = StyleSheet.create({
	card: {
		gap: spacing.xxs,
	},
	dim: {
		color: colors.textDim,
	},
	owned: {
		color: colors.owned,
	},
	perHour: {
		color: colors.textFaint,
		marginTop: spacing.xxs,
	},
});
