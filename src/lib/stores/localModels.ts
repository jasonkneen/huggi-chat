import { writable } from "svelte/store";

export interface LocalModel {
	id: string;
	name: string;
	displayName: string;
	provider: "ollama" | "lmstudio";
	size?: number;
	modifiedAt?: string;
}

interface LocalModelsState {
	ollama: LocalModel[];
	lmstudio: LocalModel[];
	loading: {
		ollama: boolean;
		lmstudio: boolean;
	};
}

const initialState: LocalModelsState = {
	ollama: [],
	lmstudio: [],
	loading: {
		ollama: false,
		lmstudio: false,
	},
};

function createLocalModelsStore() {
	const { subscribe, set, update } = writable<LocalModelsState>(initialState);

	return {
		subscribe,
		setOllamaModels: (models: LocalModel[]) => {
			update((state) => ({
				...state,
				ollama: models,
				loading: { ...state.loading, ollama: false },
			}));
		},
		setLmStudioModels: (models: LocalModel[]) => {
			update((state) => ({
				...state,
				lmstudio: models,
				loading: { ...state.loading, lmstudio: false },
			}));
		},
		setLoading: (provider: "ollama" | "lmstudio", loading: boolean) => {
			update((state) => ({
				...state,
				loading: { ...state.loading, [provider]: loading },
			}));
		},
		clearOllama: () => {
			update((state) => ({ ...state, ollama: [] }));
		},
		clearLmStudio: () => {
			update((state) => ({ ...state, lmstudio: [] }));
		},
		reset: () => set(initialState),
	};
}

export const localModels = createLocalModelsStore();
