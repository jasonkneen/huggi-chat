import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { promises as fs } from "fs";
import { join } from "path";

// Store API keys in a local file (for desktop/local usage)
const KEYS_FILE = join(process.cwd(), ".api-keys.json");

interface ApiKeys {
	openaiApiKey?: string;
	geminiApiKey?: string;
}

async function loadKeys(): Promise<ApiKeys> {
	try {
		const data = await fs.readFile(KEYS_FILE, "utf-8");
		return JSON.parse(data);
	} catch {
		return {};
	}
}

async function saveKeys(keys: ApiKeys): Promise<void> {
	await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// GET - Load saved API keys (masked for security)
export const GET: RequestHandler = async () => {
	const keys = await loadKeys();
	return json({
		openaiApiKey: keys.openaiApiKey ? "sk-..." + keys.openaiApiKey.slice(-4) : "",
		geminiApiKey: keys.geminiApiKey ? "AIza..." + keys.geminiApiKey.slice(-4) : "",
		hasOpenai: !!keys.openaiApiKey,
		hasGemini: !!keys.geminiApiKey,
	});
};

// POST - Save API keys
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const currentKeys = await loadKeys();

	// Only update if a new value is provided (not empty)
	if (body.openaiApiKey && body.openaiApiKey.startsWith("sk-")) {
		currentKeys.openaiApiKey = body.openaiApiKey;
	}
	if (body.geminiApiKey && body.geminiApiKey.startsWith("AIza")) {
		currentKeys.geminiApiKey = body.geminiApiKey;
	}

	await saveKeys(currentKeys);

	// Update environment variables for the current process
	if (currentKeys.openaiApiKey) {
		process.env.OPENAI_API_KEY = currentKeys.openaiApiKey;
	}
	if (currentKeys.geminiApiKey) {
		process.env.GEMINI_API_KEY = currentKeys.geminiApiKey;
	}

	return json({ success: true });
};

// DELETE - Remove an API key
export const DELETE: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const currentKeys = await loadKeys();

	if (body.key === "openai") {
		delete currentKeys.openaiApiKey;
		delete process.env.OPENAI_API_KEY;
	}
	if (body.key === "gemini") {
		delete currentKeys.geminiApiKey;
		delete process.env.GEMINI_API_KEY;
	}

	await saveKeys(currentKeys);
	return json({ success: true });
};
