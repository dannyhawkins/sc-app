import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { JustReceived } from "@/lib/sidecar";
import { colors, radii, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

const VISIBLE_MS = 6_000;

/**
 * docs/DESIGN.md §5.4: the one moment the phone should *take* attention. Identity is `at` — a
 * re-render with the same `at` must not restart the flash or re-fire the haptic, so visibility is
 * tracked against the last `at` we've already shown, not just "is justReceived non-null".
 */
export function ReceivedFlash({
	justReceived,
	accent,
}: {
	justReceived: JustReceived | null;
	accent: string;
}) {
	const [visibleAt, setVisibleAt] = useState<number | null>(null);
	const shownAtRef = useRef<number | null>(null);

	useEffect(() => {
		if (!justReceived || shownAtRef.current === justReceived.at) return;
		shownAtRef.current = justReceived.at;
		setVisibleAt(justReceived.at);
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		const timer = setTimeout(() => setVisibleAt(null), VISIBLE_MS);
		return () => clearTimeout(timer);
	}, [justReceived]);

	if (!justReceived || visibleAt !== justReceived.at) return null;

	return (
		<View style={[styles.card, { backgroundColor: accent }]}>
			<View style={styles.text}>
				<Text style={[type.label, styles.onAccent]}>BLUEPRINT RECEIVED</Text>
				<Text style={[type.title, styles.onAccent]}>{justReceived.name}</Text>
			</View>
			<FlashImage image={justReceived.image} imageFallback={justReceived.imageFallback} />
		</View>
	);
}

/**
 * docs/DESIGN.md §3: blueprint images are hosted off-sidecar (subliminal.gg) — a failed load must
 * never show a broken-image box or shift the layout, it just falls back once, then disappears.
 */
function FlashImage({
	image,
	imageFallback,
}: {
	image: string | null;
	imageFallback: string | null;
}) {
	const [stage, setStage] = useState<"primary" | "fallback" | "none">(
		image ? "primary" : imageFallback ? "fallback" : "none",
	);
	if (stage === "none") return null;
	const uri = stage === "primary" ? image : imageFallback;
	if (!uri) return null;
	return (
		<Image
			source={{ uri }}
			style={styles.image}
			onError={() => setStage(stage === "primary" && imageFallback ? "fallback" : "none")}
		/>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: radii.sheet,
		padding: spacing.md,
		gap: spacing.sm,
	},
	text: {
		flexShrink: 1,
		gap: 2,
	},
	onAccent: {
		color: colors.onAccent,
	},
	image: {
		width: 64,
		height: 64,
		borderRadius: radii.card,
	},
});
