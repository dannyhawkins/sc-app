import { useEffect, useState } from "react";

/** Re-renders the caller every `intervalMs` — for "12s ago"/"6 min ago" labels that must tick. */
export function useNow(intervalMs = 1000): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);
	return now;
}
