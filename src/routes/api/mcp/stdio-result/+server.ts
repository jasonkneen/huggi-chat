import { json, error } from "@sveltejs/kit";
import { z } from "zod";
import { resolveStdioToolRequest } from "$lib/server/mcp/stdioToolPending";
import { logger } from "$lib/server/logger";

const resultSchema = z.object({
	requestId: z.string().uuid(),
	success: z.boolean(),
	output: z.optional(z.string()),
	error: z.optional(z.string()),
});

export async function POST({ request }: { request: Request }) {
	const body = await request.json();
	const parsed = resultSchema.safeParse(body);

	if (!parsed.success) {
		logger.warn({ errors: parsed.error.errors }, "[stdio-result] Invalid request body");
		error(400, "Invalid request body");
	}

	const { requestId, success, output, error: errorMessage } = parsed.data;

	const resolved = resolveStdioToolRequest(requestId, {
		success,
		output,
		error: errorMessage,
	});

	if (!resolved) {
		logger.warn({ requestId }, "[stdio-result] Request not found or already resolved");
		error(404, "Request not found or already resolved");
	}

	logger.debug({ requestId, success }, "[stdio-result] Tool result received");

	return json({ ok: true });
}
