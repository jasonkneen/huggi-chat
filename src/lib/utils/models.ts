import type { Model } from "$lib/types/Model";
import type { LocalModel } from "$lib/stores/localModels";

/**
 * Check if a model ID represents a local model (Ollama or LM Studio)
 */
export function isLocalModelId(modelId: string): boolean {
	return modelId.startsWith("ollama/") || modelId.startsWith("lmstudio/");
}

/**
 * Convert a LocalModel from the store to a frontend Model type
 * Used when merging local models with server models
 */
export function localToModel(m: LocalModel): Model {
	return {
		id: m.id,
		name: m.name,
		displayName: m.displayName,
		description: `Local model from ${m.provider === "ollama" ? "Ollama" : "LM Studio"}`,
		websiteUrl: m.provider === "ollama" ? "https://ollama.com" : "https://lmstudio.ai",
		modelUrl: m.provider === "ollama" ? "https://ollama.com/library" : "https://lmstudio.ai",
		preprompt: "",
		parameters: {},
		unlisted: false,
		multimodal: false,
		supportsTools: true, // Local models support OpenAI-compatible function calling
		isRouter: false,
	} as Model;
}

/**
 * Create a placeholder Model for a local model ID
 * Used when the local model store hasn't been populated yet
 */
function createPlaceholderLocalModel(modelId: string): Model {
	const provider = modelId.startsWith("ollama/") ? "ollama" : "lmstudio";
	const modelName = modelId.slice(provider.length + 1);

	return {
		id: modelId,
		name: modelName,
		displayName: modelName,
		description: `Local model from ${provider === "ollama" ? "Ollama" : "LM Studio"}`,
		websiteUrl: provider === "ollama" ? "https://ollama.com" : "https://lmstudio.ai",
		modelUrl: provider === "ollama" ? "https://ollama.com/library" : "https://lmstudio.ai",
		preprompt: "",
		parameters: {},
		unlisted: false,
		multimodal: false,
		supportsTools: true, // Local models (Ollama/LM Studio) support OpenAI-compatible function calling
		isRouter: false,
	} as Model;
}

export const findCurrentModel = (
	models: Model[],
	_oldModels: { id: string; transferTo?: string }[] = [],
	id?: string
): Model => {
	if (id) {
		const direct = models.find((m) => m.id === id);
		if (direct) return direct;

		// If it's a local model ID but not in the list yet, create a placeholder
		// This handles the race condition where localModels store hasn't populated
		if (isLocalModelId(id)) {
			return createPlaceholderLocalModel(id);
		}
	}

	return models[0];
};
