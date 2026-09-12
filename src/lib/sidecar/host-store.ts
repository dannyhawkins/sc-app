import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeHostInput } from "./http-client";

/**
 * Persists the user-entered sidecar host (e.g. "192.168.1.42:8778") and a small recents list.
 *
 * Why AsyncStorage over expo-secure-store: a LAN hostname/IP isn't a secret — it's not a
 * credential, it grants no access by itself (the sidecar is unauthenticated on the LAN by
 * design, per docs/API.md), and leaking it tells an attacker nothing they couldn't get by
 * scanning the subnet. expo-secure-store also has no web implementation (it throws on `web`),
 * and this app runs under `expo start --web` too — AsyncStorage works everywhere the app does.
 * If the sidecar grows a paired-device token (the write-auth roadmap item in API.md), *that*
 * belongs in SecureStore; the host string doesn't need that treatment.
 */
const HOST_KEY = "sc-app/sidecar-host";
const RECENTS_KEY = "sc-app/sidecar-recents";
const MAX_RECENTS = 5;

export interface RecentHost {
	host: string;
	/** Epoch ms of the last successful connection to this host, per docs/DESIGN.md §4's "Recent" list. */
	lastSeenAt: number;
}

export async function loadStoredHost(): Promise<string | null> {
	return AsyncStorage.getItem(HOST_KEY);
}

/**
 * Normalizes before persisting — HostForm may hand this the whole string a user pasted from SC
 * Overlay's settings screen (scheme + path included), and every reader of the stored host
 * (recents list, the status bar's host chip) should only ever see the clean `host[:port]` form.
 */
export async function saveStoredHost(host: string): Promise<void> {
	await AsyncStorage.setItem(HOST_KEY, normalizeHostInput(host));
}

export async function clearStoredHost(): Promise<void> {
	await AsyncStorage.removeItem(HOST_KEY);
}

export async function loadRecentHosts(): Promise<RecentHost[]> {
	const raw = await AsyncStorage.getItem(RECENTS_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as RecentHost[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/** Records a successful connection, newest-first, deduped by host, capped at MAX_RECENTS. */
export async function recordRecentHost(host: string, lastSeenAt = Date.now()): Promise<void> {
	const normalized = normalizeHostInput(host);
	const existing = await loadRecentHosts();
	const withoutThisHost = existing.filter((entry) => entry.host !== normalized);
	const updated = [{ host: normalized, lastSeenAt }, ...withoutThisHost].slice(0, MAX_RECENTS);
	await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
}
