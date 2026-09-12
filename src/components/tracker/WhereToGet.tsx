import { Text } from "react-native";
import { type } from "@/theme/typography";

/** Omitted entirely when empty — the server also omits it outright when `ambiguous: true`. */
export function WhereToGet({ whereToGet }: { whereToGet: string[] }) {
	if (whereToGet.length === 0) return null;
	return <Text style={type.caption}>Offered at {whereToGet.join(", ")}</Text>;
}
