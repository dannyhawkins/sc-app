import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar as SystemStatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { useConnectionStore } from "@/store/connection-store";
import { useAppFonts } from "@/theme/fonts";
import { colors } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

/**
 * Root layout: loads the bundled fonts (§7) and hydrates the connection store (persisted host,
 * first probe) once, at boot, before anything renders for real. The native splash stays up until
 * both are done so there's no flash of unstyled content.
 */
export default function RootLayout() {
	const [fontsLoaded] = useAppFonts();
	const hydrate = useConnectionStore((state) => state.hydrate);
	const hydrated = useConnectionStore((state) => state.hydrated);

	useEffect(() => {
		hydrate();
	}, [hydrate]);

	useEffect(() => {
		if (fontsLoaded && hydrated) SplashScreen.hideAsync();
	}, [fontsLoaded, hydrated]);

	if (!fontsLoaded || !hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

	return (
		<>
			{/* Dark-only app (docs/DESIGN.md §7) — the native status bar icons stay light regardless
			 * of the device's own theme setting. */}
			<SystemStatusBar style="light" />
			<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="connect" options={{ presentation: "modal" }} />
				<Stack.Screen name="preview" options={{ presentation: "modal" }} />
				<Stack.Screen name="blueprint" options={{ presentation: "modal" }} />
			</Stack>
		</>
	);
}
