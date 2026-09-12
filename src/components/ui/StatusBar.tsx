import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatPatchLabel, formatSecondsAgo, isDatasetBehind } from "@/lib/format";
import { hostForDisplay } from "@/lib/sidecar";
import { useNow } from "@/lib/use-now";
import type { ConnectionStatus } from "@/store/connection-store";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

export interface StatusBarProps {
	conn: ConnectionStatus;
	host: string | null;
	lastSeenAt: number | null;
	accent: string;
	/** Only shown when `conn === "live"` — the right-hand side is blank otherwise (docs/DESIGN.md §3). */
	patch?: string | null;
	logEnv?: string | null;
	build?: string | null;
	/** `ship.ship`, e.g. "Cutlass Black" — shown in caption when non-null (docs/DESIGN.md §9). */
	shipName?: string | null;
	/**
	 * True in mock/demo mode (`connection-store`'s `mode: "mock"`). Overrides everything else:
	 * this app's whole premise is never misrepresenting where a number came from (docs/DESIGN.md
	 * §6), and a status bar reading "● live" over fixture data would do exactly that — a
	 * screenshot of sample data must not be indistinguishable from a screenshot of a real session.
	 * Per §1 ("never hue alone for state") the WORD changes too, not just the dot colour.
	 */
	isSampleData?: boolean;
	/** Tapping the host chip opens Connect ("change address") — docs/DESIGN.md §2. */
	onPressHostChip?: () => void;
}

const dotColor: Record<ConnectionStatus, string> = {
	"no-host": colors.textFaint,
	connecting: colors.textFaint,
	live: colors.defaultAccent, // overridden by `accent` prop below
	stale: colors.estimate,
	unreachable: colors.danger,
};

/**
 * The one always-present chrome (docs/DESIGN.md §8). Not mounted at all when `conn === "no-host"`
 * — that's the Connect screen's job, there's no host yet to report on.
 */
export function StatusBar({
	conn,
	host,
	lastSeenAt,
	accent,
	patch,
	logEnv,
	build,
	shipName,
	isSampleData,
	onPressHostChip,
}: StatusBarProps) {
	const now = useNow(1000);
	const dot = isSampleData ? colors.textFaint : conn === "live" ? accent : dotColor[conn];
	const leftText = isSampleData ? "sample data" : leftLabel(conn, host, lastSeenAt, now);
	// The dataset/env readout is real fixture content dressed as a live reading ("4.10.0 LIVE") —
	// misleading right next to "sample data", so it's hidden in that mode too.
	const rightText =
		!isSampleData && conn === "live" && patch
			? rightLabel(patch, logEnv ?? null, build ?? null, shipName)
			: null;

	return (
		<View style={styles.bar}>
			<Pressable onPress={onPressHostChip} hitSlop={8} style={styles.left}>
				<View style={[styles.dot, { backgroundColor: dot }]} />
				<Text
					style={[
						type.caption,
						styles.leftText,
						!isSampleData && conn === "stale" && { color: colors.estimate },
						!isSampleData && conn === "unreachable" && { color: colors.danger },
					]}
					numberOfLines={1}
				>
					{leftText}
				</Text>
			</Pressable>
			{rightText ? (
				<Text style={[type.caption, styles.rightText]} numberOfLines={1}>
					{rightText.text}
					{rightText.behind ? (
						<Text style={{ color: colors.estimate }}> · dataset behind</Text>
					) : null}
				</Text>
			) : null}
		</View>
	);
}

function leftLabel(
	conn: ConnectionStatus,
	host: string | null,
	lastSeenAt: number | null,
	now: number,
): string {
	const displayHost = host ? hostForDisplay(host) : "";
	switch (conn) {
		case "no-host":
			return "";
		case "connecting":
			return `${displayHost} · connecting`;
		case "live":
			return `${displayHost} · live`;
		case "stale":
			return lastSeenAt
				? `reconnecting · last seen ${formatSecondsAgo(lastSeenAt, now)}`
				: "reconnecting";
		case "unreachable":
			return `can't reach ${displayHost}`;
		default:
			return "";
	}
}

function rightLabel(
	patch: string,
	logEnv: string | null,
	build: string | null,
	shipName?: string | null,
): { text: string; behind: boolean } {
	const base = formatPatchLabel(patch, logEnv);
	const text = shipName ? `${base} · ${shipName}` : base;
	return { text, behind: isDatasetBehind(patch, build) };
}

const styles = StyleSheet.create({
	bar: {
		height: spacing.statusBarHeight,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.gutter,
		backgroundColor: colors.bg,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.hairline,
	},
	left: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xxs,
		flexShrink: 1,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	leftText: {
		flexShrink: 1,
	},
	rightText: {
		flexShrink: 0,
		marginLeft: spacing.xs,
	},
});
