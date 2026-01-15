import { promises as fs } from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { OpenAiTool } from "$lib/server/mcp/tools";

const execAsync = promisify(exec);

export type LocalWorkspace = { name: string; path: string; isGitRepo: boolean };

export type LocalToolCatalogEntry = {
	name: string;
	description?: string;
	server?: string;
	isStdio?: boolean;
	isLocal?: boolean;
};

export type LocalToolContext = {
	workspaces: LocalWorkspace[];
	defaultWorkspace?: LocalWorkspace;
	toolCatalog?: LocalToolCatalogEntry[];
};

export const LOCAL_TOOL_SERVER_NAME = "local";

const MAX_READ_BYTES = 200_000;
const MAX_WRITE_BYTES = 1_000_000;
const MAX_LIST_ENTRIES = 2000;
const DEFAULT_MAX_DEPTH = 4;
const MAX_COMMAND_TIMEOUT_MS = 30_000;
const MAX_SEARCH_RESULTS = 100;

type LocalToolMapping = { fnName: string; server: string; tool: string };

const buildTool = (tool: OpenAiTool["function"]): OpenAiTool => ({
	type: "function",
	function: tool,
});

export function buildLocalToolContext(
	workspaces: LocalWorkspace[] | undefined,
	toolCatalog?: LocalToolCatalogEntry[]
): LocalToolContext {
	return {
		workspaces: workspaces ?? [],
		defaultWorkspace: workspaces?.[0],
		toolCatalog,
	};
}

export function getLocalToolsForWorkspaces(
	workspaces: LocalWorkspace[] | undefined
): { tools: OpenAiTool[]; mapping: Record<string, LocalToolMapping> } {
	const tools: OpenAiTool[] = [
		buildTool({
			name: "local_list_tools",
			description: "List available tools and their servers.",
			parameters: {
				type: "object",
				properties: {
					server: { type: "string", description: "Optional server filter." },
				},
			},
		}),
	];

	if (!workspaces || workspaces.length === 0) {
		const mapping: Record<string, LocalToolMapping> = {
			local_list_tools: {
				fnName: "local_list_tools",
				server: LOCAL_TOOL_SERVER_NAME,
				tool: "local_list_tools",
			},
		};
		return { tools, mapping };
	}

	tools.push(
		buildTool({
			name: "list_files",
			description:
				"List files and folders in a workspace path. Use workspace + relative path or an absolute path inside a workspace.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Path to list." },
					workspace: { type: "string", description: "Optional workspace name." },
					recursive: { type: "boolean", default: false },
					max_depth: { type: "number", default: DEFAULT_MAX_DEPTH },
					max_entries: { type: "number", default: 500 },
					include_hidden: { type: "boolean", default: false },
					include_node_modules: { type: "boolean", default: false },
				},
				required: ["path"],
			},
		}),
		buildTool({
			name: "read_file",
			description: "Read a text file from a workspace path.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Path to read." },
					workspace: { type: "string", description: "Optional workspace name." },
					start: { type: "number", default: 0 },
					max_bytes: { type: "number", default: MAX_READ_BYTES },
				},
				required: ["path"],
			},
		}),
		buildTool({
			name: "write_file",
			description:
				"Write a text file to a workspace path. Overwrites by default unless append=true.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Path to write." },
					workspace: { type: "string", description: "Optional workspace name." },
					content: { type: "string", description: "File contents to write." },
					append: { type: "boolean", default: false },
				},
				required: ["path", "content"],
			},
		}),
		buildTool({
			name: "run_command",
			description:
				"Execute a shell command in a workspace directory. Use for running scripts, git commands, npm/yarn, builds, tests, etc. Commands run with a timeout.",
			parameters: {
				type: "object",
				properties: {
					command: { type: "string", description: "Shell command to execute." },
					workspace: { type: "string", description: "Optional workspace name to run in." },
					timeout_ms: {
						type: "number",
						description: `Timeout in milliseconds (default: ${MAX_COMMAND_TIMEOUT_MS}, max: 60000).`,
					},
				},
				required: ["command"],
			},
		}),
		buildTool({
			name: "search_code",
			description:
				"Search for code patterns using ast-grep (structural AST search) or ripgrep (text search). ast-grep understands code structure; ripgrep is fast text search.",
			parameters: {
				type: "object",
				properties: {
					pattern: {
						type: "string",
						description:
							"Pattern to search for. For ast-grep: use code pattern like '$VAR.map($FN)' or 'console.log($$$)'. For ripgrep: use regex.",
					},
					path: { type: "string", description: "Directory or file path to search in." },
					workspace: { type: "string", description: "Optional workspace name." },
					mode: {
						type: "string",
						enum: ["ast", "text"],
						description: "Search mode: 'ast' for ast-grep (structural), 'text' for ripgrep (regex). Default: ast.",
					},
					lang: {
						type: "string",
						description: "Language for ast-grep (e.g., 'typescript', 'javascript', 'python', 'rust'). Auto-detected if omitted.",
					},
					file_pattern: {
						type: "string",
						description: "Glob pattern for files to include (e.g., '*.ts', '*.js').",
					},
					max_results: { type: "number", default: 50 },
				},
				required: ["pattern"],
			},
		})
	);

	const mapping: Record<string, LocalToolMapping> = {};
	for (const tool of tools) {
		const name = tool.function.name;
		mapping[name] = { fnName: name, server: LOCAL_TOOL_SERVER_NAME, tool: name };
	}

	return { tools, mapping };
}

