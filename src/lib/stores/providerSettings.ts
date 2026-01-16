import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { loadFromStorage, saveToStorage } from "$lib/utils/localStorage";

const STORAGE_KEY = "huggi:provider-settings";

export interface ProviderSettings {
	// HuggingFace
	hfToken: string;
	hfLoggedIn: boolean;

	// OpenAI
	openaiApiKey: string;

	// Gemini
	geminiApiKey: string;

	// Claude Code
	claudeCodePath: string;
	claudeCodeVerified: boolean;

	// Codex (OpenAI)
	codexPath: string;
	codexVerified: boolean;

	// Ollama
	ollamaEnabled: boolean;
	ollamaBaseUrl: string;
	ollamaVerified: boolean;

	// LM Studio
	lmStudioEnabled: boolean;
	lmStudioBaseUrl: string;
	lmStudioVerified: boolean;
}

const defaultSettings: ProviderSettings = {
	hfToken: "",
	hfLoggedIn: false,

	openaiApiKey: "",
	geminiApiKey: "",

	claudeCodePath: "/usr/local/bin/claude",
	claudeCodeVerified: false,

	codexPath: "/usr/local/bin/codex",
	codexVerified: false,

	ollamaEnabled: false,
	ollamaBaseUrl: "http://localhost:11434",
	ollamaVerified: false,

	lmStudioEnabled: false,
	lmStudioBaseUrl: "http://localhost:1234/v1",
	lmStudioVerified: false,
};

function createProviderSettingsStore() {
	const initial = browser ? loadFromStorage(STORAGE_KEY, defaultSettings) : defaultSettings;
	const { subscribe, set, update } = writable<ProviderSettings>(initial);

	return {
		subscribe,
		set: (value: ProviderSettings) => {
			set(value);
			saveToStorage(STORAGE_KEY, value);
		},
		update: (fn: (settings: ProviderSettings) => ProviderSettings) => {
			update((current) => {
				const updated = fn(current);
				saveToStorage(STORAGE_KEY, updated);
				return updated;
			});
		},
		reset: () => {
			set(defaultSettings);
			saveToStorage(STORAGE_KEY, defaultSettings);
		},
	};
}

export const providerSettings = createProviderSettingsStore();
