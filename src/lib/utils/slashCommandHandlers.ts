import type { SlashCommand } from "./slashCommands";

export interface CommandContext {
	workspaces: Array<{ name: string; path: string; isGitRepo: boolean }>;
	isElectron: boolean;
	addSystemMessage: (content: string) => void;
	sendUserMessage: (content: string) => void;
}

export interface CommandResult {
	handled: boolean;
	message?: string;
}

export async function executeCommand(
	command: SlashCommand,
	args: string,
	context: CommandContext
): Promise<CommandResult> {
	switch (command.name) {
		case "init":
			return handleInit(args, context);
		case "help":
			return handleHelp(context);
		case "clear":
			return handleClear(context);
		case "model":
			return handleModel(args, context);
		case "workspace":
			return handleWorkspace(args, context);
		case "debug":
			return handleDebug(args, context);
		default:
			if (command.source === "user" || command.source === "skill") {
				return handleCustomCommand(command, args, context);
			}
			return { handled: false };
	}
}

async function handleInit(args: string, context: CommandContext): Promise<CommandResult> {
	if (context.workspaces.length === 0) {
		return {
			handled: true,
			message: "No workspace attached. Add a workspace first using the + menu.",
		};
	}

	const workspace = context.workspaces[0];
	const prompt = `Analyze the project at "${workspace.path}" and generate an AGENTS.md file following the AGENTS.md specification (https://agents.md).

The AGENTS.md file should include:
1. Dev environment tips specific to this project (build commands, package manager, etc.)
2. Testing instructions (how to run tests, test patterns used)
3. PR instructions (commit message format, branch naming, etc.)
4. Any project-specific conventions or patterns found in the codebase

Examine:
- package.json, Cargo.toml, pyproject.toml, or similar for build/test commands
- .github/workflows for CI patterns
- Existing README.md for project conventions
- Code structure and patterns

Create a practical, actionable AGENTS.md that will help AI coding assistants work effectively on this project.

Write the file to: ${workspace.path}/AGENTS.md`;

	context.sendUserMessage(prompt);
	return { handled: true };
}

function handleHelp(context: CommandContext): CommandResult {
	const helpText = `## Available Commands

**Built-in:**
- \`/init\` - Generate AGENTS.md for the current workspace
- \`/help\` - Show this help message
- \`/clear\` - Clear the conversation
- \`/model\` - Switch models
- \`/workspace\` - Manage workspaces

**User Commands:** Loaded from ~/.claude/commands/
**Skills:** Loaded from ~/.claude/skills/

Type \`/\` to see all available commands.`;

	context.addSystemMessage(helpText);
	return { handled: true };
}

function handleClear(context: CommandContext): CommandResult {
	return { handled: true, message: "__CLEAR_CONVERSATION__" };
}

function handleModel(args: string, context: CommandContext): CommandResult {
	if (!args) {
		return { handled: true, message: "__SHOW_MODEL_SELECTOR__" };
	}
	return { handled: true, message: `__SWITCH_MODEL__:${args}` };
}

function handleWorkspace(args: string, context: CommandContext): CommandResult {
	if (!context.isElectron) {
		return { handled: true, message: "Workspaces are only available in the desktop app." };
	}
	return { handled: true, message: "__SHOW_WORKSPACE_MANAGER__" };
}

function handleDebug(args: string, context: CommandContext): CommandResult {
	return { handled: true, message: "__SHOW_TOOL_DEBUGGER__" };
}

async function handleCustomCommand(
	command: SlashCommand,
	args: string,
	context: CommandContext
): Promise<CommandResult> {
	if (!command.content) {
		return { handled: false, message: "Command has no content." };
	}

	let prompt = command.content;
	if (args) {
		prompt = prompt.replace(/\$ARGUMENTS/g, args);
	}

	context.sendUserMessage(prompt);
	return { handled: true };
}
