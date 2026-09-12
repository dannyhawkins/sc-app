import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatRelativeOrClock } from "@/lib/format";
import type { RecentHost } from "@/lib/sidecar";
import { hostForDisplay, hostWithPort, normalizeHostInput, testSidecarHost } from "@/lib/sidecar";
import { useAccent } from "@/theme/accent";
import { colors, radii, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

type FieldStatus =
	| { kind: "idle" }
	| { kind: "testing" }
	| { kind: "refused"; host: string }
	| { kind: "not-sidecar" }
	| { kind: "forbidden" };

export interface HostFormProps {
	initial?: string;
	recents: RecentHost[];
	/** Called only after a successful `testSidecarHost` probe — the field's job stops there. */
	onConnect: (host: string) => void;
}

/**
 * docs/DESIGN.md §4. Deliberately boring: one field, one button, a recents list. The field
 * accepts a bare host, `host:port`, or a whole pasted `http://host:port/…` URL (SC Overlay's own
 * settings screen has a copy button for that) — normalizeHostInput() strips it down before this
 * ever reaches the network.
 */
export function HostForm({ initial, recents, onConnect }: HostFormProps) {
	const [value, setValue] = useState(initial ?? "");
	const [status, setStatus] = useState<FieldStatus>({ kind: "idle" });

	const normalized = useMemo(() => normalizeHostInput(value), [value]);
	const { accent, accentSoft } = useAccent();
	const parses = normalized.length > 0;
	const canSubmit = parses && status.kind !== "testing";

	async function handleConnect() {
		if (!canSubmit) return;
		setStatus({ kind: "testing" });
		const result = await testSidecarHost(normalized);
		switch (result.status) {
			case "ok":
				onConnect(normalized);
				return;
			case "forbidden":
				setStatus({ kind: "forbidden" });
				return;
			case "not-sidecar":
				setStatus({ kind: "not-sidecar" });
				return;
			case "unreachable":
				setStatus({ kind: "refused", host: hostWithPort(normalized) });
		}
	}

	return (
		<View style={styles.container}>
			<Text style={type.label}>Your PC's address</Text>
			<TextInput
				value={value}
				onChangeText={(next) => {
					setValue(next);
					setStatus({ kind: "idle" });
				}}
				placeholder="192.168.1.20"
				placeholderTextColor={colors.textFaint}
				keyboardType="numbers-and-punctuation"
				autoCapitalize="none"
				autoCorrect={false}
				style={styles.input}
			/>
			<Text style={[type.caption, styles.helper]}>
				Port 8778 unless you changed it.{"\n"}
				In SC Overlay: Settings → Browser sources & extra monitors has a copy button for this PC's
				address.
			</Text>

			{status.kind === "refused" ? (
				<Text style={[type.caption, styles.errorAmber]}>
					Nothing answered at {status.host}. Is SC Overlay running on that PC, and is this phone on
					the same wifi?
				</Text>
			) : null}
			{status.kind === "not-sidecar" ? (
				<Text style={[type.caption, styles.errorRed]}>
					Something answered, but it isn't SC Overlay.
				</Text>
			) : null}
			{status.kind === "forbidden" ? (
				<Text style={[type.caption, styles.errorRed]}>SC Overlay refused this address.</Text>
			) : null}

			<Pressable
				onPress={handleConnect}
				disabled={!canSubmit}
				style={[
					styles.button,
					// docs/DESIGN.md §4: three states that LOOK different. A disabled control that
					// reads as dead is correct behaviour with a bad signal — the empty state has to
					// look like something that will wake up, and it wakes on the keystroke that makes
					// the field parse (no debounce), so typing an address visibly arms the button.
					parses ? { backgroundColor: accentSoft, borderColor: accent } : styles.buttonEmpty,
				]}
			>
				<Text style={[type.bodyStrong, parses ? styles.buttonText : styles.buttonTextEmpty]}>
					{status.kind === "testing" ? "Connecting…" : "Connect"}
				</Text>
			</Pressable>

			{recents.length > 0 ? (
				<View style={styles.recents}>
					<Text style={type.label}>Recent</Text>
					{recents.map((entry) => (
						<Pressable
							key={entry.host}
							onPress={() => {
								setValue(entry.host);
								setStatus({ kind: "idle" });
							}}
							style={styles.recentRow}
						>
							<Text style={type.num}>{hostForDisplay(entry.host)}</Text>
							<Text style={[type.caption, styles.recentTime]}>
								last seen {formatRelativeOrClock(entry.lastSeenAt, true)}
							</Text>
						</Pressable>
					))}
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: spacing.sm,
	},
	input: {
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.hairline,
		borderRadius: radii.card,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		color: colors.text,
		fontFamily: type.num.fontFamily,
		fontSize: 17,
	},
	helper: {
		color: colors.textDim,
	},
	errorAmber: {
		color: colors.estimate,
	},
	errorRed: {
		color: colors.danger,
	},
	button: {
		borderRadius: radii.card,
		paddingVertical: spacing.sm,
		alignItems: "center",
		marginTop: spacing.xs,
		borderWidth: 1,
	},
	buttonEmpty: {
		backgroundColor: "transparent",
		borderColor: colors.hairline,
	},
	buttonText: {
		color: colors.text,
	},
	buttonTextEmpty: {
		color: colors.textFaint,
	},
	recents: {
		marginTop: spacing.lg,
		gap: spacing.xs,
	},
	recentRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: spacing.xs,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.hairline,
	},
	recentTime: {
		color: colors.textFaint,
	},
});
