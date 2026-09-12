/**
 * Design tokens, verbatim from docs/DESIGN.md §7. Dark-only in v1 — "this is used at night; a
 * light theme is not planned and nothing here should assume one." Don't add a light variant on
 * spec; if that changes, `textFaint` needs re-deriving (its 3.6:1 contrast only works on `bg`).
 */

export const colors = {
	bg: "#0A0E13",
	surface: "#121820",
	surface2: "#1A222C",
	hairline: "rgba(255,255,255,0.08)",
	text: "#E8EEF3",
	textDim: "#93A3B1",
	textFaint: "#5F6F7C",
	/** Default ship accent (mobiglas) — used until a frame's `ship.accent` arrives. */
	defaultAccent: "#45D0E0",
	value: "#FFD27A",
	estimate: "#F5A623",
	owned: "#2EE6A0",
	danger: "#FF8478",
	/** Text colour ON the accent (flash card) — verified in DESIGN.md to pass contrast for every accent. */
	onAccent: "#07131A",
} as const;

/** `rgba(ship.accentRgb, 0.14)` — accentRgb is a frame field, e.g. "69,208,224"; see useAccentColor. */
export function accentSoft(accentRgb: string): string {
	return `rgba(${accentRgb},0.14)`;
}

/** 4pt base spacing scale. */
export const spacing = {
	xxs: 4,
	xs: 8,
	sm: 12,
	md: 16,
	lg: 20,
	xl: 24,
	xxl: 32,
	/** Screen gutter and card padding both use `md`. */
	gutter: 16,
	sectionGap: 24,
	rowMinHeight: 52,
	statusBarHeight: 36,
} as const;

export const radii = {
	chip: 6,
	card: 10,
	sheet: 14,
	bar: 2,
} as const;

export const motion = {
	/** Flash card in/out and status-bar colour fades (live<->stale etc). */
	flashIn: 180,
	flashOut: 240,
	statusFade: 300,
	/** ship.accent change — §9: "a 300ms colour fade. No swoosh, no manufacturer logo." */
	accentFade: 300,
} as const;
