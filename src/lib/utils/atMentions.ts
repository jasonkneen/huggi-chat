export interface AtMentionItem {
	type: "agent" | "file";
	name: string;
	description?: string;
	path: string;
}

export function parseAtMention(input: string): { query: string; startIndex: number } | null {
	const lastAtIndex = input.lastIndexOf("@");
	if (lastAtIndex === -1) return null;

	const beforeAt = input.slice(0, lastAtIndex);
	if (beforeAt.length > 0 && !/\s$/.test(beforeAt)) return null;

	const afterAt = input.slice(lastAtIndex + 1);
	if (afterAt.includes(" ")) return null;

	return { query: afterAt.toLowerCase(), startIndex: lastAtIndex };
}

export function filterMentions(items: AtMentionItem[], query: string): AtMentionItem[] {
	if (!query) return items;
	return items.filter(
		(item) =>
			item.name.toLowerCase().includes(query) ||
			(item.description?.toLowerCase().includes(query) ?? false)
	);
}

export interface AgentMeta {
	name: string;
	description: string;
	content: string;
	path: string;
}

export function parseAgentFile(
	filename: string,
	content: string,
	basePath: string
): AgentMeta | null {
	const name = filename.replace(/\.md$/i, "");

	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!frontmatterMatch) {
		return {
			name,
			description: `Agent: ${name}`,
			content: content,
			path: `${basePath}/${filename}`,
		};
	}

	const [, frontmatter, body] = frontmatterMatch;

	let description = `Agent: ${name}`;
	const descMatch = frontmatter.match(/description:\s*(.+)/);
	if (descMatch) {
		description = descMatch[1].trim();
	}

	return {
		name,
		description,
		content: body.trim(),
		path: `${basePath}/${filename}`,
	};
}

export function agentToMentionItem(agent: AgentMeta): AtMentionItem {
	return {
		type: "agent",
		name: agent.name,
		description: agent.description,
		path: agent.path,
	};
}

export function fileToMentionItem(filename: string, path: string): AtMentionItem {
	return {
		type: "file",
		name: filename,
		path: path,
	};
}
