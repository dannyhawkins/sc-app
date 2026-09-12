import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

/** docs/DESIGN.md §5.2 "idle, first run" / "idle, sidecar has no log" states. */
export function EmptyIdle({
	appVersion,
	patch,
	logEnv,
}: {
	collectedTotal: number;
	appVersion: string;
	patch: string;
	logEnv: string | null;
}) {
	const datasetVersion = patch.split("-")[0];
	return (
		<View style={styles.container}>
			<Text style={[type.title, styles.center]}>Nothing tracked.</Text>
			<Text style={[type.body, styles.center, styles.dim]}>
				Accept a contract with a blueprint pool and it'll show up here.
			</Text>
			{logEnv === null ? (
				<Text style={[type.caption, styles.center, styles.dim]}>
					No game log seen yet — is Star Citizen running?
				</Text>
			) : null}
			<Text style={[type.caption, styles.center, styles.faint]}>
				SC Overlay {appVersion} · dataset {datasetVersion}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
		paddingVertical: spacing.xxl,
	},
	center: {
		textAlign: "center",
	},
	dim: {
		color: colors.textDim,
	},
	faint: {
		color: colors.textFaint,
	},
});
