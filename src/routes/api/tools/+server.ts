import { getMcpServers } from "$lib/server/mcp/registry";
import { getOpenAiToolsForMcp } from "$lib/server/mcp/tools";
import { getLocalToolsForWorkspaces } from "$lib/server/mcp/localTools";
import type { ToolFront } from "$lib/types/Tool";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Get MCP servers
		const servers = getMcpServers();

		// Get HTTP/MCP tools
		const { tools: mcpTools } = servers.length > 0
			? await getOpenAiToolsForMcp(servers, {})
			: { tools: [], mapping: {} };

		// Get local workspace tools - pass dummy workspace to get all tools for debugging
		const workspaces = (locals as { workspaces?: Array<{ name: string; path: string; isGitRepo: boolean }> })?.workspaces ?? [];
		const debugWorkspaces = workspaces.length > 0 ? workspaces : [{ name: "debug", path: "/tmp", isGitRepo: false }];
		const { tools: localTools } = getLocalToolsForWorkspaces(debugWorkspaces);

		// Combine and convert to ToolFront
		const allTools = [...mcpTools, ...localTools];

		const toolFrontList: ToolFront[] = allTools.map((tool, index) => ({
			_id: `tool_${index}`,
			name: tool.function.name,
			displayName: tool.function.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
			description: tool.function.description || "",
			type: "config" as const,
			isOnByDefault: true,
		}));

		// Also include parameters for the debugger
		const toolsWithParams = allTools.map((tool, index) => ({
			...toolFrontList[index],
			parameters: tool.function.parameters,
		}));

		return new Response(JSON.stringify({ tools: toolsWithParams }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({ tools: [], error: error instanceof Error ? error.message : "Unknown error" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
