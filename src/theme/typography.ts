import type { TextStyle } from "react-native";
import { fontFamily } from "./fonts";
import { colors } from "./tokens";

/**
 * Text styles from docs/DESIGN.md §7's type table. `fontVariant: ['tabular-nums']` is applied to
 * every mono style per spec, so `3 / 7` and `681,750` don't shimmer as digits change width.
 */
export const type = {
	/** The one big number — PoolProgress, ClosestPoolCard. */
	display: {
		fontFamily: fontFamily.mono600,
		fontSize: 40,
		lineHeight: 44,
		color: colors.text,
		fontVariant: ["tabular-nums"],
	} satisfies TextStyle,
	/** Mission title, banner headings. */
	title: {
		fontFamily: fontFamily.sans600,
		fontSize: 22,
		lineHeight: 28,
		color: colors.text,
	} satisfies TextStyle,
	/** Rows, copy. */
	body: {
		fontFamily: fontFamily.sans500,
		fontSize: 17,
		lineHeight: 22,
		color: colors.text,
	} satisfies TextStyle,
	/** Unowned blueprint names. */
	bodyStrong: {
		fontFamily: fontFamily.sans600,
		fontSize: 17,
		lineHeight: 22,
		color: colors.text,
	} satisfies TextStyle,
	/** Inline figures, times, `62%`. */
	num: {
		fontFamily: fontFamily.mono500,
		fontSize: 17,
		lineHeight: 22,
		color: colors.text,
		fontVariant: ["tabular-nums"],
	} satisfies TextStyle,
	/** Section headers. */
	label: {
		fontFamily: fontFamily.sans600,
		fontSize: 13,
		lineHeight: 16,
		letterSpacing: 1,
		color: colors.textDim,
		textTransform: "uppercase",
	} satisfies TextStyle,
	/** Timestamps, suffixes. */
	caption: {
		fontFamily: fontFamily.sans500,
		fontSize: 13,
		lineHeight: 16,
		color: colors.textDim,
	} satisfies TextStyle,
} as const;
