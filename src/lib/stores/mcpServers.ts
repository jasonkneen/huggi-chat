/**
 * MCP Servers Store
 * Manages base (env-configured) and custom (user-added) MCP servers
 * Stores custom servers and selection state in browser localStorage
 */

import { writable, derived, get } from "svelte/store";
import { base } from "$app/paths";
import { env as publicEnv } from "$env/dynamic/public";
import { browser } from "$app/environment";
import type { MCPServer, ServerStatus, MCPTool } from "$lib/types/Tool";
import { loadFromStorage, saveToStorage } from "$lib/utils/localStorage";

// Namespace storage by app identity to avoid collisions across apps
function toKeyPart(s: string | undefined): string {
	return (s || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

const appLabel = toKeyPart(publicEnv.PUBLIC_APP_ASSETS || publicEnv.PUBLIC_APP_NAME);
const baseLabel = toKeyPart(typeof base === "string" ? base : "");
// Final prefix format requested: "huggingchat:key" (no mcp:/chat)
const KEY_PREFIX = appLabel || baseLabel || "app";

const STORAGE_KEYS = {
	CUSTOM_SERVERS: `${KEY_PREFIX}:mcp:custom-servers`,
	SELECTED_IDS: `${KEY_PREFIX}:mcp:selected-ids`,
	DISABLED_BASE_IDS: `${KEY_PREFIX}:mcp:disabled-base-ids`,
} as const;

// No migration needed per request — read/write only namespaced keys

// Load custom servers from localStorage
function loadCustomServers(): MCPServer[] {
	return loadFromStorage<MCPServer[]>(STORAGE_KEYS.CUSTOM_SERVERS, []);
}

// Load selected server IDs from localStorage
function loadSelectedIds(): Set<string> {
	const ids = loadFromStorage<string[]>(STORAGE_KEYS.SELECTED_IDS, []);
	return new Set(ids);
}

// Save custom servers to localStorage
function saveCustomServers(servers: MCPServer[]) {
	saveToStorage(STORAGE_KEYS.CUSTOM_SERVERS, servers);
}

// Save selected IDs to localStorage
function saveSelectedIds(ids: Set<string>) {
	saveToStorage(STORAGE_KEYS.SELECTED_IDS, [...ids]);
}

// Load disabled base server IDs from localStorage (empty set if missing or on error)
function loadDisabledBaseIds(): Set<string> {
	const ids = loadFromStorage<string[]>(STORAGE_KEYS.DISABLED_BASE_IDS, []);
	return new Set(ids);
}

// Save disabled base server IDs to localStorage
function saveDisabledBaseIds(ids: Set<string>) {
	saveToStorage(STORAGE_KEYS.DISABLED_BASE_IDS, [...ids]);
}

// Store for all servers (base + custom)
export const allMcpServers = writable<MCPServer[]>([]);

// Track if initial server load has completed
export const mcpServersLoaded = writable<boolean>(false);

// Store for selected server IDs
export const selectedServerIds = writable<Set<string>>(loadSelectedIds());

// Auto-persist selected IDs when they change
if (browser) {
	selectedServerIds.subscribe((ids) => {
		saveSelectedIds(ids);
	});
}

// Derived store: only enabled servers
export const enabledServers = derived([allMcpServers, selectedServerIds], ([$all, $selected]) =>
	$all.filter((s) => $selected.has(s.id))
);

// Derived store: count of enabled servers
export const enabledServersCount = derived(enabledServers, ($enabled) => $enabled.length);

// Derived store: all tools from enabled servers (aggregated from MCP health checks)
export const enabledServerTools = derived(enabledServers, ($enabled) => {
	const tools: MCPTool[] = [];
	for (const server of $enabled) {
		if (server.tools && server.tools.length > 0) {
			tools.push(...server.tools);
		}
	}
	return tools;
});

// Derived store: true if all base servers are enabled
export const allBaseServersEnabled = derived(
	[allMcpServers, selectedServerIds],
	([$all, $selected]) => {
		const baseServers = $all.filter((s) => s.type === "base");
		return baseServers.length > 0 && baseServers.every((s) => $selected.has(s.id));
	}
);

// Note: Authorization overlay (with user's HF token) for the Hugging Face MCP host
// is applied server-side when enabled via MCP_FORWARD_HF_USER_TOKEN.

/**
 * Refresh base servers from API and merge with custom servers
 */
export async function refreshMcpServers() {
	try {
		const response = await fetch(`${base}/api/mcp/servers`);
		if (!response.ok) {
			throw new Error(`Failed to fetch base servers: ${response.statusText}`);
		}

		const baseServers: MCPServer[] = await response.json();
		const customServers = loadCustomServers();

		// Merge base and custom servers
		const merged = [...baseServers, ...customServers];
		allMcpServers.set(merged);

		// Load disabled base servers
		const disabledBaseIds = loadDisabledBaseIds();

		// Auto-enable all base servers that aren't explicitly disabled
		// Plus keep any custom servers that were previously selected
		const validIds = new Set(merged.map((s) => s.id));
		selectedServerIds.update(($currentIds) => {
			const newSelection = new Set<string>();

			// Add all base servers that aren't disabled
			for (const server of baseServers) {
				if (!disabledBaseIds.has(server.id)) {
					newSelection.add(server.id);
				}
			}

			// Keep custom servers that were selected and still exist
			for (const id of $currentIds) {
				if (validIds.has(id) && !id.startsWith("base-")) {
					newSelection.add(id);
				}
			}

			return newSelection;
		});
		mcpServersLoaded.set(true);

		// Run health checks for all servers after refresh
		await Promise.allSettled(merged.map((server) => healthCheckServer(server)));
	} catch (error) {
		console.error("Failed to refresh MCP servers:", error);
		// On error, just use custom servers
		allMcpServers.set(loadCustomServers());
		mcpServersLoaded.set(true);
	}
}

/**
 * Toggle a server on/off
 */
export function toggleServer(id: string) {
	selectedServerIds.update(($ids) => {
		const newSet = new Set($ids);
		if (newSet.has(id)) {
			newSet.delete(id);
			// Track if this is a base server being disabled
			if (id.startsWith("base-")) {
				const disabled = loadDisabledBaseIds();
				disabled.add(id);
				saveDisabledBaseIds(disabled);
			}
		} else {
			newSet.add(id);
			// Remove from disabled if re-enabling a base server
			if (id.startsWith("base-")) {
				const disabled = loadDisabledBaseIds();
				disabled.delete(id);
				saveDisabledBaseIds(disabled);
			}
		}
		return newSet;
	});
}

/**
 * Disable all MCP servers (marks all base servers as disabled)
 */
export function disableAllServers() {
	// Get current base server IDs and mark them all as disabled
	const servers = get(allMcpServers);
	const baseServerIds = servers.filter((s) => s.type === "base").map((s) => s.id);

	// Save all base servers as disabled
	saveDisabledBaseIds(new Set(baseServerIds));

	// Clear the selection
	selectedServerIds.set(new Set());
}

/**
 * Add a custom MCP server
 */
export function addCustomServer(server: Omit<MCPServer, "id" | "type" | "status">): string {
	const newServer: MCPServer = {
		...server,
		id: crypto.randomUUID(),
		type: "custom",
		status: "disconnected",
	};

	const customServers = loadCustomServers();
	customServers.push(newServer);
	saveCustomServers(customServers);

	// Refresh all servers to include the new one
	refreshMcpServers();

	return newServer.id;
}

/**
 * Update an existing custom server
 */
export function updateCustomServer(id: string, updates: Partial<MCPServer>) {
	const customServers = loadCustomServers();
	const index = customServers.findIndex((s) => s.id === id);

	if (index !== -1) {
		customServers[index] = { ...customServers[index], ...updates };
		saveCustomServers(customServers);
		refreshMcpServers();
	}
}

/**
 * Delete a custom server
 */
export function deleteCustomServer(id: string) {
	const customServers = loadCustomServers();
	const filtered = customServers.filter((s) => s.id !== id);
	saveCustomServers(filtered);

	// Also remove from selected IDs
	selectedServerIds.update(($ids) => {
		const newSet = new Set($ids);
		newSet.delete(id);
		return newSet;
	});

	refreshMcpServers();
}

/**
 * Update server status (from health check)
 */
export function updateServerStatus(
	id: string,
	status: ServerStatus,
	errorMessage?: string,
	tools?: MCPTool[],
	authRequired?: boolean
) {
	allMcpServers.update(($servers) =>
		$servers.map((s) =>
			s.id === id
				? {
						...s,
						status,
						errorMessage,
						tools,
						authRequired,
					}
				: s
		)
	);
}

/**
 * Run health check on a server
 */
export async function healthCheckServer(
	server: MCPServer
): Promise<{ ready: boolean; tools?: MCPTool[]; error?: string }> {
	try {
		updateServerStatus(server.id, "connecting");

		// Stdio transport requires Electron IPC
		if (server.transport === "stdio") {
			const electronAPI = browser
				? (
						window as unknown as {
							electronAPI?: {
								mcpHealthCheck?: (
									config: unknown
								) => Promise<{ ready: boolean; tools?: MCPTool[]; error?: string }>;
							};
						}
					).electronAPI
				: undefined;
			if (electronAPI?.mcpHealthCheck) {
				const result = await electronAPI.mcpHealthCheck({
					command: server.command,
					args: server.args,
					env: server.env,
				});

				if (result.ready && result.tools) {
					updateServerStatus(server.id, "connected", undefined, result.tools, false);
					return { ready: true, tools: result.tools };
				} else {
					updateServerStatus(server.id, "error", result.error, undefined, false);
					return { ready: false, error: result.error };
				}
			} else {
				const errorMessage = "Stdio transport requires Electron";
				updateServerStatus(server.id, "error", errorMessage);
				return { ready: false, error: errorMessage };
			}
		}

		// HTTP transport uses the API endpoint
		const response = await fetch(`${base}/api/mcp/health`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url: server.url, headers: server.headers }),
		});

		const result = await response.json();

		if (result.ready && result.tools) {
			updateServerStatus(server.id, "connected", undefined, result.tools, false);
			return { ready: true, tools: result.tools };
		} else {
			updateServerStatus(server.id, "error", result.error, undefined, Boolean(result.authRequired));
			return { ready: false, error: result.error };
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		updateServerStatus(server.id, "error", errorMessage);
		return { ready: false, error: errorMessage };
	}
}

