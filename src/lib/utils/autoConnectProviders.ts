import { get } from "svelte/store";
import { providerSettings } from "$lib/stores/providerSettings";
import { localModels } from "$lib/stores/localModels";

/**
 * Auto-connect to enabled local providers (Ollama, LM Studio) and fetch their models.
 * Should be called on app startup.
 */
export async function autoConnectProviders() {
	const settings = get(providerSettings);

	const promises: Promise<void>[] = [];

	if (settings.ollamaEnabled) {
		promises.push(connectOllama(settings.ollamaBaseUrl));
	}

	if (settings.lmStudioEnabled) {
		promises.push(connectLmStudio(settings.lmStudioBaseUrl));
	}

	await Promise.allSettled(promises);
}

async function connectOllama(baseUrl: string) {
	localModels.setLoading("ollama", true);
	try {
		const res = await fetch("/api/providers/models", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ provider: "ollama", baseUrl }),
		});
		const data = await res.json();
		if (data.models && data.models.length > 0) {
			providerSettings.update((s) => ({ ...s, ollamaVerified: true }));
			localModels.setOllamaModels(data.models);
		} else {
			providerSettings.update((s) => ({ ...s, ollamaVerified: false }));
			localModels.clearOllama();
		}
	} catch {
		providerSettings.update((s) => ({ ...s, ollamaVerified: false }));
		localModels.clearOllama();
	}
}

async function connectLmStudio(baseUrl: string) {
	localModels.setLoading("lmstudio", true);
	try {
		const res = await fetch("/api/providers/models", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ provider: "lmstudio", baseUrl }),
		});
		const data = await res.json();
		if (data.models && data.models.length > 0) {
			providerSettings.update((s) => ({ ...s, lmStudioVerified: true }));
			localModels.setLmStudioModels(data.models);
		} else {
			providerSettings.update((s) => ({ ...s, lmStudioVerified: false }));
			localModels.clearLmStudio();
		}
	} catch {
		providerSettings.update((s) => ({ ...s, lmStudioVerified: false }));
		localModels.clearLmStudio();
	}
}
