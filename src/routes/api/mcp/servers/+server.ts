import type { MCPServer } from "$lib/types/Tool";
import { config } from "$lib/server/config";

export async function GET() {
	// Parse MCP_SERVERS environment variable
	const mcpServersEnv = config.MCP_SERVERS || "[]";

	let servers: Array<{ name: string; url: string; headers?: Record<string, string> }> = [];

	try {
		servers = JSON.parse(mcpServersEnv);
		if (!Array.isArray(servers)) {
			servers = [];
		}
	} catch (error) {
		console.error("Failed to parse MCP_SERVERS env variable:", error);
		servers = [];
	}

	const mcpServers: MCPServer[] = servers.map((server) => ({
		id: `base-${server.name}`,
		name: server.name,
		url: server.url,
		transport: "http" as const,
		type: "base" as const,
		isLocked: false,
		status: undefined,
	}));

	return Response.json(mcpServers);
}
