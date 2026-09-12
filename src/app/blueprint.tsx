import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UnreachableBanner } from "@/components/tracker/UnreachableBanner";
import { formatThousands } from "@/lib/format";
import {
	type BlueprintDetail,
	fixtures,
	normalizeManufacturer,
	type RecipeGroup,
} from "@/lib/sidecar";
import { useSidecarClient } from "@/lib/use-sidecar-client";
import { useConnectionStore } from "@/store/connection-store";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §10. `recipeGroups[]` is the useful shape — the flat `ingredients[]` list is
 * skipped, per spec, in favour of the grouped/quality-curve view.
 */
export default function BlueprintSheet() {
	const { item } = useLocalSearchParams<{ item: string }>();
	const client = useSidecarClient();
	const mode = useConnectionStore((state) => state.mode);
	const [detail, setDetail] = useState<BlueprintDetail | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setDetail(null);
		setError(false);
		(async () => {
			try {
				if (mode === "mock" || !client) {
					if (!cancelled) setDetail(fixtures.blueprintDetail);
					return;
				}
				const result = await client.getBlueprintDetail(item);
				if (!cancelled) setDetail(result);
			} catch {
				if (!cancelled) setError(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [item, client, mode]);

	const manufacturer = detail ? normalizeManufacturer(detail.manufacturer) : null;

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.closeRow}>
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Text style={type.bodyStrong}>Close</Text>
				</Pressable>
			</View>
			<ScrollView contentContainerStyle={styles.content}>
				{error ? (
					<UnreachableBanner
						host=""
						lastSeenAt={null}
						hadFrame={false}
						onRetry={() => setError(false)}
						onChangeHost={() => router.back()}
					/>
				) : !detail ? null : (
					<View style={styles.body}>
						<Text style={type.title}>{detail.name}</Text>
						{manufacturer ? <Text style={[type.caption, styles.dim]}>{manufacturer}</Text> : null}
						<Text style={type.body}>{Math.round(detail.craftTimeSeconds / 60)} min craft</Text>

						{detail.stats.length > 0 ? (
							<View style={styles.section}>
								{detail.stats.map((stat) => (
									<View key={`${stat.label}:${stat.value}`} style={styles.statRow}>
										<Text style={[type.body, styles.dim]}>{stat.label}</Text>
										<Text style={type.num}>
											{stat.value}
											{stat.unit ? ` ${stat.unit}` : ""}
										</Text>
									</View>
								))}
							</View>
						) : null}

						{detail.recipeGroups.map((group) => (
							<RecipeGroupCard key={group.name} group={group} />
						))}
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function RecipeGroupCard({ group }: { group: RecipeGroup }) {
	return (
		<View style={styles.section}>
			<Text style={type.label}>
				{group.chooseOne ? "pick one: " : ""}
				{group.name}
			</Text>
			{group.materials.map((material) => (
				<Text key={material.name} style={type.body}>
					{material.name}{" "}
					{material.scu != null
						? `${material.scu} SCU`
						: material.qty != null
							? `×${material.qty}`
							: ""}
					{material.sell != null ? (
						<Text style={styles.dim}> · sells {formatThousands(material.sell)}</Text>
					) : null}
				</Text>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	closeRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		paddingHorizontal: spacing.gutter,
		paddingTop: spacing.xs,
	},
	content: {
		padding: spacing.gutter,
	},
	body: {
		gap: spacing.md,
	},
	section: {
		gap: spacing.xxs,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.hairline,
		paddingTop: spacing.sm,
	},
	statRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	dim: {
		color: colors.textDim,
	},
});
