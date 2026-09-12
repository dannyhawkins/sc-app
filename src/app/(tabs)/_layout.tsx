import { Redirect, Tabs } from "expo-router";
import { useConnectionStore } from "@/store/connection-store";
import { colors } from "@/theme/tokens";
import { type } from "@/theme/typography";

/**
 * docs/DESIGN.md §2: two bottom tabs, nothing else. Cold start (`conn === "no-host"`) redirects
 * to Connect before the tabs ever mount — there's nothing to show without a host.
 */
export default function TabsLayout() {
	const conn = useConnectionStore((state) => state.conn);

	if (conn === "no-host") return <Redirect href="/connect" />;

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: colors.bg,
					borderTopColor: colors.hairline,
				},
				tabBarActiveTintColor: colors.text,
				tabBarInactiveTintColor: colors.textFaint,
				tabBarLabelStyle: { ...type.caption, fontSize: 12 },
			}}
		>
			<Tabs.Screen name="index" options={{ title: "Tracker" }} />
			<Tabs.Screen name="lookup" options={{ title: "Lookup" }} />
		</Tabs>
	);
}
