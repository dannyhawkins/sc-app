import { createContext, type ReactNode, useContext } from "react";
import { accentSoft as accentSoftFor, colors } from "./tokens";

/**
 * `ship.accent`/`ship.accentRgb` arrive on every frame (docs/DESIGN.md §9) and tint exactly four
 * things: the live dot, the title's left bar, the progress fill, and the flash card. Nothing else
 * — text is never the accent, some manufacturer accents are near-white or near-orange and would
 * wreck contrast on body text.
 *
 * NOTE: the spec calls for a 300ms colour fade on change (a ship swap mid-session). This context
 * intentionally does NOT animate that yet — it's a plain value swap. Wiring an Animated
 * interpolation here is straightforward (see `motion.accentFade` in ./tokens) but didn't make the
 * v1 cut; flag if this needs to land before ship.
 */
interface AccentContextValue {
	accent: string;
	accentSoft: string;
}

const defaultValue: AccentContextValue = {
	accent: colors.defaultAccent,
	accentSoft: accentSoftFor("69,208,224"),
};

const AccentContext = createContext<AccentContextValue>(defaultValue);

export function AccentProvider({
	accent,
	accentRgb,
	children,
}: {
	accent: string | null;
	accentRgb: string | null;
	children: ReactNode;
}) {
	const value: AccentContextValue = {
		accent: accent ?? defaultValue.accent,
		accentSoft: accentRgb ? accentSoftFor(accentRgb) : defaultValue.accentSoft,
	};
	return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent(): AccentContextValue {
	return useContext(AccentContext);
}
