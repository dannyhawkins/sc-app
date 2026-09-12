import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { formatLastSeenBanner } from "@/lib/format";
import { hostWithPort } from "@/lib/sidecar";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §5.3. Not an error page — a calm banner. The caller is responsible for drawing
 * the last frame underneath at 40% opacity (this component only draws the card itself); see the
 * Tracker screen composition.
 */
export function UnreachableBanner({
	host,
	lastSeenAt,
	hadFrame,
	onRetry,
	onChangeHost,
}: {
	host: string;
	lastSeenAt: number | null;
	hadFrame: boolean;
	onRetry: () => void;
	onChangeHost: () => void;
}) {
	return (
		<Card style={styles.card}>
			{hadFrame && lastSeenAt != null ? (
				<>
					<Text style={type.title}>Can't reach your PC</Text>
					<Text style={[type.num, styles.dim]}>Last seen {formatLastSeenBanner(lastSeenAt)}</Text>
				</>
			) : (
				// This copy deliberately keeps the port even when it's the default — the user is
				// debugging what they typed, unlike the status bar's `hostForDisplay`.
				<Text style={type.title}>Nothing answered at {hostWithPort(host)}.</Text>
			)}
			<Text style={[type.body, styles.dim, styles.body]}>
				Usually the PC went to sleep, the game closed, or the wifi dropped. Retrying every 30s.
			</Text>
			<View style={styles.actions}>
				<Pressable onPress={onRetry} style={styles.button}>
					<Text style={type.bodyStrong}>Retry now</Text>
				</Pressable>
				<Pressable onPress={onChangeHost} style={styles.button}>
					<Text style={type.bodyStrong}>Change address</Text>
				</Pressable>
			</View>
		</Card>
	);
}

const styles = StyleSheet.create({
	card: {
		gap: spacing.sm,
		borderColor: colors.danger,
	},
	dim: {
		color: colors.textDim,
	},
	body: {
		marginTop: spacing.xxs,
	},
	actions: {
		flexDirection: "row",
		gap: spacing.md,
		marginTop: spacing.xs,
	},
	button: {
		paddingVertical: spacing.xs,
	},
});
