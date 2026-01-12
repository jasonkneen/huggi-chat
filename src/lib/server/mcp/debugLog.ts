import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { logger } from "$lib/server/logger";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_PATH = path.join(LOG_DIR, "mcp-debug.log");

let lastErrorAt = 0;

export async function logMcpDebug(entry: Record<string, unknown>): Promise<void> {
	try {
		await mkdir(LOG_DIR, { recursive: true });
		const payload = {
			ts: new Date().toISOString(),
			...entry,
		};
		await appendFile(LOG_PATH, JSON.stringify(payload) + "\n", "utf8");
	} catch (err) {
		const now = Date.now();
		if (now - lastErrorAt > 60_000) {
			lastErrorAt = now;
			logger.warn({ err: String(err) }, "[mcp] failed to write debug log");
		}
	}
}
