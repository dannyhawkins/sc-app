import { StyleSheet, Text, View } from "react-native";
import { BlueprintRow } from "@/components/tracker/BlueprintRow";
import type { Blueprint } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/** One `tab` group with a header — docs/DESIGN.md §5.1. Rows keep dataset order within the group. */
export function PoolGroup({
	tab,
	rows,
	onPressRow,
}: {
	tab: string;
	rows: Blueprint[];
	onPressRow?: (item: string) => void;
}) {
	return (
		<View style={styles.group}>
			<Text style={[type.label, styles.header]}>{tab}</Text>
			{rows.map((row) => (
				<BlueprintRow key={row.item} {...row} onPress={onPressRow} />
			))}
		</View>
	);
}

/**
 * Groups a flat blueprint list by `tab` (docs/API.md: "group by these, don't invent your own
 * taxonomy"), preserving each group's dataset order and first-seen group order.
 */
export function groupBlueprintsByTab(
	blueprints: Blueprint[],
): { tab: string; rows: Blueprint[] }[] {
	const order: string[] = [];
	const byTab = new Map<string, Blueprint[]>();
	for (const bp of blueprints) {
		if (!byTab.has(bp.tab)) {
			byTab.set(bp.tab, []);
			order.push(bp.tab);
		}
		byTab.get(bp.tab)?.push(bp);
	}
	return order.map((tab) => ({ tab, rows: byTab.get(tab) ?? [] }));
}

const styles = StyleSheet.create({
	group: {
		gap: spacing.xxs,
	},
	header: {
		marginBottom: spacing.xxs,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.hairline,
		paddingBottom: spacing.xxs,
	},
});
