import type { RequestHandler } from "./$types";

interface OllamaModel {
	name: string;
	model: string;
	modified_at: string;
	size: number;
	digest: string;
	details?: {
		format: string;
		family: string;
		parameter_size: string;
		quantization_level: string;
	};
}

interface LmStudioModel {
	id: string;
	object: string;
	owned_by: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { provider, baseUrl, timeout = 5000 } = await request.json();

		if (!baseUrl || typeof baseUrl !== "string") {
			return new Response(JSON.stringify({ error: "Base URL is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Only allow local URLs for security (localhost and private network ranges)
		const urlObj = new URL(baseUrl);
		const hostname = urlObj.hostname;
		const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
		const isPrivateNetwork =
			hostname.startsWith("192.168.") ||
			hostname.startsWith("10.") ||
			/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

		if (!isLocalhost && !isPrivateNetwork) {
			return new Response(JSON.stringify({ error: "Only local network URLs are allowed" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			if (provider === "ollama") {
				// Ollama uses /api/tags endpoint
				const res = await fetch(`${baseUrl}/api/tags`, {
					method: "GET",
					signal: controller.signal,
				});
				clearTimeout(timeoutId);

				if (!res.ok) {
					return new Response(
						JSON.stringify({ error: `Ollama returned ${res.status}`, models: [] }),
						{ status: 200, headers: { "Content-Type": "application/json" } }
					);
				}

				const data = await res.json();
				const models = (data.models || []).map((m: OllamaModel) => ({
					id: `ollama/${m.name}`,
					name: m.name,
					displayName: m.name.split(":")[0],
					provider: "ollama",
					size: m.size,
					modifiedAt: m.modified_at,
				}));

				return new Response(JSON.stringify({ models }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			} else if (provider === "lmstudio") {
				// LM Studio uses OpenAI-compatible /v1/models endpoint
				const modelsUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
				const res = await fetch(modelsUrl, {
					method: "GET",
					signal: controller.signal,
				});
				clearTimeout(timeoutId);

				if (!res.ok) {
					return new Response(
						JSON.stringify({ error: `LM Studio returned ${res.status}`, models: [] }),
						{ status: 200, headers: { "Content-Type": "application/json" } }
					);
				}

				const data = await res.json();
				const models = (data.data || []).map((m: LmStudioModel) => ({
					id: `lmstudio/${m.id}`,
					name: m.id,
					displayName: m.id.split("/").pop() || m.id,
					provider: "lmstudio",
				}));

				return new Response(JSON.stringify({ models }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			} else {
				return new Response(JSON.stringify({ error: "Unknown provider" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		} catch (fetchError) {
			clearTimeout(timeoutId);
			return new Response(
				JSON.stringify({
					error: fetchError instanceof Error ? fetchError.message : "Connection failed",
					models: [],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		}
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Unknown error",
				models: [],
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};
