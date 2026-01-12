export enum ToolResultStatus {
	Success = "success",
	Error = "error",
}

export interface ToolCall {
	name: string;
	parameters: Record<string, string | number | boolean>;
	toolId?: string;
}

export interface ToolResultSuccess {
	status: ToolResultStatus.Success;
	call: ToolCall;
	outputs: Record<string, unknown>[];
	display?: boolean;
}

export interface ToolResultError {
	status: ToolResultStatus.Error;
	call: ToolCall;
	message: string;
	display?: boolean;
}

export type ToolResult = ToolResultSuccess | ToolResultError;

export interface ToolFront {
	_id: string;
	name: string;
	displayName?: string;
	description?: string;
	color?: string;
	icon?: string;
	type?: "config" | "community";
	isOnByDefault?: boolean;
	isLocked?: boolean;
	mimeTypes?: string[];
	timeToUseMS?: number;
}

// MCP Server types
export interface KeyValuePair {
	key: string;
	value: string;
}

export type ServerStatus = "connected" | "connecting" | "disconnected" | "error";

export type MCPTransport = "http" | "stdio";

export interface MCPTool {
	name: string;
	description?: string;
	inputSchema?: unknown;
}

export interface MCPServer {
	id: string;
	name: string;
	type: "base" | "custom";
	transport: MCPTransport;
	// HTTP transport
	url?: string;
	headers?: KeyValuePair[];
	// Stdio transport (Electron only)
	command?: string;
	args?: string[];
	env?: KeyValuePair[];
	// Common
	status?: ServerStatus;
	isLocked?: boolean;
	tools?: MCPTool[];
	errorMessage?: string;
	authRequired?: boolean;
}

export interface MCPServerApi {
	transport: MCPTransport;
	url?: string;
	headers?: KeyValuePair[];
	command?: string;
	args?: string[];
	env?: KeyValuePair[];
}
