import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
	// docs/DESIGN.md §2: at >= 700pt the Tracker becomes two columns — the mission and its pool on
	// the left, the context that hangs off it on the right. Same components either way; the only
	// difference is which container they sit in, so there is no tablet-specific rendering path to
	// keep in sync. A phone in landscape crosses this too, which is correct: the constraint is
	// width, not device class.
	const { width } = useWindowDimensions();
	// 🔑 WIDTH IS NOT ENOUGH — the aside must have something in it.
	//
	// Splitting on width alone looked right in the spec and wrong on a device: every one of the
	// aside's blocks is conditional, and on a fresh contract they are ALL empty (no other pools,
	// nothing unrecognised, no item rewards, no rep bar). The result was a dead 40% column while
	// the pool squeezed into 60% and started truncating blueprint names again — undoing #27 on
	// exactly the screens with the most room to spare.
	const hasAside =
		frame.otherPools.length > 0 ||
		frame.unrecognized.names.length > 0 ||
		frame.itemRewards.length > 0 ||
		frame.repBar !== null;
	const twoColumn = width >= 700 && hasAside;

	const main = (
		<>
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
		</>
	);

	const aside = (
		<>
			<OtherPoolsNote otherPools={frame.otherPools} />
			<UnrecognizedNotice
				names={frame.unrecognized.names}
				packActive={frame.unrecognized.packActive}
			/>
			<ItemRewardsList items={frame.itemRewards} />
			{frame.repBar ? (
				<StandingBlock repBar={frame.repBar} standing={matchedStanding} accent={accent} />
			) : null}
		</>
	);

	if (!twoColumn) {
		return (
			<View style={styles.container}>
				{main}
				{aside}
			</View>
		);
	}

	return (
		<View style={styles.columns}>
			<View style={styles.columnMain}>{main}</View>
			<View style={styles.columnAside}>{aside}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.sectionGap,
	},
	columns: {
		flexDirection: "row",
		gap: spacing.xl,
		alignItems: "flex-start",
	},
	// 3:2 — the pool is the long list and deserves the width; the aside is short blocks.
	columnMain: {
		flex: 3,
		gap: spacing.sectionGap,
	},
	columnAside: {
		flex: 2,
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
