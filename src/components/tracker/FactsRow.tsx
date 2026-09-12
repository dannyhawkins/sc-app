import { Text } from "react-native";
import { formatDurationMinutes } from "@/lib/format";
import type { MissionFacts } from "@/lib/sidecar";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §8: `dur` → "1h 36m run", `diff` → "5.8 / 7" (CIG's 1-7 scale, plain text, never
 * a meter — that's CommunityFacts' job on the unrelated 1-5 number), `noRetry` → "no retry",
 * `cd` → "retake after 45m". Every field is independently optional; absent parts are omitted,
 * never defaulted to a false/zero claim (docs/API.md: `noRetry`'s absence means "not stated").
 */
export function FactsRow({ facts }: { facts: MissionFacts | null }) {
	if (!facts) return null;
	const parts: string[] = [];
	if (facts.dur != null) parts.push(`${formatDurationMinutes(facts.dur)} run`);
	if (facts.diff != null) parts.push(`${facts.diff} / 7`);
	if (facts.noRetry) parts.push("no retry");
	if (facts.cd != null) parts.push(`retake after ${formatDurationMinutes(facts.cd)}`);
	if (parts.length === 0) return null;
	return <Text style={type.caption}>{parts.join(" · ")}</Text>;
}
