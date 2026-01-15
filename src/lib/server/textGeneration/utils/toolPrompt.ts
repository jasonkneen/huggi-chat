import type { OpenAiTool } from "$lib/server/mcp/tools";

export type ToolServerMapping = Record<string, { server: string; isStdio?: boolean }>;

const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant with access to tools. You can execute actions, read files, search the web, and perform tasks on behalf of the user.

CRITICAL: You have real tool capabilities. When the user asks you to do something that requires tools (file access, web search, code execution, etc.), USE THE TOOLS. Do not claim you cannot do something if you have a tool for it.

Guidelines:
- Use tools proactively when they help accomplish the user's request
- If a tool fails, explain the error and try an alternative approach
- Be concise and direct in responses
- Use Markdown formatting for clarity`;

export function buildToolPreprompt(
	tools: OpenAiTool[],
	toolMapping?: ToolServerMapping,
	workspaces?: Array<{ name: string; path: string; isGitRepo: boolean }>
): string {
	const currentDate = new Date().toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const lines: string[] = [BASE_SYSTEM_PROMPT, "", `Today's date: ${currentDate}.`];

	if (!Array.isArray(tools) || tools.length === 0) {
		return lines.join("\n");
	}

	const serverTools: Record<string, Array<{ name: string; desc: string }>> = {};

	for (const t of tools) {
		if (!t?.function?.name) continue;
		const name = t.function.name;
		const desc = t.function.description || "No description";
		const serverInfo = toolMapping?.[name];
		const serverName = serverInfo?.server || "unknown";

		if (!serverTools[serverName]) {
			serverTools[serverName] = [];
		}
		serverTools[serverName].push({ name, desc });
	}

	if (Object.keys(serverTools).length === 0) {
		return lines.join("\n");
	}

	lines.push("");
	lines.push("# TOOLS YOU CAN USE");
	lines.push(
		"You have the following tools available. USE THEM when the user's request requires file access, web browsing, code execution, or any capability these tools provide."
	);
	lines.push("");

	// Sort servers and tools alphabetically for cache-stable output
	const sortedServers = Object.keys(serverTools).sort();
	for (const serverName of sortedServers) {
		const serverToolList = serverTools[serverName].sort((a, b) => a.name.localeCompare(b.name));
		lines.push(`### MCP Server: ${serverName}`);
		for (const tool of serverToolList) {
			lines.push(`- **${tool.name}**: ${tool.desc}`);
		}
		lines.push("");
	}

	lines.push(
		"IMPORTANT: Do NOT say you cannot access files, browse the web, or execute commands. You CAN do these things using the tools above. Use them."
	);

	if (workspaces && workspaces.length > 0) {
		lines.push("");
		lines.push("## Workspace Folders");
		lines.push("Project folders attached to this conversation:");
		for (const ws of workspaces) {
			const gitNote = ws.isGitRepo ? " (git repo)" : "";
			lines.push(`- **${ws.name}**: \`${ws.path}\`${gitNote}`);
		}
		lines.push("");
		lines.push("Use filesystem/git tools on these paths.");
	}

	return lines.join("\n");
}
