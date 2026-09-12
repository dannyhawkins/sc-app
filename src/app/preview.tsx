import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommunityFacts } from "@/components/tracker/CommunityFacts";
import { FactsRow } from "@/components/tracker/FactsRow";
import { MissionHeader } from "@/components/tracker/MissionHeader";
import { OtherPoolsNote } from "@/components/tracker/OtherPoolsNote";
import { PayoutLine } from "@/components/tracker/PayoutLine";
import { groupBlueprintsByTab, PoolGroup } from "@/components/tracker/PoolGroup";
import { PoolProgress } from "@/components/tracker/PoolProgress";
import { UnreachableBanner } from "@/components/tracker/UnreachableBanner";
import { WhereToGet } from "@/components/tracker/WhereToGet";
import { fixtures, type MissionPreview } from "@/lib/sidecar";
import { useSidecarClient } from "@/lib/use-sidecar-client";
import { useConnectionStore } from "@/store/connection-store";
import { useAccent } from "@/theme/accent";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §10: the same components as a tracked mission, minus the standing block —
 * `owned`/`total` here are the player's real progress against this pool, so PoolProgress is
 * meaningful even for a contract that isn't currently accepted.
 */
export default function PreviewSheet() {
	const { title } = useLocalSearchParams<{ title: string }>();
	const client = useSidecarClient();
	const mode = useConnectionStore((state) => state.mode);
	const { accent } = useAccent();
	const [preview, setPreview] = useState<MissionPreview | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setPreview(null);
		setError(false);
		(async () => {
			try {
				if (mode === "mock" || !client) {
					if (!cancelled) setPreview(fixtures.missionPreview);
					return;
				}
				const result = await client.getMissionPreview(title);
				if (!cancelled) setPreview(result);
			} catch {
				if (!cancelled) setError(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [title, client, mode]);

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
				) : !preview ? null : (
					<PreviewBody preview={preview} accent={accent} />
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function PreviewBody({ preview, accent }: { preview: MissionPreview; accent: string }) {
	const groups = groupBlueprintsByTab(preview.pools.flatMap((pool) => pool.blueprints));
	return (
		<View style={styles.body}>
			<MissionHeader
				title={preview.title}
				giver={preview.giver}
				missionType={preview.missionType}
				illegal={preview.illegal}
				rankRequired={preview.rankRequired}
				rankRequiredName={preview.rankRequiredName}
				accent={accent}
			/>
			<PayoutLine
				payout={preview.payout}
				payoutEstimated={preview.payoutEstimated}
				community={preview.community}
			/>
			<FactsRow facts={preview.facts} />
			<CommunityFacts facts={preview.community?.facts ?? null} />
			<WhereToGet whereToGet={preview.whereToGet} />
			{preview.hasPool ? (
				<PoolProgress owned={preview.owned} total={preview.total} accent={accent} />
			) : (
				<Text style={[type.body, styles.dim]}>No blueprint pool for this contract.</Text>
			)}
			{groups.map((group) => (
				<PoolGroup
					key={group.tab}
					tab={group.tab}
					rows={group.rows}
					onPressRow={(item) => router.push({ pathname: "/blueprint", params: { item } })}
				/>
			))}
			<OtherPoolsNote otherPools={preview.otherPools} />
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
	dim: {
		color: colors.textDim,
	},
});