type ResolvedPath = {
	absPath: string;
	workspace: LocalWorkspace;
};

const isSubpath = (root: string, target: string): boolean => {
	const resolvedRoot = path.resolve(root);
	const resolvedTarget = path.resolve(target);
	if (resolvedRoot === resolvedTarget) return true;
	const rel = path.relative(resolvedRoot, resolvedTarget);
	return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

const pickWorkspaceByName = (
	ctx: LocalToolContext,
	workspaceName: string | undefined
): LocalWorkspace | undefined => {
	if (!workspaceName) return undefined;
	return ctx.workspaces.find((ws) => ws.name === workspaceName);
};

const findWorkspaceForPath = (
	ctx: LocalToolContext,
	absPath: string
): LocalWorkspace | undefined =>
	ctx.workspaces.find((ws) => isSubpath(ws.path, absPath));

const resolveWorkspacePath = (
	ctx: LocalToolContext,
	rawPath: string,
	workspaceName?: string
): ResolvedPath => {
	const trimmed = rawPath?.trim();
	const defaultWorkspace = ctx.defaultWorkspace;
	if (!defaultWorkspace) {
		throw new Error("No workspace is attached.");
	}
	const pathValue = trimmed && trimmed.length > 0 ? trimmed : defaultWorkspace.path;
	const explicitWorkspace = pickWorkspaceByName(ctx, workspaceName);

	if (path.isAbsolute(pathValue)) {
		const absPath = path.resolve(pathValue);
		const workspace = explicitWorkspace ?? findWorkspaceForPath(ctx, absPath) ?? defaultWorkspace;
		if (!isSubpath(workspace.path, absPath)) {
			throw new Error("Path is outside the allowed workspace roots.");
		}
		return { absPath, workspace };
	}

	const workspace = explicitWorkspace ?? defaultWorkspace;
	const absPath = path.resolve(workspace.path, pathValue);
	if (!isSubpath(workspace.path, absPath)) {
		throw new Error("Path is outside the allowed workspace roots.");
	}
	return { absPath, workspace };
};

const readFileSlice = async (absPath: string, start: number, maxBytes: number) => {
	const handle = await fs.open(absPath, "r");
	try {
		const { size } = await handle.stat();
		const safeStart = Math.max(0, Math.min(start, size));
		const bytesToRead = Math.max(0, Math.min(maxBytes, size - safeStart));
		const buffer = Buffer.alloc(bytesToRead);
		await handle.read(buffer, 0, bytesToRead, safeStart);
		return { buffer, bytesToRead, size, start: safeStart };
	} finally {
		await handle.close();
	}
};

const toNumber = (value: unknown, fallback: number): number => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	return fallback;
};

const toBoolean = (value: unknown, fallback = false): boolean =>
	typeof value === "boolean" ? value : fallback;

