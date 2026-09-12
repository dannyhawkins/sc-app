import { StyleSheet, Text, View } from "react-native";
import { AmbiguousBanner } from "@/components/tracker/AmbiguousBanner";
import { CommunityFacts } from "@/components/tracker/CommunityFacts";
import { FactsRow } from "@/components/tracker/FactsRow";
import { ItemRewardsList } from "@/components/tracker/ItemRewardsList";
import { MissionHeader } from "@/components/tracker/MissionHeader";
import { OtherPoolsNote } from "@/components/tracker/OtherPoolsNote";
import { PayoutLine } from "@/components/tracker/PayoutLine";
import { groupBlueprintsByTab, PoolGroup } from "@/components/tracker/PoolGroup";
import { PoolProgress } from "@/components/tracker/PoolProgress";
import { StandingBlock } from "@/components/tracker/StandingBlock";
import { UnrecognizedNotice } from "@/components/tracker/UnrecognizedNotice";
import { WhereToGet } from "@/components/tracker/WhereToGet";
import type { MissionView } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.1. Composes the tracked-mode payload top to bottom, exactly in the order the
 * spec lists — that order IS the design (glance-first, detail-later).
 */
export function TrackedView({
	frame,
	accent,
	onPressBlueprint,
}: {
	frame: MissionView & { title: string };
	accent: string;
	onPressBlueprint: (item: string) => void;
}) {
	const allBlueprints = frame.pools.flatMap((pool) => pool.blueprints);
	const groups = groupBlueprintsByTab(allBlueprints);
	const matchedStanding = frame.repBar
		? frame.standings.find((s) => s.faction === frame.repBar?.faction)
		: undefined;

	return (
		<View style={styles.container}>
			<View style={styles.headerCluster}>
				<MissionHeader
					title={frame.title}
					giver={frame.giver ?? ""}
					missionType={frame.missionType ?? ""}
					illegal={frame.illegal}
					rankRequired={frame.rankRequired}
					rankRequiredName={frame.rankRequiredName}
					missionsCount={frame.missions.length}
					completed={frame.completed}
					accent={accent}
				/>
				<PayoutLine
					payout={frame.payout}
					payoutEstimated={frame.payoutEstimated}
					community={frame.community}
				/>
				<FactsRow facts={frame.facts} />
				<CommunityFacts facts={frame.community?.facts ?? null} />
				{frame.ambiguous ? null : <WhereToGet whereToGet={frame.whereToGet} />}
				{frame.ambiguous ? <AmbiguousBanner /> : null}
			</View>

			{frame.hasPool ? (
				<PoolProgress owned={frame.totals.owned} total={frame.totals.total} accent={accent} />
			) : (
				<View style={styles.noPool}>
					<Text style={[type.body, styles.dim]}>No blueprint pool for this contract.</Text>
					{frame.eventTrack ? (
						<Text style={[type.caption, styles.dim]}>
							{frame.eventTrack.name}
							{frame.eventTrack.note ? ` — ${frame.eventTrack.note}` : ""}
						</Text>
					) : null}
				</View>
			)}

			{groups.map((group) => (
				<PoolGroup
					key={group.tab}
					tab={group.tab}
					rows={group.rows}
					onPressRow={onPressBlueprint}
				/>
			))}
			<OtherPoolsNote otherPools={frame.otherPools} />
			<UnrecognizedNotice
				names={frame.unrecognized.names}
				packActive={frame.unrecognized.packActive}
			/>
			<ItemRewardsList items={frame.itemRewards} />
			{frame.repBar ? (
				<StandingBlock repBar={frame.repBar} standing={matchedStanding} accent={accent} />
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.sectionGap,
	},
	headerCluster: {
		gap: spacing.xs,
	},
	noPool: {
		gap: spacing.xxs,
	},
	dim: {
		color: colors.textDim,
	},
});
