import type { ProcessedModel } from "./models";
import endpoints from "./endpoints/endpoints";

/**
 * Check if a model ID represents a local model (Ollama or LM Studio)
 */
export function isLocalModelId(modelId: string): boolean {
	return modelId.startsWith("ollama/") || modelId.startsWith("lmstudio/");
}

/**
 * Get the provider type from a local model ID
 */
export function getLocalProvider(modelId: string): "ollama" | "lmstudio" | null {
	if (modelId.startsWith("ollama/")) return "ollama";
	if (modelId.startsWith("lmstudio/")) return "lmstudio";
	return null;
}

/**
 * Extract the actual model name from a local model ID
 * e.g., "ollama/llama3:latest" -> "llama3:latest"
 * e.g., "lmstudio/qwen-14b" -> "qwen-14b"
 */
export function getLocalModelName(modelId: string): string {
	const provider = getLocalProvider(modelId);
	if (!provider) return modelId;
	return modelId.slice(provider.length + 1); // +1 for the "/"
}

/**
 * Get the base URL for a local provider
 * Uses environment variables if set, otherwise defaults
 */
function getLocalProviderBaseUrl(provider: "ollama" | "lmstudio"): string {
	if (provider === "ollama") {
		return process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
	}
	return process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1";
}

/**
 * Create a ProcessedModel configuration for a local model
 */
export async function createLocalModel(modelId: string): Promise<ProcessedModel | null> {
	const provider = getLocalProvider(modelId);
	if (!provider) return null;

	const modelName = getLocalModelName(modelId);
	const baseURL = getLocalProviderBaseUrl(provider);

	// Create a minimal model object for the endpoint
	// Use modelName (without prefix) as id so the API receives the correct model name
	const modelForEndpoint = {
		id: modelName, // e.g., "llama3:latest" not "ollama/llama3:latest"
		name: modelName,
		displayName: modelName,
		parameters: {},
	};

	const localModel: ProcessedModel = {
		id: modelId,
		name: modelName,
		displayName: modelName,
		description: `Local model from ${provider === "ollama" ? "Ollama" : "LM Studio"}`,
		preprompt: "",
		parameters: {},
		multimodal: false,
		unlisted: false,
		isRouter: false,
		hasInferenceAPI: false,
		systemRoleSupported: true,
		// Enable tool support - LM Studio and Ollama support OpenAI-compatible function calling
		supportsTools: true,
		chatPromptRender: ({ messages, preprompt }) => {
			const parts: string[] = [];
			if (preprompt) parts.push(`[SYSTEM]\n${preprompt}`);
			for (const msg of messages) {
				const role = msg.from === "assistant" ? "ASSISTANT" : msg.from.toUpperCase();
				parts.push(`[${role}]\n${msg.content}`);
			}
			parts.push(`[ASSISTANT]`);
			return parts.join("\n\n");
		},
		getEndpoint: async () => {
			console.log("[localModels] Creating endpoint for:", { modelId, modelName, baseURL });
			return await endpoints.openai({
				type: "openai",
				baseURL,
				apiKey: "not-needed", // Local providers don't need auth
				model: modelForEndpoint,
			});
		},
	} as ProcessedModel;

	return localModel;
}
