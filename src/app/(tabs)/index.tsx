import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { useCallback, useEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CompletionCard } from "@/components/tracker/CompletionCard";
import { IdleView } from "@/components/tracker/IdleView";
import { ReceivedFlash } from "@/components/tracker/ReceivedFlash";
import { Skeleton } from "@/components/tracker/Skeleton";
import { TrackedView } from "@/components/tracker/TrackedView";
import { UnreachableBanner } from "@/components/tracker/UnreachableBanner";
import { StatusBar } from "@/components/ui/StatusBar";
import { useConnectionStore } from "@/store/connection-store";
import { AccentProvider, useAccent } from "@/theme/accent";
import { colors, spacing } from "@/theme/tokens";

const KEEP_AWAKE_TAG = "tracker";

export default function TrackerScreen() {
	const conn = useConnectionStore((state) => state.conn);
	const mode = useConnectionStore((state) => state.mode);
	const host = useConnectionStore((state) => state.host);
	const lastSeenAt = useConnectionStore((state) => state.lastSeenAt);
	const hadFrame = useConnectionStore((state) => state.hadFrame);
	const frame = useConnectionStore((state) => state.frame);
	const probing = useConnectionStore((state) => state.probing);
	const retryNow = useConnectionStore((state) => state.retryNow);

	// docs/DESIGN.md §1: "Screen stays awake while the Tracker is showing and the connection is
	// live." A propped-up phone that locks after 30s defeats the entire point of this screen.
	useEffect(() => {
		if (conn === "live") {
			// Best-effort: web's WakeLock API (what expo-keep-awake shells out to there) refuses to
			// grant a lock when the page isn't visible/focused, and can be denied for other reasons
			// too (low-power mode, unsupported browser) — "screen stays awake" is a nicety, not
			// something worth an uncaught rejection over.
			activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
			return () => {
				deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
			};
		}
	}, [conn]);

	const onRefresh = useCallback(() => {
		void retryNow();
	}, [retryNow]);

	return (
		<AccentProvider accent={frame?.ship.accent ?? null} accentRgb={frame?.ship.accentRgb ?? null}>
			<TrackerBody
				conn={conn}
				isSampleData={mode === "mock"}
				host={host}
				lastSeenAt={lastSeenAt}
				hadFrame={hadFrame}
				frame={frame}
				refreshing={probing && frame != null}
				onRefresh={onRefresh}
			/>
		</AccentProvider>
	);
}

function TrackerBody({
	conn,
	isSampleData,
	host,
	lastSeenAt,
	hadFrame,
	frame,
	refreshing,
	onRefresh,
}: {
	conn: ReturnType<typeof useConnectionStore.getState>["conn"];
	isSampleData: boolean;
	host: string | null;
	lastSeenAt: number | null;
	hadFrame: boolean;
	frame: ReturnType<typeof useConnectionStore.getState>["frame"];
	refreshing: boolean;
	onRefresh: () => void;
}) {
	const { accent } = useAccent();
	const retryNow = useConnectionStore((state) => state.retryNow);

	return (
		<SafeAreaView style={styles.screen} edges={["top"]}>
			<StatusBar
				conn={conn}
				isSampleData={isSampleData}
				host={host}
				lastSeenAt={lastSeenAt}
				accent={accent}
				patch={frame?.patch}
				logEnv={frame?.logEnv}
				build={frame?.build}
				shipName={frame?.ship.ship}
				onPressHostChip={() => router.push("/connect")}
			/>
			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
				}
			>
				{!frame ? (
					<Skeleton />
				) : (
					<View style={conn === "unreachable" ? styles.dimmed : undefined}>
						<ReceivedFlash justReceived={frame.justReceived} accent={accent} />
						{frame.completion ? <CompletionCard completion={frame.completion} /> : null}
						{frame.title !== null ? (
							<TrackedView
								frame={frame as typeof frame & { title: string }}
								accent={accent}
								onPressBlueprint={(item) =>
									router.push({ pathname: "/blueprint", params: { item } })
								}
							/>
						) : (
							<IdleView frame={frame} accent={accent} />
						)}
					</View>
				)}
			</ScrollView>
			{conn === "unreachable" && host ? (
				<View style={styles.overlay} pointerEvents="box-none">
					<UnreachableBanner
						host={host}
						lastSeenAt={lastSeenAt}
						hadFrame={hadFrame}
						onRetry={() => void retryNow()}
						onChangeHost={() => router.push("/connect")}
					/>
				</View>
			) : null}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		padding: spacing.gutter,
		gap: spacing.sectionGap,
	},
	dimmed: {
		opacity: 0.4,
	},
	overlay: {
		position: "absolute",
		left: spacing.gutter,
		right: spacing.gutter,
		bottom: spacing.gutter,
	},
});