// Electron API type for stdio MCP operations
type ElectronMcpAPI = {
	mcpHealthCheck?: (
		config: unknown
	) => Promise<{ ready: boolean; tools?: MCPTool[]; error?: string }>;
	mcpStartServer?: (config: {
		serverId: string;
		command: string;
		args?: string[];
		env?: { key: string; value: string }[];
	}) => Promise<{ success: boolean; error?: string }>;
	mcpCallTool?: (config: {
		serverId: string;
		tool: string;
		args?: unknown;
	}) => Promise<{ success: boolean; text?: string; content?: unknown[]; error?: string }>;
	mcpStopServer?: (config: { serverId: string }) => Promise<{ success: boolean; error?: string }>;
	mcpListTools?: (config: {
		serverId: string;
	}) => Promise<{ success: boolean; tools?: MCPTool[]; error?: string }>;
};

function getElectronAPI(): ElectronMcpAPI | undefined {
	if (!browser) return undefined;
	return (window as unknown as { electronAPI?: ElectronMcpAPI }).electronAPI;
}

/**
 * Start a stdio MCP server (keeps it running for tool calls)
 */
export async function startStdioServer(
	server: MCPServer
): Promise<{ success: boolean; tools?: MCPTool[]; error?: string }> {
	if (server.transport !== "stdio") {
		return { success: false, error: "Not a stdio server" };
	}

	if (!server.command) {
		return { success: false, error: "Stdio server requires a command" };
	}

	const electronAPI = getElectronAPI();
	if (!electronAPI?.mcpStartServer) {
		return { success: false, error: "Stdio transport requires Electron" };
	}

	updateServerStatus(server.id, "connecting");

	const result = await electronAPI.mcpStartServer({
		serverId: server.id,
		command: server.command,
		args: server.args,
		env: server.env,
	});

	if (!result.success) {
		updateServerStatus(server.id, "error", result.error);
		return { success: false, error: result.error };
	}

	// Get tools list
	if (electronAPI.mcpListTools) {
		const toolsResult = await electronAPI.mcpListTools({ serverId: server.id });
		if (toolsResult.success && toolsResult.tools) {
			updateServerStatus(server.id, "connected", undefined, toolsResult.tools, false);
			return { success: true, tools: toolsResult.tools };
		}
	}

	updateServerStatus(server.id, "connected");
	return { success: true };
}

