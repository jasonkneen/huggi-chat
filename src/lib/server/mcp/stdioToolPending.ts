import { randomUUID } from "crypto";

export interface PendingStdioToolRequest {
	requestId: string;
	serverId: string;
	tool: string;
	args: Record<string, unknown>;
	resolve: (result: StdioToolResult) => void;
	reject: (error: Error) => void;
	timeoutId: NodeJS.Timeout;
	createdAt: number;
}

export interface StdioToolResult {
	success: boolean;
	output?: string;
	error?: string;
}

const pendingRequests = new Map<string, PendingStdioToolRequest>();

const DEFAULT_TIMEOUT_MS = 60_000;

export function createStdioToolRequest(
	serverId: string,
	tool: string,
	args: Record<string, unknown>,
	timeoutMs: number = DEFAULT_TIMEOUT_MS
): { requestId: string; promise: Promise<StdioToolResult> } {
	const requestId = randomUUID();

	const promise = new Promise<StdioToolResult>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			pendingRequests.delete(requestId);
			reject(new Error(`Stdio tool request timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		pendingRequests.set(requestId, {
			requestId,
			serverId,
			tool,
			args,
			resolve,
			reject,
			timeoutId,
			createdAt: Date.now(),
		});
	});

	return { requestId, promise };
}

export function resolveStdioToolRequest(requestId: string, result: StdioToolResult): boolean {
	const pending = pendingRequests.get(requestId);
	if (!pending) {
		return false;
	}

	clearTimeout(pending.timeoutId);
	pendingRequests.delete(requestId);
	pending.resolve(result);
	return true;
}

export function getPendingRequest(requestId: string): PendingStdioToolRequest | undefined {
	return pendingRequests.get(requestId);
}

export function cancelPendingRequest(requestId: string, reason: string = "Cancelled"): boolean {
	const pending = pendingRequests.get(requestId);
	if (!pending) {
		return false;
	}

	clearTimeout(pending.timeoutId);
	pendingRequests.delete(requestId);
	pending.reject(new Error(reason));
	return true;
}
