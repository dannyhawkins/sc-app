import { Text } from "react-native";
import { resolvePayoutLine } from "@/lib/format";
import type { CommunityInfo, PayoutLike } from "@/lib/sidecar";
import { colors } from "@/theme/tokens";
import { type } from "@/theme/typography";

const toneColor = {
	value: colors.value,
	estimate: colors.estimate,
	dim: colors.textDim,
} as const;

/** docs/DESIGN.md §6.1 — the money line, exact precedence. Shared by Tracker, sheets, CompletionCard. */
export function PayoutLine({
	aUEC,
	payout,
	payoutEstimated,
	community,
}: {
	aUEC?: number | null;
	payout: PayoutLike | null;
	payoutEstimated: boolean;
	community?: CommunityInfo | null;
}) {
	const resolved = resolvePayoutLine({ aUEC, payout, payoutEstimated, community });
	return <Text style={[type.num, { color: toneColor[resolved.tone] }]}>{resolved.text}</Text>;
}
