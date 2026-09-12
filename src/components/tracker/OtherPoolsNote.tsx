import { Text } from "react-native";
import type { OtherPoolEntry } from "@/lib/sidecar";
import { type } from "@/theme/typography";

/**
 * "This title has other pools elsewhere: Stanton · 2 / 6, Pyro · 0 / 4" — docs/DESIGN.md §5.1
 * calls this "the single most useful thing the dataset knows; keep it visible, not behind a tap."
 * CONFIRMED shape (`missions.ts` `TrackedView`, see docs/DESIGN.md Appendix A): `places` is
 * plural — one entry can name more than one place sharing the same owned/total.
 */
export function OtherPoolsNote({ otherPools }: { otherPools: OtherPoolEntry[] }) {
	if (otherPools.length === 0) return null;
	const parts = otherPools.map(
		(entry) => `${entry.places.join("/")} · ${entry.owned} / ${entry.total}`,
	);
	return <Text style={type.caption}>This title has other pools elsewhere: {parts.join(", ")}</Text>;
}
