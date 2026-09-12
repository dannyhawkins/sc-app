import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HostForm } from "@/components/connect/HostForm";
import { loadRecentHosts, type RecentHost } from "@/lib/sidecar";
import { useConnectionStore } from "@/store/connection-store";
import { useAccent } from "@/theme/accent";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §4. Both the cold-start screen (no host saved, the tab layout below redirects
 * here) and the "change address" screen (pushed from the StatusBar's host chip).
 *
 * Layout is top-anchored on purpose, not inherited. It is NOT vertically centred: the block grows
 * as the error line and the recents list appear, and a centred block that jumps as it grows reads
 * as unstable. Instead the empty space gets a job at both ends — the wordmark and the one-line
 * description above, the privacy posture pinned below.
 */
export default function ConnectScreen() {
	const setHost = useConnectionStore((state) => state.setHost);
	const host = useConnectionStore((state) => state.host);
	const setMode = useConnectionStore((state) => state.setMode);
	const { accent } = useAccent();
	const [recents, setRecents] = useState<RecentHost[]>([]);

	useEffect(() => {
		loadRecentHosts().then(setRecents);
	}, []);

	function leave() {
		if (router.canGoBack()) router.back();
		else router.replace("/(tabs)");
	}

	function handleConnect(nextHost: string) {
		void setHost(nextHost);
		leave();
	}

	return (
		<SafeAreaView style={styles.screen}>
			<KeyboardAvoidingView
				style={styles.fill}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
					{/* The accent left bar is the same gesture as the mission title's on the Tracker —
					    the cheapest way for the two screens to read as one product. */}
					<View style={styles.wordmarkRow}>
						<View style={[styles.accentBar, { backgroundColor: accent }]} />
						<View>
							<Text style={type.label}>SC OVERLAY</Text>
							<Text style={[type.body, styles.companion]}>Companion</Text>
						</View>
					</View>
					{/* The only place the app says what it is. It belongs in front of someone who is
					    staring at this screen wondering where to find an IP address. */}
					<Text style={[type.caption, styles.tagline]}>
						Your PC's mission tracker, on the phone next to it.
					</Text>

					<HostForm initial={host ?? undefined} recents={recents} onConnect={handleConnect} />

					<View style={styles.sampleLinks}>
						<Pressable
							onPress={() => {
								setMode("mock", "tracked");
								leave();
							}}
							style={styles.sampleLink}
						>
							<Text style={[type.caption, styles.sampleLinkText]}>Or preview with sample data</Text>
						</Pressable>
						<Pressable
							onPress={() => {
								setMode("mock", "idle");
								leave();
							}}
							style={styles.sampleLink}
						>
							<Text style={[type.caption, styles.sampleLinkText]}>Or preview the idle state</Text>
						</Pressable>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
			{/* Outside the KeyboardAvoidingView on purpose — the keyboard may cover it, which is fine.
			    It answers the question this screen provokes: it is the one screen that asks for a
			    network address, which is exactly where someone wonders what the app does with it. */}
			<Text style={[type.caption, styles.footer]}>
				Read-only. Talks only to your PC, only on this wifi.
			</Text>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	fill: {
		flex: 1,
	},
	content: {
		padding: spacing.gutter,
		gap: spacing.lg,
	},
	wordmarkRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		marginTop: spacing.xl,
	},
	accentBar: {
		width: 3,
		height: 32,
		borderRadius: 2,
	},
	companion: {
		color: colors.textDim,
	},
	tagline: {
		color: colors.textDim,
		marginTop: -spacing.sm,
	},
	sampleLinks: {
		gap: spacing.xs,
	},
	sampleLink: {
		alignSelf: "flex-start",
		paddingVertical: spacing.xxs,
	},
	sampleLinkText: {
		color: colors.textFaint,
		textDecorationLine: "underline",
	},
	footer: {
		color: colors.textFaint,
		paddingHorizontal: spacing.gutter,
		paddingBottom: spacing.md,
	},
});
