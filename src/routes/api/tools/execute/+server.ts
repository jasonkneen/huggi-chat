import { getMcpServers } from "$lib/server/mcp/registry";
import { getClient } from "$lib/server/mcp/clientPool";
import { executeLocalTool, buildLocalToolContext } from "$lib/server/mcp/localTools";
import { logger } from "$lib/server/logger";
import type { RequestHandler } from "./$types";

interface ExecuteRequest {
	toolName: string;
	arguments: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body: ExecuteRequest = await request.json();
		const { toolName, arguments: args } = body;

		logger.info({ toolName, args }, "[tool-debug] Executing tool");

		// Check if it's a local tool
		const localToolNames = ["local_list_tools", "list_files", "read_file", "write_file", "run_command", "search_code"];
		if (localToolNames.includes(toolName)) {
			const rawWorkspaces = (locals as { workspaces?: Array<{ name: string; path: string; isGitRepo: boolean }> })?.workspaces ?? [];
			// Use default workspace if none provided
			const workspaces = rawWorkspaces.length > 0 ? rawWorkspaces : [{ name: "workspace", path: process.cwd(), isGitRepo: false }];

			// Build tool catalog from all available tools
			const toolCatalog: Array<{ name: string; description?: string; server?: string; isLocal?: boolean }> = [];

			// Add local workspace tools
			toolCatalog.push(
				{ name: "local_list_tools", description: "List available tools and their servers", server: "local", isLocal: true },
				{ name: "list_files", description: "List files and folders in workspace", server: "local", isLocal: true },
				{ name: "read_file", description: "Read file from workspace", server: "local", isLocal: true },
				{ name: "write_file", description: "Write file to workspace", server: "local", isLocal: true },
				{ name: "run_command", description: "Execute shell commands", server: "local", isLocal: true },
				{ name: "search_code", description: "Search code with ast-grep or ripgrep", server: "local", isLocal: true }
			);

			// Add MCP tools from servers
			const servers = getMcpServers();
			for (const server of servers) {
				try {
					const client = await getClient({ name: server.name, url: server.url, headers: server.headers ?? {} });
					const toolsList = await client.listTools();
					for (const tool of toolsList.tools) {
						toolCatalog.push({
							name: tool.name,
							description: tool.description,
							server: server.name,
							isLocal: false,
						});
					}
				} catch {
					// Skip servers that fail to connect
				}
			}

			const ctx = buildLocalToolContext(workspaces, toolCatalog);

			const result = await executeLocalTool(toolName, args, ctx);

			return new Response(JSON.stringify({ success: true, result: result.text }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// MCP tool - find which server has it
		const servers = getMcpServers();

		for (const server of servers) {
			try {
				const client = await getClient({ name: server.name, url: server.url, headers: server.headers ?? {} });
				const toolsList = await client.listTools();

				const hasTool = toolsList.tools.some(t => t.name === toolName);
				if (!hasTool) continue;

				// Execute the tool
				const result = await client.callTool({ name: toolName, arguments: args });

				return new Response(
					JSON.stringify({
						success: true,
						result: JSON.stringify(result.content, null, 2),
					}),
					{ headers: { "Content-Type": "application/json" } }
				);
			} catch (err) {
				logger.warn({ server: server.name, error: err }, "[tool-debug] Tool execution failed on server");
				continue;
			}
		}

		return new Response(
			JSON.stringify({ success: false, error: `Tool ${toolName} not found on any server` }),
			{ status: 404, headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		logger.error({ error }, "[tool-debug] Tool execution error");
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
