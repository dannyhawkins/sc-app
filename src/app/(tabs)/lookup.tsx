import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchField } from "@/components/lookup/SearchField";
import { SearchResultRow } from "@/components/lookup/SearchResultRow";
import { UnreachableBanner } from "@/components/tracker/UnreachableBanner";
import { StatusBar } from "@/components/ui/StatusBar";
import { fixtures, type MissionSearchResult } from "@/lib/sidecar";
import { useSidecarClient } from "@/lib/use-sidecar-client";
import { useConnectionStore } from "@/store/connection-store";
import { useAccent } from "@/theme/accent";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

/**
 * docs/DESIGN.md §10 — "the dev-loop screen": works with no game log at all, since it's driven
 * entirely by /api/mission-search + /api/mission-preview, both bundled-dataset endpoints.
 */
export default function LookupScreen() {
	const client = useSidecarClient();
	const mode = useConnectionStore((state) => state.mode);
	const host = useConnectionStore((state) => state.host);
	// docs/DESIGN.md §3: "one state machine, one status bar on every screen". Without it, the
	// connection can go stale while you sit on this tab with nothing on screen saying so.
	const conn = useConnectionStore((state) => state.conn);
	const lastSeenAt = useConnectionStore((state) => state.lastSeenAt);
	const frame = useConnectionStore((state) => state.frame);
	const { accent } = useAccent();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<MissionSearchResult[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (query.trim().length < MIN_CHARS) {
			setResults(null);
			setError(false);
			return;
		}
		setLoading(true);
		debounceRef.current = setTimeout(async () => {
			try {
				if (mode === "mock" || !client) {
					// The bundled fixture is static — filter it locally so mock mode still feels alive.
					const q = query.trim().toLowerCase();
					setResults(
						fixtures.missionSearch.missions.filter((m) => m.title.toLowerCase().includes(q)),
					);
				} else {
					const response = await client.searchMissions(query.trim());
					setResults(response.missions);
				}
				setError(false);
			} catch {
				setError(true);
				setResults(null);
			} finally {
				setLoading(false);
			}
		}, DEBOUNCE_MS);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, client, mode]);

	return (
		<SafeAreaView style={styles.screen} edges={["top"]}>
			<StatusBar
				conn={conn}
				isSampleData={mode === "mock"}
				host={host}
				lastSeenAt={lastSeenAt}
				accent={accent}
				patch={frame?.patch}
				logEnv={frame?.logEnv}
				build={frame?.build}
				shipName={frame?.ship.ship}
				onPressHostChip={() => router.push("/connect")}
			/>
			<View style={styles.content}>
				<SearchField value={query} onChangeText={setQuery} />
				{renderBody()}
			</View>
		</SafeAreaView>
	);

	function renderBody() {
		if (error) {
			return (
				<UnreachableBanner
					host={host ?? ""}
					lastSeenAt={null}
					hadFrame={false}
					onRetry={() => setQuery((q) => `${q}`)}
					onChangeHost={() => router.push("/connect")}
				/>
			);
		}
		if (query.trim().length < MIN_CHARS) {
			// NOT the search field's own placeholder repeated back (it used to be, word for word).
			// This is the one thing the phone does better than the overlay — looking a contract up
			// mid-session without alt-tabbing, and without having accepted it — so say that instead.
			return (
				<Text style={[type.body, styles.centeredDim]}>
					Look up any contract's blueprint pool — including ones you haven't accepted.
				</Text>
			);
		}
		if (results === null) return null;
		if (results.length === 0) {
			return <Text style={[type.body, styles.centeredDim]}>Nothing called "{query.trim()}".</Text>;
		}
		return (
			<FlatList
				data={results}
				keyExtractor={(item) => item.key}
				style={loading ? styles.loadingDim : undefined}
				renderItem={({ item }) => (
					<SearchResultRow
						title={item.title}
						giver={item.giver}
						variants={item.variants}
						hasPool={item.hasPool}
						accent={accent}
						onPress={() => router.push({ pathname: "/preview", params: { title: item.title } })}
					/>
				)}
			/>
		);
	}
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		flex: 1,
		padding: spacing.gutter,
		gap: spacing.md,
	},
	centeredDim: {
		textAlign: "center",
		marginTop: spacing.xxl,
		color: colors.textDim,
	},
	loadingDim: {
		opacity: 0.5,
	},
});