/**
 * Stop a stdio MCP server
 */
export async function stopStdioServer(
	server: MCPServer
): Promise<{ success: boolean; error?: string }> {
	if (server.transport !== "stdio") {
		return { success: false, error: "Not a stdio server" };
	}

	const electronAPI = getElectronAPI();
	if (!electronAPI?.mcpStopServer) {
		return { success: false, error: "Stdio transport requires Electron" };
	}

	const result = await electronAPI.mcpStopServer({ serverId: server.id });
	if (result.success) {
		updateServerStatus(server.id, "disconnected");
	}
	return result;
}

/**
 * Call a tool on a stdio MCP server
 */
export async function callStdioTool(
	serverId: string,
	tool: string,
	args: unknown = {}
): Promise<{ success: boolean; text?: string; content?: unknown[]; error?: string }> {
	const electronAPI = getElectronAPI();
	if (!electronAPI?.mcpCallTool) {
		return { success: false, error: "Stdio transport requires Electron" };
	}

	return electronAPI.mcpCallTool({ serverId, tool, args });
}

/**
 * Get tools from all enabled stdio servers
 */
export function getEnabledStdioServers(): MCPServer[] {
	const servers = get(allMcpServers);
	const selected = get(selectedServerIds);
	return servers.filter((s) => s.transport === "stdio" && selected.has(s.id));
}

// Initialize on module load
if (browser) {
	refreshMcpServers();
}
