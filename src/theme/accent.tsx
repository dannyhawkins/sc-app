import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Animated, useAnimatedValue } from "react-native";
import { accentSoft as accentSoftFor, colors, motion } from "./tokens";

/**
 * `ship.accent`/`ship.accentRgb` arrive on every frame (docs/DESIGN.md §9) and tint exactly four
 * things: the live dot, the title's left bar, the progress fill, and the flash card. Nothing else
 * — text is never the accent, some manufacturer accents are near-white or near-orange and would
 * wreck contrast on body text.
 *
 * The 300ms fade on change (docs/DESIGN.md, `motion.accentFade`): when the flown ship changes
 * mid-session the accent crossfades rather than snapping. Implemented by keeping the PREVIOUS
 * colour and interpolating between the two, because you cannot interpolate between two arbitrary
 * hex strings directly — there is no numeric axis between "#4BD0E0" and "#E07A3C". So a 0→1
 * driver runs on every change and `interpolateColor`-style output ranges do the mixing.
 *
 * 🔑 `accent` stays a plain string. Every consumer uses it in a StyleSheet value or an inline
 * backgroundColor, and making it an Animated.Value would force all of them onto Animated.View.
 * `animatedAccent` is offered ALONGSIDE for the few surfaces where the fade actually reads — the
 * title bar and the progress fill — and everything else keeps snapping, which nobody notices.
 */
interface AccentContextValue {
	accent: string;
	accentSoft: string;
	/** The same colour, crossfaded over `motion.accentFade` on change. For Animated.View only. */
	animatedAccent: Animated.AnimatedInterpolation<string> | string;
}

const defaultValue: AccentContextValue = {
	accent: colors.defaultAccent,
	accentSoft: accentSoftFor("69,208,224"),
	animatedAccent: colors.defaultAccent,
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
	const next = accent ?? defaultValue.accent;
	// The colour we are fading FROM. Held in state rather than a ref so the interpolation's output
	// range is stable for the whole animation — a ref would be mutated before the frame that reads it.
	const [pair, setPair] = useState<{ from: string; to: string }>({ from: next, to: next });
	const driver = useAnimatedValue(1);

	useEffect(() => {
		if (next === pair.to) return;
		setPair((p) => ({ from: p.to, to: next }));
		driver.setValue(0);
		Animated.timing(driver, {
			toValue: 1,
			duration: motion.accentFade,
			// Colour cannot be driven on the UI thread by the JS-driver bridge.
			useNativeDriver: false,
		}).start();
	}, [next, pair.to, driver]);

	const value: AccentContextValue = {
		accent: next,
		accentSoft: accentRgb ? accentSoftFor(accentRgb) : defaultValue.accentSoft,
		animatedAccent:
			pair.from === pair.to
				? next
				: driver.interpolate({ inputRange: [0, 1], outputRange: [pair.from, pair.to] }),
	};
	return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent(): AccentContextValue {
	return useContext(AccentContext);
}
