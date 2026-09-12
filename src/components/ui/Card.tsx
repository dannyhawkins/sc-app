import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";

/** docs/DESIGN.md §7: one-pixel hairline border, no shadows, hierarchy by surface tone. */
export function Card({
	children,
	style,
	tone = "surface",
}: {
	children: ReactNode;
	style?: ViewStyle;
	tone?: "surface" | "surface2";
}) {
	return (
		<View style={[styles.base, tone === "surface2" && styles.surface2, style]}>{children}</View>
	);
}

const styles = StyleSheet.create({
	base: {
		backgroundColor: colors.surface,
		borderRadius: radii.card,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.hairline,
		padding: spacing.md,
	},
	surface2: {
		backgroundColor: colors.surface2,
	},
});
