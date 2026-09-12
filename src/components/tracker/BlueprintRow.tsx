import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

export interface BlueprintRowProps {
	name: string;
	owned: boolean;
	source: string | null;
	chance: number;
	sub: string;
	item: string;
	hasDetail: boolean;
	onPress?: (item: string) => void;
}

const sourceSuffix: Record<string, string> = {
	manual: "marked by hand",
	fab: "from fabricator",
};

/**
 * docs/DESIGN.md §5.1/§8. `chance === 1` shows nothing ("seven rows all saying guaranteed is
 * noise"). `source` is only surfaced when it's `manual`/`fab` — `in-game`/`default` say nothing,
 * that's the log doing its job, not a human overriding it. Trailing 44pt is reserved and empty
 * for the future owned-toggle (v1 is read-only, docs/API.md).
 */
export function BlueprintRow({
	name,
	owned,
	source,
	chance,
	sub,
	item,
	hasDetail,
	onPress,
}: BlueprintRowProps) {
	const suffix = source ? sourceSuffix[source] : null;
	const content = (
		<View style={styles.row}>
			<Text style={[styles.glyph, owned && styles.glyphOwned]}>{owned ? "✓" : "○"}</Text>
			<View style={styles.middle}>
				<View style={styles.nameLine}>
					<Text
						style={[owned ? type.body : type.bodyStrong, owned && styles.dimText]}
						numberOfLines={1}
					>
						{name}
					</Text>
					{chance < 1 ? (
						<Text style={[type.num, styles.chance]}>{Math.round(chance * 100)}%</Text>
					) : null}
				</View>
				{suffix ? <Text style={[type.caption, styles.suffix]}>· {suffix}</Text> : null}
			</View>
			<Text style={[type.caption, styles.sub]} numberOfLines={1}>
				{sub}
			</Text>
			<View style={styles.trailing}>
				{hasDetail ? <Text style={styles.chevron}>›</Text> : null}
			</View>
		</View>
	);

	if (!hasDetail) return content;
	return (
		<Pressable onPress={() => onPress?.(item)} style={({ pressed }) => pressed && styles.pressed}>
			{content}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		minHeight: spacing.rowMinHeight,
		gap: spacing.xs,
	},
	pressed: {
		opacity: 0.7,
	},
	glyph: {
		width: 20,
		textAlign: "center",
		color: colors.textFaint,
		fontSize: 15,
	},
	glyphOwned: {
		color: colors.owned,
	},
	middle: {
		flex: 1,
		gap: 2,
	},
	nameLine: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: spacing.xs,
	},
	dimText: {
		color: colors.textDim,
	},
	chance: {
		color: colors.value,
	},
	suffix: {
		color: colors.textFaint,
	},
	sub: {
		color: colors.textDim,
		flexShrink: 0,
	},
	trailing: {
		width: 44,
		alignItems: "flex-end",
	},
	chevron: {
		color: colors.textFaint,
		fontSize: 17,
	},
});
