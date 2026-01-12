export interface SlashCommand {
	name: string;
	description: string;
	icon?: string;
	source: "builtin" | "user" | "skill";
	requiresWorkspace?: boolean;
	requiresElectron?: boolean;
	filePath?: string;
	skillPath?: string;
	content?: string;
}

export const BUILTIN_COMMANDS: SlashCommand[] = [
	{
		name: "init",
		description: "Generate AGENTS.md for the current workspace",
		source: "builtin",
	},
	{
		name: "help",
		description: "Show available commands and how to use them",
		source: "builtin",
	},
	{
		name: "clear",
		description: "Clear the current conversation",
		source: "builtin",
	},
	{
		name: "model",
		description: "Switch to a different model",
		source: "builtin",
	},
	{
		name: "workspace",
		description: "Manage workspaces for this conversation",
		source: "builtin",
	},
	{
		name: "debug",
		description: "Tool debugger - test tools with mock data",
		source: "builtin",
	},
];

export function parseSlashCommand(input: string): { command: string; args: string } | null {
	const trimmed = input.trim();
	if (!trimmed.startsWith("/")) return null;

	const spaceIndex = trimmed.indexOf(" ");
	if (spaceIndex === -1) {
		return { command: trimmed.slice(1).toLowerCase(), args: "" };
	}

	return {
		command: trimmed.slice(1, spaceIndex).toLowerCase(),
		args: trimmed.slice(spaceIndex + 1).trim(),
	};
}

export function filterCommands(
	input: string,
	allCommands: SlashCommand[],
	options?: { isElectron?: boolean; hasWorkspace?: boolean }
): SlashCommand[] {
	const { isElectron = false, hasWorkspace = false } = options ?? {};

	let available = allCommands.filter((cmd) => {
		// Hide debug command from autocomplete menu
		if (cmd.name === "debug") return false;
		if (cmd.requiresElectron && !isElectron) return false;
		if (cmd.requiresWorkspace && !hasWorkspace) return false;
		return true;
	});

	if (!input || input === "/") return available;

	const search = input.startsWith("/") ? input.slice(1).toLowerCase() : input.toLowerCase();
	return available.filter((cmd) => cmd.name.toLowerCase().startsWith(search));
}

export function isValidCommand(name: string, allCommands: SlashCommand[]): boolean {
	return allCommands.some((cmd) => cmd.name.toLowerCase() === name.toLowerCase());
}

export function getCommand(name: string, allCommands: SlashCommand[]): SlashCommand | undefined {
	return allCommands.find((cmd) => cmd.name.toLowerCase() === name.toLowerCase());
}

export interface UserCommandMeta {
	name: string;
	description: string;
	allowedTools?: string[];
	content: string;
	filePath: string;
}

export function parseUserCommandFile(filename: string, content: string): UserCommandMeta | null {
	const name = filename.replace(/\.md$/i, "").toLowerCase();

	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!frontmatterMatch) {
		return {
			name,
			description: `User command: ${name}`,
			content: content,
			filePath: filename,
		};
	}

	const [, frontmatter, body] = frontmatterMatch;

	let description = `User command: ${name}`;
	let allowedTools: string[] | undefined;

	const descMatch = frontmatter.match(/description:\s*(.+)/);
	if (descMatch) {
		description = descMatch[1].trim();
	}

	const toolsMatch = frontmatter.match(/allowed_tools:\s*\[([^\]]*)\]/);
	if (toolsMatch) {
		allowedTools = toolsMatch[1]
			.split(",")
			.map((t) => t.trim().replace(/["']/g, ""))
			.filter(Boolean);
	}

	return {
		name,
		description,
		allowedTools,
		content: body.trim(),
		filePath: filename,
	};
}

export interface SkillMeta {
	name: string;
	description: string;
	license?: string;
	compatibility?: string;
	metadata?: Record<string, string>;
	allowedTools?: string[];
	content: string;
	skillPath: string;
}

export function parseSkillFile(skillPath: string, content: string): SkillMeta | null {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!frontmatterMatch) return null;

	const [, frontmatter, body] = frontmatterMatch;

	const nameMatch = frontmatter.match(/name:\s*(.+)/);
	const descMatch = frontmatter.match(/description:\s*(.+)/);

	if (!nameMatch || !descMatch) return null;

	const name = nameMatch[1].trim();
	const description = descMatch[1].trim();

	let license: string | undefined;
	let compatibility: string | undefined;
	let allowedTools: string[] | undefined;

	const licenseMatch = frontmatter.match(/license:\s*(.+)/);
	if (licenseMatch) license = licenseMatch[1].trim();

	const compatMatch = frontmatter.match(/compatibility:\s*(.+)/);
	if (compatMatch) compatibility = compatMatch[1].trim();

	const toolsMatch = frontmatter.match(/allowed-tools:\s*(.+)/);
	if (toolsMatch) {
		allowedTools = toolsMatch[1].trim().split(/\s+/).filter(Boolean);
	}

	return {
		name,
		description,
		license,
		compatibility,
		allowedTools,
		content: body.trim(),
		skillPath,
	};
}

export function userCommandToSlashCommand(meta: UserCommandMeta): SlashCommand {
	return {
		name: meta.name,
		description: meta.description,
		source: "user",
		filePath: meta.filePath,
		content: meta.content,
	};
}

export function skillToSlashCommand(meta: SkillMeta): SlashCommand {
	return {
		name: meta.name,
		description: meta.description,
		source: "skill",
		skillPath: meta.skillPath,
		content: meta.content,
	};
}
