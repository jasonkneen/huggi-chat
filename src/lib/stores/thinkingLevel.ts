import { writable } from "svelte/store";
import { browser } from "$app/environment";

const STORAGE_KEY = "chat-ui-thinking-level";
const DEFAULT_LEVEL = 2;

function createThinkingLevelStore() {
	const initial = browser
		? parseInt(localStorage.getItem(STORAGE_KEY) || String(DEFAULT_LEVEL), 10)
		: DEFAULT_LEVEL;

	const { subscribe, set, update } = writable(initial);

	return {
		subscribe,
		set: (value: number) => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, String(value));
			}
			set(value);
		},
		cycle: (max: number = 4) => {
			update((current) => {
				const newValue = (current + 1) % (max + 1);
				if (browser) {
					localStorage.setItem(STORAGE_KEY, String(newValue));
				}
				return newValue;
			});
		},
	};
}

export const thinkingLevel = createThinkingLevelStore();

export const thinkingTokensMap: Record<number, number | undefined> = {
	0: undefined,
	1: 1024,
	2: 4096,
	3: 16384,
	4: 65536,
};

export function getThinkingTokens(level: number): number | undefined {
	return thinkingTokensMap[level];
}