export async function executeLocalTool(
	tool: string,
	args: Record<string, unknown>,
	ctx: LocalToolContext
): Promise<{ text: string; structured?: unknown }> {
	if (tool === "local_list_tools") {
		const filter = typeof args.server === "string" ? args.server : undefined;
		const tools = Array.isArray(ctx.toolCatalog) ? ctx.toolCatalog : [];
		const filtered = filter ? tools.filter((entry) => entry.server === filter) : tools;
		const structured = { tools: filtered };
		return { text: JSON.stringify(structured, null, 2), structured };
	}

	const workspaceName = typeof args.workspace === "string" ? args.workspace : undefined;

	if (tool === "list_files") {
		const rawPath = typeof args.path === "string" ? args.path : "";
		const { absPath, workspace } = resolveWorkspacePath(ctx, rawPath, workspaceName);
		const recursive = toBoolean(args.recursive, false);
		const maxDepthRaw = toNumber(args.max_depth, DEFAULT_MAX_DEPTH);
		const maxDepth = Math.max(1, Math.min(20, maxDepthRaw));
		const maxEntriesRaw = toNumber(args.max_entries, 500);
		const maxEntries = Math.max(1, Math.min(MAX_LIST_ENTRIES, maxEntriesRaw));
		const includeHidden = toBoolean(args.include_hidden, false);
		const includeNodeModules = toBoolean(args.include_node_modules, false);

		type Entry = { path: string; absPath: string; type: "file" | "dir"; size?: number };
		const entries: Entry[] = [];
		let truncated = false;

		const shouldSkip = (name: string) => {
			if (!includeHidden && name.startsWith(".")) return true;
			if (!includeNodeModules && name === "node_modules") return true;
			return false;
		};

		const walk = async (dir: string, depth: number) => {
			if (entries.length >= maxEntries) {
				truncated = true;
				return;
			}
			const list = await fs.readdir(dir, { withFileTypes: true });
			for (const item of list) {
				if (shouldSkip(item.name)) continue;
				const itemPath = path.join(dir, item.name);
				const relPath = path.relative(workspace.path, itemPath);
				const entry: Entry = {
					path: relPath || ".",
					absPath: itemPath,
					type: item.isDirectory() ? "dir" : "file",
				};
				if (entry.type === "file") {
					try {
						const stat = await fs.stat(itemPath);
						entry.size = stat.size;
					} catch {
						// ignore size errors
					}
				}
				entries.push(entry);
				if (entries.length >= maxEntries) {
					truncated = true;
					return;
				}
				if (item.isDirectory() && recursive && depth < maxDepth) {
					await walk(itemPath, depth + 1);
					if (entries.length >= maxEntries) return;
				}
			}
		};

		const stat = await fs.stat(absPath);
		if (stat.isDirectory()) {
			await walk(absPath, 1);
		} else {
			entries.push({
				path: path.relative(workspace.path, absPath) || ".",
				absPath,
				type: "file",
				size: stat.size,
			});
		}

		const structured = {
			workspace: workspace.name,
			root: workspace.path,
			path: absPath,
			entries,
			truncated,
		};
		return { text: JSON.stringify(structured, null, 2), structured };
	}

	if (tool === "read_file") {
		const rawPath = typeof args.path === "string" ? args.path : "";
		const { absPath, workspace } = resolveWorkspacePath(ctx, rawPath, workspaceName);
		const start = Math.max(0, toNumber(args.start, 0));
		const maxBytes = Math.max(1, Math.min(MAX_READ_BYTES, toNumber(args.max_bytes, MAX_READ_BYTES)));
		const { buffer, bytesToRead, size, start: safeStart } = await readFileSlice(
			absPath,
			start,
			maxBytes
		);
		const content = buffer.toString("utf8");
		if (content.includes("\0")) {
			throw new Error("Binary files are not supported.");
		}
		const structured = {
			workspace: workspace.name,
			path: absPath,
			start: safeStart,
			bytes: bytesToRead,
			totalBytes: size,
			content,
		};
		return { text: JSON.stringify(structured, null, 2), structured };
	}

	if (tool === "write_file") {
		const rawPath = typeof args.path === "string" ? args.path : "";
		const content = typeof args.content === "string" ? args.content : "";
		const append = toBoolean(args.append, false);
		if (!content) {
			throw new Error("Content is required for write_file.");
		}
		const bytes = Buffer.byteLength(content, "utf8");
		if (bytes > MAX_WRITE_BYTES) {
			throw new Error("Content exceeds maximum size for write_file.");
		}
		const { absPath, workspace } = resolveWorkspacePath(ctx, rawPath, workspaceName);
		await fs.mkdir(path.dirname(absPath), { recursive: true });
		if (append) {
			await fs.appendFile(absPath, content, "utf8");
		} else {
			await fs.writeFile(absPath, content, "utf8");
		}
		const structured = {
			workspace: workspace.name,
			path: absPath,
			bytesWritten: bytes,
			appended: append,
		};
		return { text: JSON.stringify(structured, null, 2), structured };
	}

	if (tool === "run_command") {
		const command = typeof args.command === "string" ? args.command : "";
		if (!command) {
			throw new Error("Command is required for run_command.");
		}

		// Security: block dangerous commands
		const dangerousPatterns = [
			/\brm\s+-rf\s+[\/~]/i,
			/\bsudo\b/i,
			/\bmkfs\b/i,
			/\bdd\s+if=/i,
			/>\s*\/dev\//i,
			/\bchmod\s+777/i,
		];
		for (const pattern of dangerousPatterns) {
			if (pattern.test(command)) {
				throw new Error("Command contains potentially dangerous operations.");
			}
		}

		const rawTimeout = toNumber(args.timeout_ms, MAX_COMMAND_TIMEOUT_MS);
		const timeout = Math.max(1000, Math.min(60_000, rawTimeout));

		const defaultWorkspace = ctx.defaultWorkspace;
		if (!defaultWorkspace) {
			throw new Error("No workspace is attached for command execution.");
		}

		const explicitWorkspace = pickWorkspaceByName(ctx, workspaceName);
		const workspace = explicitWorkspace ?? defaultWorkspace;

		try {
			const { stdout, stderr } = await execAsync(command, {
				cwd: workspace.path,
				timeout,
				maxBuffer: 1024 * 1024, // 1MB output limit
				env: { ...process.env, HOME: process.env.HOME || "/tmp" },
			});

			const structured = {
				workspace: workspace.name,
				cwd: workspace.path,
				command,
				exitCode: 0,
				stdout: stdout.slice(0, 50000),
				stderr: stderr.slice(0, 10000),
			};
			return { text: JSON.stringify(structured, null, 2), structured };
		} catch (err: unknown) {
			const execErr = err as { code?: number; stdout?: string; stderr?: string; message?: string };
			const structured = {
				workspace: workspace.name,
				cwd: workspace.path,
				command,
				exitCode: execErr.code ?? 1,
				stdout: (execErr.stdout ?? "").slice(0, 50000),
				stderr: (execErr.stderr ?? execErr.message ?? "").slice(0, 10000),
				error: true,
			};
			return { text: JSON.stringify(structured, null, 2), structured };
		}
	}

	if (tool === "search_code") {
		const pattern = typeof args.pattern === "string" ? args.pattern : "";
		if (!pattern) {
			throw new Error("Pattern is required for search_code.");
		}

		const rawPath = typeof args.path === "string" ? args.path : ".";
		const { absPath, workspace } = resolveWorkspacePath(ctx, rawPath, workspaceName);
		const filePattern = typeof args.file_pattern === "string" ? args.file_pattern : "";
		const maxResults = Math.min(MAX_SEARCH_RESULTS, toNumber(args.max_results, 50));
		const mode = typeof args.mode === "string" ? args.mode : "ast";
		const lang = typeof args.lang === "string" ? args.lang : "";

		if (mode === "ast") {
			// Use ast-grep for structural code search
			const langArg = lang ? `-l ${lang}` : "";
			const sgCmd = `sg ${langArg} -p "${pattern.replace(/"/g, '\\"')}" "${absPath}" --json 2>/dev/null | head -c 500000`;

			try {
				const { stdout } = await execAsync(sgCmd, {
					cwd: workspace.path,
					timeout: 30000,
					maxBuffer: 2 * 1024 * 1024,
				});

				// Parse ast-grep JSON output
				let matches: Array<{ file: string; line: number; content: string; matchedCode?: string }> = [];
				try {
					const results = JSON.parse(stdout || "[]");
					matches = (Array.isArray(results) ? results : []).slice(0, maxResults).map((r: { file?: string; range?: { start?: { line?: number } }; lines?: string; text?: string }) => ({
						file: path.relative(workspace.path, r.file || ""),
						line: r.range?.start?.line ?? 0,
						content: (r.lines || "").slice(0, 500),
						matchedCode: (r.text || "").slice(0, 200),
					}));
				} catch {
					// If JSON parsing fails, try line-by-line output
					const lines = stdout.trim().split("\n").filter(Boolean);
					matches = lines.slice(0, maxResults).map((line) => {
						const match = line.match(/^([^:]+):(\d+):(.*)$/);
						if (match) {
							return {
								file: path.relative(workspace.path, match[1]),
								line: parseInt(match[2], 10),
								content: match[3].slice(0, 500),
							};
						}
						return { file: "", line: 0, content: line.slice(0, 500) };
					});
				}

				const structured = {
					workspace: workspace.name,
					searchPath: absPath,
					pattern,
					mode: "ast-grep",
					lang: lang || "auto",
					matchCount: matches.length,
					truncated: matches.length >= maxResults,
					matches,
				};
				return { text: JSON.stringify(structured, null, 2), structured };
			} catch (err: unknown) {
				const execErr = err as { code?: number; stderr?: string };
				// ast-grep might not be installed - fall back to ripgrep
				if (execErr.code === 127 || (execErr.stderr && execErr.stderr.includes("not found"))) {
					// Fall through to ripgrep
				} else if (execErr.code === 1) {
					// No matches
					const structured = {
						workspace: workspace.name,
						searchPath: absPath,
						pattern,
						mode: "ast-grep",
						matchCount: 0,
						truncated: false,
						matches: [],
					};
					return { text: JSON.stringify(structured, null, 2), structured };
				} else {
					throw err;
				}
			}
		}

		// Use ripgrep for text search (mode === "text" or ast-grep fallback)
		const rgGlob = filePattern ? `--glob "${filePattern}"` : "";
		const rgCmd = `rg -n --json "${pattern.replace(/"/g, '\\"')}" ${rgGlob} "${absPath}" 2>/dev/null | head -${maxResults * 3}`;

		try {
			const { stdout } = await execAsync(rgCmd, {
				cwd: workspace.path,
				timeout: 30000,
				maxBuffer: 2 * 1024 * 1024,
			});

			// Parse ripgrep JSON output
			const lines = stdout.trim().split("\n").filter(Boolean);
			const matches: Array<{ file: string; line: number; content: string }> = [];
			for (const line of lines) {
				if (matches.length >= maxResults) break;
				try {
					const obj = JSON.parse(line);
					if (obj.type === "match") {
						matches.push({
							file: path.relative(workspace.path, obj.data?.path?.text || ""),
							line: obj.data?.line_number ?? 0,
							content: (obj.data?.lines?.text || "").trim().slice(0, 500),
						});
					}
				} catch {
					// Skip malformed lines
				}
			}

			const structured = {
				workspace: workspace.name,
				searchPath: absPath,
				pattern,
				mode: "ripgrep",
				filePattern: filePattern || "*",
				matchCount: matches.length,
				truncated: matches.length >= maxResults,
				matches,
			};
			return { text: JSON.stringify(structured, null, 2), structured };
		} catch (err: unknown) {
			const execErr = err as { code?: number; stderr?: string };
			// ripgrep not installed - fall back to grep
			if (execErr.code === 127 || (execErr.stderr && execErr.stderr.includes("not found"))) {
				const grepGlob = filePattern ? `--include="${filePattern}"` : "";
				const grepCmd = `grep -rn ${grepGlob} -E "${pattern.replace(/"/g, '\\"')}" "${absPath}" 2>/dev/null | head -${maxResults}`;
				const { stdout } = await execAsync(grepCmd, {
					cwd: workspace.path,
					timeout: 30000,
					maxBuffer: 1024 * 1024,
				});

				const grepLines = stdout.trim().split("\n").filter(Boolean);
				const matches = grepLines.map((grepLine) => {
					const match = grepLine.match(/^([^:]+):(\d+):(.*)$/);
					if (match) {
						return {
							file: path.relative(workspace.path, match[1]),
							line: parseInt(match[2], 10),
							content: match[3].slice(0, 500),
						};
					}
					return { file: "", line: 0, content: grepLine.slice(0, 500) };
				});

				const structured = {
					workspace: workspace.name,
					searchPath: absPath,
					pattern,
					mode: "grep",
					filePattern: filePattern || "*",
					matchCount: matches.length,
					truncated: matches.length >= maxResults,
					matches,
				};
				return { text: JSON.stringify(structured, null, 2), structured };
			} else if (execErr.code === 1) {
				// No matches
				const structured = {
					workspace: workspace.name,
					searchPath: absPath,
					pattern,
					mode: "ripgrep",
					matchCount: 0,
					truncated: false,
					matches: [],
				};
				return { text: JSON.stringify(structured, null, 2), structured };
			}
			throw err;
		}
	}

	throw new Error(`Unknown local tool: ${tool}`);
}
