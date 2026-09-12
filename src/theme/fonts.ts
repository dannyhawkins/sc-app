import { Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import {
	JetBrainsMono_500Medium,
	JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";

/**
 * docs/DESIGN.md §7: Inter (500/600/700) + JetBrains Mono (500/600), both OFL, both bundled via
 * expo-font rather than left to the OS (the overlay uses whatever mono font the desktop has —
 * the phone doesn't get that luxury, so we ship one).
 */
export function useAppFonts() {
	return useFonts({
		Inter_500Medium,
		Inter_600SemiBold,
		Inter_700Bold,
		JetBrainsMono_500Medium,
		JetBrainsMono_600SemiBold,
	});
}

export const fontFamily = {
	sans500: "Inter_500Medium",
	sans600: "Inter_600SemiBold",
	sans700: "Inter_700Bold",
	mono500: "JetBrainsMono_500Medium",
	mono600: "JetBrainsMono_600SemiBold",
} as const;
