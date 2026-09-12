import { StyleSheet, TextInput } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { type } from "@/theme/typography";

export function SearchField({
	value,
	onChangeText,
}: {
	value: string;
	onChangeText: (text: string) => void;
}) {
	return (
		<TextInput
			value={value}
			onChangeText={onChangeText}
			placeholder="Contract name"
			placeholderTextColor={colors.textFaint}
			autoCapitalize="none"
			autoCorrect={false}
			style={styles.input}
		/>
	);
}

const styles = StyleSheet.create({
	input: {
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.hairline,
		borderRadius: radii.card,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		color: colors.text,
		fontFamily: type.body.fontFamily,
		fontSize: 17,
	},
});
