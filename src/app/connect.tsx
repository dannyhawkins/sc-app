import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HostForm } from "@/components/connect/HostForm";
import { loadRecentHosts, type RecentHost } from "@/lib/sidecar";
import { useConnectionStore } from "@/store/connection-store";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §4. Both the cold-start screen (no host saved, the tab layout below redirects
 * here) and the "change address" screen (pushed from the StatusBar's host chip).
 */
export default function ConnectScreen() {
	const setHost = useConnectionStore((state) => state.setHost);
	const host = useConnectionStore((state) => state.host);
	const setMode = useConnectionStore((state) => state.setMode);
	const [recents, setRecents] = useState<RecentHost[]>([]);

	useEffect(() => {
		loadRecentHosts().then(setRecents);
	}, []);

	function handleConnect(nextHost: string) {
		void setHost(nextHost);
		if (router.canGoBack()) router.back();
		else router.replace("/(tabs)");
	}

	return (
		<SafeAreaView style={styles.screen}>
			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				<Text style={[type.label, styles.brand]}>SC OVERLAY · COMPANION</Text>
				<HostForm initial={host ?? undefined} recents={recents} onConnect={handleConnect} />
				<Pressable
					onPress={() => {
						setMode("mock", "tracked");
						if (router.canGoBack()) router.back();
						else router.replace("/(tabs)");
					}}
					style={styles.sampleLink}
				>
					<Text style={[type.caption, styles.sampleLinkText]}>Or preview with sample data</Text>
				</Pressable>
				<Pressable
					onPress={() => {
						setMode("mock", "idle");
						if (router.canGoBack()) router.back();
						else router.replace("/(tabs)");
					}}
					style={styles.sampleLink}
				>
					<Text style={[type.caption, styles.sampleLinkText]}>Or preview the idle state</Text>
				</Pressable>
			</ScrollView>
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
		gap: spacing.xl,
	},
	brand: {
		textAlign: "center",
		marginTop: spacing.xl,
	},
	sampleLink: {
		alignSelf: "center",
		marginTop: spacing.md,
		padding: spacing.xs,
	},
	sampleLinkText: {
		color: colors.textFaint,
		textDecorationLine: "underline",
	},
});
